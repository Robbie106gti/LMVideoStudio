mod sidecar;

use sidecar::{SidecarManager, SidecarStatus, HOST_PORT};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_updater::UpdaterExt;

struct AppState {
    sidecars: Mutex<SidecarManager>,
}

#[tauri::command]
fn sidecar_status(state: State<'_, AppState>) -> SidecarStatus {
    state.sidecars.lock().unwrap().status()
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<String, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(format!(
            "Update available: {} — open Settings or restart to apply",
            update.version
        )),
        Ok(None) => Ok("You are on the latest version".into()),
        Err(e) => Err(format!(
            "Update check failed: {e} (verify pubkey + latest.json on GitHub Releases)"
        )),
    }
}

fn inject_host_config(app: &AppHandle) {
    let host_url = format!("http://127.0.0.1:{HOST_PORT}");
    let script = format!("window.__LMVS_HOST__ = '{host_url}';");

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&script);
        let _ = window.show();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            sidecar::ensure_projects_root();

            let repo_root = sidecar::resolve_repo_root(app.handle());
            std::env::set_var(
                "LMVS_REPO_ROOT",
                repo_root.to_string_lossy().as_ref(),
            );

            let mut manager = SidecarManager::new(repo_root);
            manager.start_all(app.handle());

            if !SidecarManager::wait_for_host(sidecar::host_health_timeout_secs()) {
                eprintln!(
                    "LMVideoStudio: Host did not respond on /health within {}s",
                    sidecar::host_health_timeout_secs()
                );
            }

            inject_host_config(app.handle());

            app.manage(AppState {
                sidecars: Mutex::new(manager),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sidecar_status, check_for_updates])
        .run(tauri::generate_context!())
        .expect("error while running LMVideoStudio");
}
