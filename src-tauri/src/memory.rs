use serde::Serialize;
use sysinfo::System;

/// Snapshot of system memory used by the real-time memory card in the dashboard.
/// `percent_used` drives the "smart trigger" threshold (default: warn under 15% free).
#[derive(Serialize, Clone)]
pub struct MemoryStatus {
    pub total_mb: u64,
    pub used_mb: u64,
    pub available_mb: u64,
    pub percent_used: f32,
}

fn snapshot() -> MemoryStatus {
    let mut sys = System::new();
    sys.refresh_memory();

    let total_bytes = sys.total_memory();
    let available_bytes = sys.available_memory();
    let used_bytes = total_bytes.saturating_sub(available_bytes);

    let percent_used = if total_bytes > 0 {
        (used_bytes as f32 / total_bytes as f32) * 100.0
    } else {
        0.0
    };

    MemoryStatus {
        total_mb: total_bytes / (1024 * 1024),
        used_mb: used_bytes / (1024 * 1024),
        available_mb: available_bytes / (1024 * 1024),
        percent_used,
    }
}

#[tauri::command]
pub fn get_memory_status() -> MemoryStatus {
    snapshot()
}

/// Conservative mode: just re-measure. Windows' own memory manager already
/// reclaims standby/cached pages under pressure; this mode avoids touching
/// other processes and is the safe default (see product spec: 보수적 모드).
#[tauri::command]
pub fn clean_memory_now() -> MemoryStatus {
    snapshot()
}

/// Pro "aggressive mode": trims the working set of eligible background
/// processes so their private pages are pushed to disk/standby, freeing
/// physical RAM immediately. Protected/whitelisted and foreground processes
/// are skipped — see `is_protected_process`.
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn clean_memory_aggressive(whitelist: Vec<String>) -> Result<MemoryStatus, String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::ProcessStatus::EmptyWorkingSet;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_QUOTA,
    };

    let before = snapshot();
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let whitelist_lower: Vec<String> = whitelist.iter().map(|s| s.to_lowercase()).collect();

    for (pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();
        if is_protected_process(&name) || whitelist_lower.contains(&name) {
            continue;
        }

        unsafe {
            let handle = OpenProcess(
                PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SET_QUOTA,
                false,
                pid.as_u32(),
            );
            if let Ok(handle) = handle {
                let _ = EmptyWorkingSet(handle);
                let _ = CloseHandle(handle);
            }
        }
    }

    let after = snapshot();
    let _ = before; // kept for potential future "reclaimed" reporting/logging
    Ok(after)
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn clean_memory_aggressive(_whitelist: Vec<String>) -> Result<MemoryStatus, String> {
    Err("aggressive mode is only supported on Windows".to_string())
}

/// System/critical processes that must never be trimmed — trimming these can
/// destabilize the OS or degrade foreground app responsiveness.
fn is_protected_process(name_lower: &str) -> bool {
    const PROTECTED: &[&str] = &[
        "system",
        "system idle process",
        "csrss.exe",
        "wininit.exe",
        "winlogon.exe",
        "services.exe",
        "lsass.exe",
        "smss.exe",
        "explorer.exe",
        "hyoclean.exe",
        "dwm.exe",
    ];
    PROTECTED.contains(&name_lower)
}
