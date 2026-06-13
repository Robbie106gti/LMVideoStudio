//! Local error report persistence for Tauri shell (fallback when Host is down).
use std::fs;
use std::path::PathBuf;

fn reports_root() -> PathBuf {
    if let Ok(env) = std::env::var("LMVS_REPORTS_ROOT") {
        if !env.trim().is_empty() {
            return PathBuf::from(env);
        }
    }

    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        return PathBuf::from(local).join("LMVideoStudio").join("reports");
    }

    std::env::temp_dir().join("LMVideoStudio").join("reports")
}

pub fn ensure_reports_root() -> PathBuf {
    let root = reports_root();
    let _ = fs::create_dir_all(&root);
    root
}

pub fn write_report_json(json: &str) -> Result<String, String> {
    let root = ensure_reports_root();
    let id = uuid_simple();
    let path = root.join(format!("{id}.json"));
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("tauri-{nanos:x}")
}

pub fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let message = info.to_string();
        eprintln!("LMVideoStudio panic: {message}");
        let payload = format!(
            r#"{{"id":"{}","timestamp":"{}","source":"tauri","severity":"fatal","message":{},"userConsented":false}}"#,
            uuid_simple(),
            chrono_like_iso(),
            serde_json_string(&message)
        );
        let _ = write_report_json(&payload);
    }));
}

fn chrono_like_iso() -> String {
    // Minimal UTC timestamp without extra deps.
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{secs}")
}

fn serde_json_string(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "\"panic\"".to_string())
}

#[tauri::command]
pub fn write_error_report(json: String) -> Result<String, String> {
    write_report_json(&json)
}
