mod models;
mod system_monitor;
mod port_inspector;
mod process_control;
mod windows_services;

use models::*;
use system_monitor::SystemMonitor;
use std::sync::Mutex;
use tauri::{Manager, State};

pub struct AppState {
    monitor: Mutex<SystemMonitor>,
}

// ─── System Stats ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_system_stats(state: State<AppState>) -> Result<SystemStats, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_stats())
}

#[tauri::command]
fn get_system_info(state: State<AppState>) -> Result<SystemInfo, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_system_info())
}

#[tauri::command]
fn get_history(state: State<AppState>) -> Result<Vec<HistoricalSnapshot>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_history())
}

// ─── Processes ───────────────────────────────────────────────────────────────

#[tauri::command]
fn get_processes(state: State<AppState>) -> Result<Vec<ProcessInfo>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_processes())
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<String, String> {
    process_control::kill_process(pid)
}

#[tauri::command]
fn kill_process_tree(pid: u32) -> Result<String, String> {
    process_control::kill_process_tree(pid)
}

#[tauri::command]
fn suspend_process(pid: u32) -> Result<String, String> {
    process_control::suspend_process(pid)
}

#[tauri::command]
fn resume_process(pid: u32) -> Result<String, String> {
    process_control::resume_process(pid)
}

#[tauri::command]
fn set_process_priority(pid: u32, priority: i32) -> Result<String, String> {
    process_control::set_process_priority(pid, priority)
}

// ─── CPU Affinity & Resource Control ─────────────────────────────────────────

#[tauri::command]
fn set_cpu_affinity(pid: u32, cores: Vec<usize>) -> Result<String, String> {
    process_control::set_cpu_affinity(pid, cores)
}

#[tauri::command]
fn get_process_affinity(pid: u32) -> Result<Vec<usize>, String> {
    process_control::get_process_affinity(pid)
}

#[tauri::command]
fn throttle_process_cpu(pid: u32, percent: u32) -> Result<String, String> {
    process_control::throttle_process_cpu(pid, percent)
}

#[tauri::command]
fn free_process_memory(pid: u32) -> Result<String, String> {
    process_control::free_process_memory(pid)
}

#[tauri::command]
fn set_memory_limit(pid: u32, max_bytes: usize) -> Result<String, String> {
    process_control::set_memory_limit(pid, max_bytes)
}

// ─── Disks & Networks ────────────────────────────────────────────────────────

#[tauri::command]
fn get_disks(state: State<AppState>) -> Result<Vec<DiskInfo>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_disks())
}

#[tauri::command]
fn get_networks(state: State<AppState>) -> Result<Vec<NetworkInfo>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_networks())
}

// ─── Ports ───────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_connections() -> Result<Vec<PortConnection>, String> {
    Ok(port_inspector::get_connections())
}

// ─── Services & Startup ──────────────────────────────────────────────────────

#[tauri::command]
fn get_services() -> Result<Vec<windows_services::ServiceInfo>, String> {
    Ok(windows_services::get_services())
}

#[tauri::command]
fn get_startup_entries() -> Result<Vec<windows_services::StartupEntry>, String> {
    Ok(windows_services::get_startup_entries())
}

#[tauri::command]
fn control_service(name: String, action: String) -> Result<String, String> {
    windows_services::control_service(&name, &action)
}

// ─── App Entry ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            monitor: Mutex::new(SystemMonitor::new()),
        })
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            // ── System Tray ──────────────────────────────────────────────────
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            use tauri::menu::{Menu, MenuItem};

            let show_item = MenuItem::with_id(app, "show", "Show CoreSentinel", true, None::<&str>)?;
            let sep = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &sep, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("CoreSentinel - System Monitor")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => { app.exit(0); }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Single click: show/restore the window
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // Minimize to tray instead of quitting when window is closed
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_stats,
            get_system_info,
            get_history,
            get_processes,
            kill_process,
            kill_process_tree,
            suspend_process,
            resume_process,
            set_process_priority,
            set_cpu_affinity,
            get_process_affinity,
            throttle_process_cpu,
            free_process_memory,
            set_memory_limit,
            get_disks,
            get_networks,
            get_connections,
            get_services,
            get_startup_entries,
            control_service,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
