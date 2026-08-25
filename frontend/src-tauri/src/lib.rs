use std::sync::Arc;
use tauri::Emitter;
#[cfg(debug_assertions)]
use tauri::Manager;
use tokio::sync::Mutex;

mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()

    .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
        println!("a new app instance was opened with {argv:?} and the current working directory is {cwd:?}");
        let _ = app.emit("single-instance", argv);
    }))
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .manage(sidecar::SidecarState {
        endpoint: Arc::new(Mutex::new(None)),
    })
    .invoke_handler(tauri::generate_handler![sidecar::get_runtime_endpoint])
    .setup(|app| {
      sidecar::spawn_sidecar(app.handle());

      #[cfg(debug_assertions)]
      {
        let window = app.get_webview_window("main").unwrap();
        window.open_devtools();
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
