use serde::Serialize;
use std::sync::Mutex;
use sysinfo::{Disks, System};

/// Persistent system probe kept in Tauri managed state. Reusing one `System`
/// across polls lets `refresh_cpu_usage` compute the delta against the previous
/// sample (~3s ago), so we avoid both the per-call allocation and the blocking
/// sleep the old implementation needed to get a usable CPU reading.
pub struct SysMonitor {
    sys: Mutex<System>,
}

impl SysMonitor {
    pub fn new() -> Self {
        Self {
            sys: Mutex::new(System::new()),
        }
    }
}

#[derive(Serialize, Clone)]
pub struct SystemOverview {
    pub cpu_percent: f32,
    pub drive: String,
    pub disk_total_gb: u64,
    pub disk_used_gb: u64,
    pub disk_free_gb: u64,
    pub disk_used_percent: f32,
}

fn to_gb(bytes: u64) -> u64 {
    bytes / (1024 * 1024 * 1024)
}

fn pick_system_disk(disks: &Disks) -> Option<(String, u64, u64)> {
    let system_drive = std::env::var("SystemDrive")
        .unwrap_or_else(|_| "C:".to_string())
        .to_uppercase();
    let system_prefix = format!("{}\\", system_drive);

    let mut fallback: Option<(String, u64, u64)> = None;
    for disk in disks.list() {
        let mount = disk.mount_point().to_string_lossy().to_string();
        let mount_upper = mount.to_uppercase();
        let total = disk.total_space();
        let free = disk.available_space();

        if fallback.is_none() {
            fallback = Some((mount.clone(), total, free));
        }
        if mount_upper.starts_with(&system_prefix) || mount_upper == system_drive {
            return Some((mount, total, free));
        }
    }
    fallback
}

/// Core logic behind `get_system_overview`, split out so it can be exercised
/// directly (in tests, or by any future caller) without going through Tauri's
/// managed-state extraction.
fn overview_with_monitor(monitor: &SysMonitor) -> SystemOverview {
    let cpu_percent = {
        let mut sys = monitor.sys.lock().unwrap();
        sys.refresh_cpu_usage();
        sys.global_cpu_usage()
    };

    let disks = Disks::new_with_refreshed_list();
    let (drive, total, free) =
        pick_system_disk(&disks).unwrap_or(("C:\\".to_string(), 0, 0));
    let used = total.saturating_sub(free);
    let disk_used_percent = if total > 0 {
        (used as f32 / total as f32) * 100.0
    } else {
        0.0
    };

    SystemOverview {
        cpu_percent,
        drive,
        disk_total_gb: to_gb(total),
        disk_used_gb: to_gb(used),
        disk_free_gb: to_gb(free),
        disk_used_percent,
    }
}

#[tauri::command]
pub fn get_system_overview(monitor: tauri::State<'_, SysMonitor>) -> SystemOverview {
    overview_with_monitor(&monitor)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn overview_reuses_monitor_without_blocking_sleep() {
        let monitor = SysMonitor::new();

        // First call has no prior CPU sample; sysinfo may read 0% here, which
        // is expected and fine — it's the second call (using the retained
        // System from the first) that exercises the real polling path.
        let first = overview_with_monitor(&monitor);
        assert!(first.disk_total_gb > 0, "expected a real system disk to be found");

        let start = Instant::now();
        let second = overview_with_monitor(&monitor);
        let elapsed = start.elapsed();

        // The old implementation slept 120ms per call; the fix removed that
        // sleep entirely, so a single call should now complete in a few ms.
        assert!(
            elapsed.as_millis() < 100,
            "expected no artificial delay, took {:?}",
            elapsed
        );
        assert!(second.cpu_percent >= 0.0);
    }
}
