//! Compiled by build-installer.ps1 / build-macos.sh into run_worker-{target} (Tauri externalBin).
//! Spawns the embedded Python worker venv shipped under LMVS_REPO_ROOT/sidecars/lmvs_worker.
use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn venv_python(sidecar: &Path) -> Option<PathBuf> {
    let python = if cfg!(windows) {
        sidecar
            .join(".venv")
            .join("Scripts")
            .join("python.exe")
    } else {
        sidecar.join(".venv").join("bin").join("python")
    };
    if python.exists() {
        Some(python)
    } else {
        None
    }
}

fn resolve_worker_dir() -> PathBuf {
    if let Ok(root) = env::var("LMVS_REPO_ROOT") {
        if !root.trim().is_empty() {
            let packaged = PathBuf::from(&root)
                .join("sidecars")
                .join("lmvs_worker");
            if packaged.join("lmvs_worker").exists() {
                return packaged;
            }
        }
    }

    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            let local = dir.join("sidecars").join("lmvs_worker");
            if local.join("lmvs_worker").exists() {
                return local;
            }
            if dir.join("lmvs_worker").exists() {
                return dir.to_path_buf();
            }
        }
    }

    env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn resolve_python(worker_dir: &Path) -> Option<PathBuf> {
    if let Some(p) = venv_python(worker_dir) {
        return Some(p);
    }

    if let Ok(root) = env::var("LMVS_REPO_ROOT") {
        let spike = if cfg!(windows) {
            PathBuf::from(&root)
                .join("spike")
                .join(".venv")
                .join("Scripts")
                .join("python.exe")
        } else {
            PathBuf::from(&root)
                .join("spike")
                .join(".venv")
                .join("bin")
                .join("python")
        };
        if spike.exists() {
            return Some(spike);
        }
    }

    None
}

fn path_separator() -> char {
    if cfg!(windows) {
        ';'
    } else {
        ':'
    }
}

fn main() {
    let worker_dir = resolve_worker_dir();
    let python = match resolve_python(&worker_dir) {
        Some(p) => p,
        None => {
            eprintln!(
                "ERROR: No worker venv found under {} or spike fallback.",
                worker_dir.display()
            );
            eprintln!("Re-run ./scripts/build-sidecars-macos.sh or ./scripts/build-sidecars.ps1.");
            std::process::exit(1);
        }
    };

    if let Ok(path) = env::var("PATH") {
        let bin = worker_dir.join("bin");
        env::set_var(
            "PATH",
            format!("{}{}{}", bin.display(), path_separator(), path),
        );
    }

    let port = env::var("LMVS_WORKER_PORT").unwrap_or_else(|_| "8765".to_string());

    let mut cmd = Command::new(&python);
    cmd.args([
        "-m",
        "uvicorn",
        "lmvs_worker.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        &port,
    ])
    .current_dir(&worker_dir)
    .stdout(Stdio::null())
    .stderr(Stdio::null());

    if let Ok(root) = env::var("LMVS_REPO_ROOT") {
        cmd.env("LMVS_REPO_ROOT", root);
    }
    cmd.env("LMVS_WORKER_PORT", &port);

    let status = cmd.status().expect("failed to spawn worker");
    std::process::exit(status.code().unwrap_or(1));
}
