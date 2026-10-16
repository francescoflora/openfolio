use std::sync::Mutex;
use tauri::Manager;

pub mod fdx;
pub mod fountain;
pub mod models;
pub mod pdf;

use models::{PdfExportPayload, SceneDoc};

/// Returns (and clears) the project file passed on the command line, e.g. when
/// the user double-clicks an `.openfolio` file that is associated with the app.
#[tauri::command]
fn launch_file(state: tauri::State<'_, Mutex<Option<String>>>) -> Option<String> {
    state.lock().ok().and_then(|mut s| s.take())
}

/// Reads the language selected during the NSIS installation (`lang.txt` in app dir), if present.
#[tauri::command]
fn installer_language() -> Option<String> {
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?;
    let raw = std::fs::read_to_string(dir.join("lang.txt")).ok()?;
    let lang = raw.trim().to_ascii_lowercase();
    if lang == "en" || lang == "it" {
        Some(lang)
    } else {
        None
    }
}

#[tauri::command]
fn export_fountain(scenes: Vec<SceneDoc>) -> String {
    fountain::scenes_to_fountain(&scenes)
}

#[tauri::command]
fn import_fountain(text: String) -> Vec<SceneDoc> {
    fountain::fountain_to_scenes(&text)
}

#[tauri::command]
fn export_fdx(scenes: Vec<SceneDoc>) -> Result<String, String> {
    fdx::scenes_to_fdx(&scenes)
}

#[tauri::command]
fn import_fdx(xml: String) -> Result<Vec<SceneDoc>, String> {
    fdx::fdx_to_scenes(&xml)
}

#[tauri::command]
fn export_pdf(payload: PdfExportPayload) -> Result<Vec<u8>, String> {
    pdf::generate_pdf(&payload)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            launch_file,
            installer_language,
            export_fountain,
            import_fountain,
            export_fdx,
            import_fdx,
            export_pdf
        ])
        .setup(|app| {
            let launch_file = std::env::args()
                .skip(1)
                .find(|a| {
                    let lower = a.to_ascii_lowercase();
                    lower.ends_with(".ofp") || lower.ends_with(".openfolio")
                });
            app.manage(Mutex::new(launch_file));

            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
                app.handle().plugin(tauri_plugin_opener::init())?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
