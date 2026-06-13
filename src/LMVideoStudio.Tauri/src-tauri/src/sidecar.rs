//! Sidecar orchestrator — starts LMVideoStudio Host (.NET) and Python worker (uvicorn).
//!
//! ## Dev vs production entry resolution
//!
//! **Host (.NET, port 17170)**
//! - *Development*: `src/LMVideoStudio.Host/bin/Debug/net8.0/LMVideoStudio.Host.dll` via `dotnet`.
//! - *Production*: `LMVideoStudio.Host.exe` next to the Tauri executable (externalBin bundle).
//!   On Windows, resolve via `std::env::current_exe()` — Tauri's `executable_dir()` is unsupported.
//!
//! **Worker (Python, port 8765)**
//! - *Production*: `run_worker.exe` sidecar stub next to the Tauri executable.
//! - *Development*: `sidecars/lmvs_worker/.venv` or spike venv fallback.
//!
//! If a process is already listening on the health URL, startup is skipped (supports manual `make dev`).
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};
use std::{fs, thread};

use reqwest::blocking;
use serde::Serialize;
use tauri::{AppHandle, Manager};

pub const HOST_PORT: u16 = 17170;
const WORKER_PORT: u16 = 8765;
const HOST_HEALTH_TIMEOUT_SECS: u64 = 60;

#[derive(Clone, Serialize, Default)]
pub struct SidecarStatus {
    pub host_running: bool,
    pub worker_running: bool,
    pub host_url: String,
    pub worker_url: String,
}

pub struct SidecarManager {
    repo_root: PathBuf,
    host_child: Option<Child>,
    worker_child: Option<Child>,
}

impl SidecarManager {
    pub fn new(repo_root: PathBuf) -> Self {
        Self {
            repo_root,
            host_child: None,
            worker_child: None,
        }
    }

    pub fn start_all(&mut self, app: &AppHandle) {
        self.start_host(app);
        self.start_worker(app);
    }

    pub fn wait_for_host(timeout_secs: u64) -> bool {
        let url = format!("http://127.0.0.1:{HOST_PORT}/health");
        let deadline = Instant::now() + Duration::from_secs(timeout_secs);
        let mut delay = Duration::from_millis(250);

        while Instant::now() < deadline {
            if Self::probe(&url) {
                return true;
            }
            thread::sleep(delay);
            delay = std::cmp::min(delay + Duration::from_millis(250), Duration::from_secs(2));
        }

        false
    }

    fn sidecars_dir(&self) -> PathBuf {
        self.repo_root.join("sidecars")
    }

    fn start_host(&mut self, _app: &AppHandle) {
        let health_url = format!("http://127.0.0.1:{HOST_PORT}/health");
        if Self::probe(&health_url) {
            return;
        }

        let Some(entry) = self.find_host_entry() else {
            eprintln!("LMVideoStudio: Host sidecar not found (dev build or missing externalBin)");
            return;
        };

        let port = HOST_PORT.to_string();
        let repo = self.repo_root.to_string_lossy().into_owned();

        let spawn_result = if entry.extension().is_some_and(|ext| ext == "dll") {
            Command::new("dotnet")
                .arg(&entry)
                .arg(&port)
                .env("LMVS_REPO_ROOT", &repo)
                .env("LMVS_HOST_PORT", &port)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
        } else {
            Command::new(&entry)
                .arg(&port)
                .env("LMVS_REPO_ROOT", &repo)
                .env("LMVS_HOST_PORT", &port)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
        };

        match spawn_result {
            Ok(child) => self.host_child = Some(child),
            Err(err) => eprintln!("LMVideoStudio: failed to spawn Host at {}: {err}", entry.display()),
        }
    }

