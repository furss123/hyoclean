use std::process::Command;

/// Launches a native Windows utility by executable/control-panel applet name.
/// Best-effort: failures are surfaced as a string error so the UI can toast it,
/// but never crash the app.
fn spawn(program: &str, args: &[&str]) -> Result<(), String> {
    Command::new(program)
        .args(args)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_task_manager() -> Result<(), String> {
    spawn("taskmgr.exe", &[])
}

#[tauri::command]
pub fn open_disk_cleanup() -> Result<(), String> {
    spawn("cleanmgr.exe", &[])
}

#[tauri::command]
pub fn open_device_manager() -> Result<(), String> {
    spawn("mmc.exe", &["devmgmt.msc"])
}

#[tauri::command]
pub fn open_programs_and_features() -> Result<(), String> {
    spawn("control.exe", &["appwiz.cpl"])
}

#[tauri::command]
pub fn open_temp_folder() -> Result<(), String> {
    let temp = std::env::var("TEMP").map_err(|e| e.to_string())?;
    spawn("explorer.exe", &[&temp])
}

#[tauri::command]
pub fn open_startup_folder() -> Result<(), String> {
    let appdata = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let path = format!("{appdata}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup");
    spawn("explorer.exe", &[&path])
}
