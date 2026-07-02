use serde::Serialize;
use std::time::Duration;
use sysinfo::{Disks, System};

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

#[tauri::command]
pub fn get_system_overview() -> SystemOverview {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    std::thread::sleep(Duration::from_millis(120));
    sys.refresh_cpu_usage();
    let cpu_percent = sys.global_cpu_usage();

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