    fn find_host_entry(&self) -> Option<PathBuf> {
        for framework in ["net8.0", "net6.0"] {
            let dev_dll = self
                .repo_root
                .join("src")
                .join("LMVideoStudio.Host")
                .join("bin")
                .join("Debug")
                .join(framework)
                .join("LMVideoStudio.Host.dll");

            if dev_dll.exists() {
                return Some(dev_dll);
            }
        }

        for candidate in [
            self.sidecars_dir().join("LMVideoStudio.Host.exe"),
            self.sidecars_dir()
                .join("lmvs_host")
                .join("publish")
                .join("LMVideoStudio.Host.exe"),
        ] {
            if candidate.exists() {
                return Some(candidate);
            }
        }

        install_dir().and_then(|dir| find_bundled_sidecar(&dir, "LMVideoStudio.Host"))
    }

    fn start_worker(&mut self, _app: &AppHandle) {
        let health_url = format!("http://127.0.0.1:{WORKER_PORT}/health");
        if Self::probe(&health_url) {
            return;
        }

        if let Some(bundled) = install_dir().and_then(|dir| find_bundled_sidecar(&dir, "run_worker"))
        {
            let _ = Command::new(bundled)
                .env("LMVS_REPO_ROOT", self.repo_root.to_string_lossy().as_ref())
                .env("LMVS_WORKER_PORT", WORKER_PORT.to_string())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map(|child| self.worker_child = Some(child));
            return;
        }

        let worker_dir = self.sidecars_dir().join("lmvs_worker");
        let venv_python = worker_dir.join(".venv").join("Scripts").join("python.exe");

        if venv_python.exists() {
            let _ = Command::new(venv_python)
                .args([
                    "-m",
                    "uvicorn",
                    "lmvs_worker.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    &WORKER_PORT.to_string(),
                ])
                .current_dir(&worker_dir)
                .env("LMVS_REPO_ROOT", self.repo_root.to_string_lossy().as_ref())
                .env("LMVS_WORKER_PORT", WORKER_PORT.to_string())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map(|child| self.worker_child = Some(child));
            return;
        }

        // Dev fallback: spike venv (Gate 9 pattern)
        let spike_python = self
            .repo_root
            .join("spike")
            .join(".venv")
            .join("Scripts")
            .join("python.exe");

        if spike_python.exists() {
            let python_root = self.repo_root.join("python");
            let _ = Command::new(spike_python)
                .args([
                    "-m",
                    "uvicorn",
                    "lmvs_worker.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    &WORKER_PORT.to_string(),
                ])
                .current_dir(&python_root)
                .env("LMVS_REPO_ROOT", self.repo_root.to_string_lossy().as_ref())
                .env("LMVS_WORKER_PORT", WORKER_PORT.to_string())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map(|child| self.worker_child = Some(child));
        }
    }

