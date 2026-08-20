use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let sidecar_command = app.shell().sidecar("backend").unwrap();
      
      let (mut rx, mut _child) = sidecar_command
        .spawn()
        .expect("Failed to spawn backend sidecar");

      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          if let CommandEvent::Stdout(line) = event {
            println!("backend: {}", String::from_utf8_lossy(&line));
          } else if let CommandEvent::Stderr(line) = event {
            eprintln!("backend error: {}", String::from_utf8_lossy(&line));
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
