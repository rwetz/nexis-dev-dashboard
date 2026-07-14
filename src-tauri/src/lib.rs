pub mod config;
pub mod gitscan;

use rayon::prelude::*;
use serde::Serialize;
use std::time::Instant;

#[derive(Serialize)]
struct ScanResult {
    repos: Vec<gitscan::RepoStatus>,
    elapsed_ms: u64,
    config_path: String,
    scan_root: Option<String>,
}

/// Re-reads config.toml on every scan so edits are picked up by a plain
/// refresh, then fans the per-repo status reads out across rayon's pool.
#[tauri::command]
async fn scan_repos() -> Result<ScanResult, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let started = Instant::now();
        let (cfg, path) = config::load_or_init()?;
        let paths = config::resolve_repos(&cfg);
        let mut repos: Vec<gitscan::RepoStatus> =
            paths.par_iter().map(|p| gitscan::scan_repo(p)).collect();
        repos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        Ok(ScanResult {
            repos,
            elapsed_ms: started.elapsed().as_millis() as u64,
            config_path: path.display().to_string(),
            scan_root: cfg.scan_root.clone(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn repo_detail(path: String) -> Result<gitscan::RepoDetail, String> {
    tauri::async_runtime::spawn_blocking(move || {
        gitscan::repo_detail(std::path::Path::new(&path))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Open the user's terminal emulator with its working directory at `path`.
/// Desktop-app equivalent of the original TUI's "drop into a shell" keybind.
#[tauri::command]
fn open_in_terminal(path: String) -> Result<String, String> {
    spawn_terminal(&path)
}

#[cfg(target_os = "linux")]
fn spawn_terminal(path: &str) -> Result<String, String> {
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(t) = std::env::var("TERMINAL") {
        if !t.is_empty() {
            candidates.push(t);
        }
    }
    for c in [
        "ghostty",
        "kitty",
        "alacritty",
        "wezterm",
        "foot",
        "konsole",
        "gnome-terminal",
        "xfce4-terminal",
        "xterm",
    ] {
        candidates.push(c.into());
    }
    for term in candidates {
        if std::process::Command::new(&term)
            .current_dir(path)
            .spawn()
            .is_ok()
        {
            return Ok(term);
        }
    }
    Err("no terminal emulator found — set $TERMINAL".into())
}

#[cfg(target_os = "macos")]
fn spawn_terminal(path: &str) -> Result<String, String> {
    std::process::Command::new("open")
        .args(["-a", "Terminal", path])
        .spawn()
        .map(|_| "Terminal".to_string())
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn spawn_terminal(path: &str) -> Result<String, String> {
    // Windows Terminal if present, else a plain cmd window.
    if std::process::Command::new("wt")
        .args(["-d", path])
        .spawn()
        .is_ok()
    {
        return Ok("wt".into());
    }
    std::process::Command::new("cmd")
        .args(["/C", "start", "cmd"])
        .current_dir(path)
        .spawn()
        .map(|_| "cmd".to_string())
        .map_err(|e| e.to_string())
}

/// Open a repo directory in the system file manager.
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    tauri_plugin_opener::open_path(path, None::<&str>).map_err(|e| e.to_string())
}

/// Open config.toml in the default editor (creating it first if needed).
#[tauri::command]
fn open_config() -> Result<(), String> {
    let (_, path) = config::load_or_init()?;
    tauri_plugin_opener::open_path(path.display().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "linux")]
fn is_nvidia() -> bool {
    std::path::Path::new("/proc/driver/nvidia/version").exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // NVIDIA + Wayland + WebKitGTK ≥2.48: the web process's DMA-BUF export
    // kills the app with `Gdk Error 71 (Protocol error)` at first paint.
    // The usual WEBKIT_DISABLE_DMABUF_RENDERER=1 workaround avoids the crash
    // but loses window alpha (black behind the rounded borderless corners),
    // and hardware-acceleration-policy=Never paints nothing at all on 2.52.
    // Forcing Mesa's EGL (llvmpipe) for this process is the one combination
    // verified stable AND alpha-correct on NVIDIA; skip via DEVDASH_KEEP_HW_ACCEL=1.
    #[cfg(target_os = "linux")]
    if is_nvidia() && std::env::var_os("DEVDASH_KEEP_HW_ACCEL").is_none() {
        const MESA: &str = "/usr/share/glvnd/egl_vendor.d/50_mesa.json";
        if std::env::var_os("__EGL_VENDOR_LIBRARY_FILENAMES").is_none()
            && std::path::Path::new(MESA).exists()
        {
            std::env::set_var("__EGL_VENDOR_LIBRARY_FILENAMES", MESA);
        } else if std::env::var_os("__EGL_VENDOR_LIBRARY_FILENAMES").is_none() {
            // No Mesa ICD to fall back to — at least keep the app alive.
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            scan_repos,
            repo_detail,
            open_in_terminal,
            open_path,
            open_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