    fn probe(url: &str) -> bool {
        blocking::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .and_then(|c| c.get(url).send())
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    pub fn status(&self) -> SidecarStatus {
        SidecarStatus {
            host_running: Self::probe(&format!("http://127.0.0.1:{HOST_PORT}/health")),
            worker_running: Self::probe(&format!("http://127.0.0.1:{WORKER_PORT}/health")),
            host_url: format!("http://127.0.0.1:{HOST_PORT}"),
            worker_url: format!("http://127.0.0.1:{WORKER_PORT}"),
        }
    }

    /// Restart sidecars that stopped responding (packaged app resilience).
    pub fn ensure_running(&mut self, app: &AppHandle) {
        let status = self.status();
        if !status.host_running {
            if let Some(mut child) = self.host_child.take() {
                let _ = child.kill();
            }
            self.start_host(app);
        }
        if !status.worker_running {
            if let Some(mut child) = self.worker_child.take() {
                let _ = child.kill();
            }
            self.start_worker(app);
        }
    }

    pub fn spawn_health_monitor(app: AppHandle, manager: std::sync::Arc<std::sync::Mutex<SidecarManager>>) {
        std::thread::spawn(move || {
            loop {
                thread::sleep(Duration::from_secs(15));
                if let Ok(mut guard) = manager.lock() {
                    guard.ensure_running(&app);
                }
            }
        });
    }
}

impl Drop for SidecarManager {
    fn drop(&mut self) {
        if let Some(mut child) = self.host_child.take() {
            let _ = child.kill();
        }
        if let Some(mut child) = self.worker_child.take() {
            let _ = child.kill();
        }
    }
}

fn looks_like_repo_root(path: &Path) -> bool {
    path.join("LMVideoStudio.sln").exists()
        || path.join("sidecars").join("lmvs_worker").exists()
        || path.join("src").join("LMVideoStudio.Host").exists()
}

fn find_repo_root_from(start: &Path) -> Option<PathBuf> {
    let mut current = start.to_path_buf();
    for _ in 0..8 {
        if looks_like_repo_root(&current) {
            return Some(current);
        }
        if !current.pop() {
            break;
        }
    }
    None
}

/// Resolve LMVS_REPO_ROOT for dev (git tree) or packaged installs (Tauri resource dir).
pub fn resolve_repo_root(app: &AppHandle) -> PathBuf {
    if let Ok(env) = std::env::var("LMVS_REPO_ROOT") {
        if !env.trim().is_empty() {
            return PathBuf::from(env);
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        if resource_dir.join("docs").exists() || resource_dir.join("config").exists() {
            return resource_dir;
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        if let Some(root) = find_repo_root_from(&cwd) {
            return root;
        }
    }

    if let Some(exe_dir) = install_dir() {
        if let Some(root) = find_repo_root_from(&exe_dir) {
            return root;
        }
        if find_bundled_sidecar(&exe_dir, "LMVideoStudio.Host").is_some() {
            return exe_dir;
        }
    }

    app.path()
        .resource_dir()
        .ok()
        .or(install_dir())
        .unwrap_or_else(|| PathBuf::from("."))
}

/// Directory containing the running app executable (NSIS/MSI install dir on Windows).
fn install_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|dir| dir.to_path_buf()))
}

fn bundled_sidecar_names(stem: &str) -> Vec<String> {
    let mut names = vec![format!("{stem}.exe")];
    if let Some(target) = option_env!("TARGET") {
        names.push(format!("{stem}-{target}.exe"));
    }
    names
}

fn find_bundled_sidecar(dir: &Path, stem: &str) -> Option<PathBuf> {
    for name in bundled_sidecar_names(stem) {
        let candidate = dir.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

/// Ensure `%LOCALAPPDATA%/LMVideoStudio/projects` exists for packaged runs.
pub fn ensure_projects_root() {
    if std::env::var("LMVS_PROJECTS_ROOT")
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
    {
        return;
    }

    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        let projects = PathBuf::from(local)
            .join("LMVideoStudio")
            .join("projects");
        let _ = fs::create_dir_all(projects);
    }
}

pub fn host_health_timeout_secs() -> u64 {
    HOST_HEALTH_TIMEOUT_SECS
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn temp_dir(name: &str) -> PathBuf {
        let id = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
        let dir = std::env::temp_dir().join(format!("lmvs-sidecar-test-{name}-{id}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn bundled_sidecar_names_include_plain_and_target_triple() {
        let names = bundled_sidecar_names("LMVideoStudio.Host");
        assert!(names.contains(&"LMVideoStudio.Host.exe".to_string()));
        if let Some(target) = option_env!("TARGET") {
            assert!(names.contains(&format!("LMVideoStudio.Host-{target}.exe")));
        }
    }

    #[test]
    fn find_bundled_sidecar_prefers_plain_exe_name() {
        let dir = temp_dir("plain");
        let exe = dir.join("LMVideoStudio.Host.exe");
        fs::write(&exe, b"").expect("write exe");

        let found = find_bundled_sidecar(&dir, "LMVideoStudio.Host");
        assert_eq!(found.as_deref(), Some(exe.as_path()));
    }

    #[test]
    fn find_bundled_sidecar_falls_back_to_target_triple_name() {
        let Some(target) = option_env!("TARGET") else {
            return;
        };

        let dir = temp_dir("triple");
        let exe = dir.join(format!("run_worker-{target}.exe"));
        fs::write(&exe, b"").expect("write exe");

        let found = find_bundled_sidecar(&dir, "run_worker");
        assert_eq!(found.as_deref(), Some(exe.as_path()));
    }
}
