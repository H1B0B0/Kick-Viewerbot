use std::sync::Arc;
#[cfg(not(debug_assertions))]
use tauri::Emitter;
#[cfg(debug_assertions)]
use tauri::Manager;
use tokio::sync::Mutex;

mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(not(debug_assertions))]
    {
        // Keep single-instance first so Windows/Linux can forward deep links to
        // the already-running process before other plugins handle the event.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            log::info!(
                "a new app instance was opened with {argv:?} and the current working directory is {cwd:?}"
            );
            let _ = app.emit("single-instance", argv);
        }));
    }

    builder
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
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
