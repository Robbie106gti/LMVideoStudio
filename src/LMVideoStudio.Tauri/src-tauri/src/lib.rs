mod sidecar;
mod error_report;

use error_report::{install_panic_hook, write_error_report};

use sidecar::{SidecarManager, SidecarStatus, HOST_PORT};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

#[cfg(not(lmvs_microsoft_store))]
use tauri_plugin_updater::UpdaterExt;

struct AppState {
    sidecars: Arc<Mutex<SidecarManager>>,
}

#[tauri::command]
fn sidecar_status(state: State<'_, AppState>) -> SidecarStatus {
    state.sidecars.lock().unwrap().status()
}

#[cfg(not(lmvs_microsoft_store))]
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

#[cfg(lmvs_microsoft_store)]
#[tauri::command]
async fn check_for_updates(_app: AppHandle) -> Result<String, String> {
    Ok("Updates are managed by the Microsoft Store".into())
}

fn build_flavor() -> &'static str {
    if cfg!(lmvs_microsoft_store) {
        "microsoft-store"
    } else {
        "direct"
    }
}

fn inject_host_config(app: &AppHandle) {
    let host_url = format!("http://127.0.0.1:{HOST_PORT}");
    let flavor = build_flavor();
    let script = format!(
        "window.__LMVS_HOST__ = '{host_url}'; window.__LMVS_BUILD_FLAVOR__ = '{flavor}';"
    );

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&script);
        let _ = window.show();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_shell::init());
    #[cfg(not(lmvs_microsoft_store))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            install_panic_hook();
            sidecar::ensure_projects_root();

            let repo_root = sidecar::resolve_repo_root(app.handle());
            std::env::set_var(
                "LMVS_REPO_ROOT",
                repo_root.to_string_lossy().as_ref(),
            );
            std::env::set_var("LMVS_BUILD_FLAVOR", build_flavor());

            let mut manager = SidecarManager::new(repo_root);
            manager.start_all(app.handle());

            // Show the webview immediately so the splash UI can render while Host starts.
            // Blocking setup on host health prevented the webview from loading bundled assets.
            inject_host_config(app.handle());

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                if !SidecarManager::wait_for_host(sidecar::host_health_timeout_secs()) {
                    eprintln!(
                        "LMVideoStudio: Host did not respond on /health within {}s",
                        sidecar::host_health_timeout_secs()
                    );
                }
                inject_host_config(&app_handle);
            });

            let sidecars = Arc::new(Mutex::new(manager));
            SidecarManager::spawn_health_monitor(app.handle().clone(), sidecars.clone());

            app.manage(AppState { sidecars });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sidecar_status, check_for_updates, write_error_report])
        .run(tauri::generate_context!())
        .expect("error while running LMVideoStudio");
}
