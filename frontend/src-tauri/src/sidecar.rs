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
    #[serde(rename = "type")]
    msg_type: String,
    protocol_version: u16,
    instance_nonce: String,
    port: u16,
    pid: u32,
    lifecycle_state: String,
    ready: bool,
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
        ]);

    let (mut rx, child) = match sidecar_command.spawn() {
        Ok(res) => res,
        Err(e) => {
            eprintln!("Failed to spawn backend sidecar: {e}");
            let _ = app.emit("runtime_status_changed", "unavailable");
            return;
        }
    };

    let expected_pid = child.pid();

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
                    // Check if it's the readiness JSON
                    if !ready && text.contains("\"service_ready\"") {
                        if let Ok(msg) = serde_json::from_str::<ServiceReady>(&text) {
                            if msg.protocol_version == 1
                                && msg.instance_nonce == instance_nonce
                                && msg.pid == expected_pid
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
                                                && health.pid == expected_pid
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
                                    println!("Backend is ready on port {}", msg.port);
                                }
                            }
                        }
                    } else {
                        println!("backend: {text}");
                    }
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("backend err: {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(payload) => {
                    println!("backend terminated: {payload:?}");
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
