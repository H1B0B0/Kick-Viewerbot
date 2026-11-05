use crate::sidecar::SidecarState;
use std::io::Write;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn select_recording_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog().file().blocking_pick_folder().map(|folder| {
            folder.into_path().map(|path| path.to_string_lossy().into_owned()).map_err(|_| "Folder unavailable".to_string())
        }).transpose()
    }).await.map_err(|_| "Folder selection unavailable".to_string())?
}

// Export only assets of our supervised local service; never accept an arbitrary URL/path.
#[tauri::command]
pub async fn export_creator_asset(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarState>,
    clip_id: Option<String>,
) -> Result<String, String> {
    let endpoint = state
        .endpoint
        .lock()
        .await
        .clone()
        .ok_or("Local service is not ready")?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|_| "Export client unavailable")?;
    let (url, filename) = if let Some(id) = clip_id {
        if id.len() != 32 || !id.bytes().all(|value| value.is_ascii_hexdigit()) {
            return Err("Invalid clip identifier".into());
        }
        let workspace: serde_json::Value = client
            .get(format!("{}/creator/workspace", endpoint.base_url))
            .header("X-VelBots-Nonce", &endpoint.instance_nonce)
            .send()
            .await
            .map_err(|_| "Local service unavailable")?
            .error_for_status()
            .map_err(|_| "Export authorization failed")?
            .json()
            .await
            .map_err(|_| "Invalid clip metadata")?;
        let path = workspace["clips"]
            .as_array()
            .and_then(|clips| clips.iter().find(|clip| clip["id"].as_str() == Some(&id)))
            .and_then(|clip| clip["media_url"].as_str())
            .ok_or("Clip not found")?;
        if !path.starts_with(&format!("/creator/clips/{id}/media?")) {
            return Err("Invalid clip metadata".into());
        }
        (
            format!("{}{}", endpoint.base_url, path),
            format!("VelBots-{id}.mp4"),
        )
    } else {
        (
            format!("{}/creator/export", endpoint.base_url),
            "VelBots-clips.csv".into(),
        )
    };
    let mut response = client
        .get(url)
        .header("X-VelBots-Nonce", &endpoint.instance_nonce)
        .send()
        .await
        .map_err(|_| "Export failed")?
        .error_for_status()
        .map_err(|_| "Export unavailable")?;
    let directory = app
        .path()
        .download_dir()
        .map_err(|_| "Downloads folder unavailable")?;
    std::fs::create_dir_all(&directory).map_err(|_| "Downloads folder inaccessible")?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Clock unavailable")?
        .as_millis();
    let path = directory.join(format!("{stamp}-{filename}"));
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|_| "Cannot create export file")?;
    let result = async {
        let mut total = 0usize;
        while let Some(chunk) = response.chunk().await.map_err(|_| "Export interrupted")? {
            total += chunk.len();
            if total > 512 * 1024 * 1024 {
                return Err("Export size limit exceeded");
            }
            file.write_all(&chunk).map_err(|_| "Cannot save export")?;
        }
        if total == 0 {
            return Err("Empty export");
        }
        file.sync_all().map_err(|_| "Cannot finalize export")?;
        Ok(())
    }
    .await;
    drop(file);
    if let Err(error) = result {
        let _ = std::fs::remove_file(&path); // Only the partial file created by this operation.
        return Err(error.into());
    }
    Ok(path.to_string_lossy().into_owned())
}
