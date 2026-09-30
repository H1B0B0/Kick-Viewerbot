use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct RuntimeEndpoint {
    pub base_url: String,
    pub port: u16,
    pub instance_nonce: String,
    pub protocol_version: u16,
}

#[derive(Serialize, Deserialize, Debug)]
struct ServiceReady {
    #[serde(rename = "type", default)]
    msg_type: String,
    protocol_version: u16,
    instance_nonce: String,
    port: u16,
    pid: u32,
    lifecycle_state: String,
    ready: bool,
}

fn parse_service_ready(text: &str) -> Option<ServiceReady> {
    text.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .filter_map(|line| serde_json::from_str::<ServiceReady>(line).ok())
        .find(|message| message.msg_type == "service_ready")
}

pub struct SidecarState {
    pub endpoint: Arc<Mutex<Option<RuntimeEndpoint>>>,
}

#[tauri::command]
pub async fn get_runtime_endpoint(
    state: tauri::State<'_, SidecarState>,
) -> Result<RuntimeEndpoint, String> {
    let ep = state.endpoint.lock().await;
    ep.clone()
        .ok_or_else(|| "Runtime endpoint not ready yet".to_string())
}

pub fn spawn_sidecar(app: &AppHandle) {
    let mut rng = rand::rng();
    let mut nonce_bytes = [0u8; 32];
    rng.fill_bytes(&mut nonce_bytes);
    let instance_nonce = hex::encode(nonce_bytes);

    let working_dir = match app.path().app_local_data_dir() {
        Ok(path) => path,
        Err(error) => {
            log::error!("Failed to resolve sidecar working directory: {error}");
            let _ = app.emit("runtime_status_changed", "unavailable");
            return;
        }
    };

    if let Err(error) = std::fs::create_dir_all(&working_dir) {
        log::error!("Failed to create sidecar working directory: {error}");
        let _ = app.emit("runtime_status_changed", "unavailable");
        return;
    }

    let sidecar_command = app
        .shell()
        .sidecar("backend")
        .expect("Failed to initialize backend sidecar")
        .args([
            "--host",
            "127.0.0.1",
            "--port",
            "0",
            "--instance-nonce",
            &instance_nonce,
            "--protocol-version",
            "1",
            "--app-version",
            env!("CARGO_PKG_VERSION"),
            "--creator-growth-beta",
            "--no-browser",
        ])
        .current_dir(&working_dir);

    let (mut rx, child) = match sidecar_command.spawn() {
        Ok(res) => res,
        Err(e) => {
            log::error!("Failed to spawn backend sidecar: {e}");
            let _ = app.emit("runtime_status_changed", "unavailable");
            return;
        }
    };

    let launcher_pid = child.pid();

    let app_clone = app.clone();
    let state = app.state::<SidecarState>();
    let endpoint_ref = state.endpoint.clone();

    tauri::async_runtime::spawn(async move {
        // Simple readiness loop reading stdout
        let mut ready = false;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    // PyInstaller can flush log lines and the readiness JSON in
                    // one stdout chunk. Parse each line instead of treating the
                    // entire chunk as a single JSON document.
                    if !ready {
                        if let Some(msg) = parse_service_ready(&text) {
                            if msg.protocol_version == 1
                                && msg.instance_nonce == instance_nonce
                                && msg.pid > 0
                                && msg.ready
                            {
                                // Poll health
                                let health_url = format!("http://127.0.0.1:{}/health", msg.port);
                                let client = reqwest::Client::new();
                                let mut health_ok = false;

                                for _ in 0..5 {
                                    if let Ok(res) = client.get(&health_url).send().await {
                                        if let Ok(health) = res.json::<ServiceReady>().await {
                                            if health.protocol_version == 1
                                                && health.instance_nonce == instance_nonce
                                                && health.pid == msg.pid
                                                && health.ready
                                            {
                                                health_ok = true;
                                                break;
                                            }
                                        }
                                    }
                                    tokio::time::sleep(Duration::from_secs(1)).await;
                                }

                                if health_ok {
                                    ready = true;
                                    let mut ep = endpoint_ref.lock().await;
                                    *ep = Some(RuntimeEndpoint {
                                        base_url: format!("http://127.0.0.1:{}", msg.port),
                                        port: msg.port,
                                        instance_nonce: instance_nonce.clone(),
                                        protocol_version: 1,
                                    });
                                    let _ = app_clone.emit("runtime_status_changed", "ready");
                                    log::info!(
                                        "Backend is ready on port {} (server pid {}, launcher pid {})",
                                        msg.port, msg.pid, launcher_pid
                                    );
                                }
                            }
                        }
                    }

                    for log_line in text
                        .lines()
                        .map(str::trim)
                        .filter(|line| !line.is_empty() && !line.contains("\"service_ready\""))
                    {
                        log::debug!("backend: {log_line}");
                    }
                }
                CommandEvent::Stderr(line) => {
                    log::warn!("backend err: {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(payload) => {
                    log::warn!("backend terminated: {payload:?}");
                    let mut ep = endpoint_ref.lock().await;
                    *ep = None;
                    let _ = app_clone.emit("runtime_status_changed", "exited");
                    break;
                }
                _ => {}
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::parse_service_ready;

    #[test]
    fn parses_readiness_json_from_a_mixed_stdout_chunk() {
        let chunk = concat!(
            "2026-09-21 [warning] optional dependency unavailable\n",
            "{\"type\":\"service_ready\",\"protocol_version\":1,",
            "\"instance_nonce\":\"nonce\",\"port\":55816,\"pid\":42,",
            "\"lifecycle_state\":\"stopped\",\"ready\":true}\n",
        );

        let message = parse_service_ready(chunk).expect("service_ready message");

        assert_eq!(message.port, 55816);
        assert_eq!(message.pid, 42);
        assert_eq!(message.instance_nonce, "nonce");
    }

    #[test]
    fn ignores_regular_backend_logs() {
        assert!(parse_service_ready("warning only\nserver starting\n").is_none());
    }

    #[test]
    fn health_payload_does_not_require_the_stdout_message_type() {
        let payload = concat!(
            "{\"protocol_version\":1,\"instance_nonce\":\"nonce\",",
            "\"port\":55816,\"pid\":42,\"lifecycle_state\":\"stopped\",",
            "\"ready\":true}",
        );

        let health: super::ServiceReady = serde_json::from_str(payload).expect("health response");

        assert!(health.msg_type.is_empty());
        assert!(health.ready);
    }
}
