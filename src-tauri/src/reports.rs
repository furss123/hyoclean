use serde::Serialize;
use std::fs;

#[derive(Serialize, Clone)]
pub struct CleanHistoryEntry {
    pub backup_id: String,
    pub item_count: usize,
    pub total_size_bytes: u64,
}

fn backup_root() -> Option<std::path::PathBuf> {
    std::env::var("LOCALAPPDATA")
        .ok()
        .map(|dir| std::path::PathBuf::from(dir).join("HyoClean").join("backup"))
}

/// Lists past cleanup batches (newest first) so the Reports page can show a
/// timeline and offer "되돌리기" per entry via `restore_clean_batch`.
#[tauri::command]
pub fn list_clean_history() -> Vec<CleanHistoryEntry> {
    let Some(root) = backup_root() else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(&root) else {
        return Vec::new();
    };

    let mut batches: Vec<CleanHistoryEntry> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| {
            let backup_id = e.file_name().to_string_lossy().to_string();
            let mut item_count = 0usize;
            let mut total_size_bytes = 0u64;
            if let Ok(files) = fs::read_dir(e.path()) {
                for f in files.filter_map(|f| f.ok()) {
                    let name = f.file_name();
                    if name == "manifest.json" {
                        continue;
                    }
                    if let Ok(meta) = f.metadata() {
                        item_count += 1;
                        total_size_bytes += meta.len();
                    }
                }
            }
            CleanHistoryEntry {
                backup_id,
                item_count,
                total_size_bytes,
            }
        })
        .collect();

    batches.sort_by(|a, b| b.backup_id.cmp(&a.backup_id));
    batches
}
