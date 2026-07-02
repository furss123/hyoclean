use chrono::Local;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

/// Root folder that holds every rollback snapshot, one subfolder per cleanup run.
/// Mirrors the brand-kit rule: "정리 전 복원지점 + 1클릭 되돌리기".
fn backup_root() -> Option<PathBuf> {
    std::env::var("LOCALAPPDATA")
        .ok()
        .map(|dir| PathBuf::from(dir).join("HyoClean").join("backup"))
}

#[derive(Serialize, Clone)]
pub struct CleanOutcome {
    pub cleaned_count: usize,
    pub failed_count: usize,
    pub reclaimed_bytes: u64,
    pub backup_id: String,
    pub failed_paths: Vec<String>,
}

/// Moves each selected file into a timestamped backup folder (instead of
/// deleting outright), so `restore_last_clean` can undo the whole batch.
/// Safe against partial failures — one locked file doesn't abort the rest.
#[tauri::command]
pub fn clean_selected_items(paths: Vec<String>) -> Result<CleanOutcome, String> {
    let root = backup_root().ok_or("LOCALAPPDATA not set")?;
    let backup_id = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let batch_dir = root.join(&backup_id);
    fs::create_dir_all(&batch_dir).map_err(|e| e.to_string())?;

    let mut cleaned_count = 0usize;
    let mut failed_paths = Vec::new();
    let mut reclaimed_bytes = 0u64;

    for (idx, path_str) in paths.iter().enumerate() {
        let src = Path::new(path_str);
        let size = fs::metadata(src).map(|m| m.len()).unwrap_or(0);
        // Flat filename per entry to avoid recreating the full source tree.
        let dest = batch_dir.join(format!("{idx}_{}", sanitize_filename(src)));

        match fs::rename(src, &dest) {
            Ok(_) => {
                cleaned_count += 1;
                reclaimed_bytes += size;
            }
            Err(_) => {
                // rename() fails across drives/some junctions — fall back to copy+remove.
                if fs::copy(src, &dest).is_ok() && fs::remove_file(src).is_ok() {
                    cleaned_count += 1;
                    reclaimed_bytes += size;
                } else {
                    failed_paths.push(path_str.clone());
                }
            }
        }
    }

    // Save a manifest so restore knows original destinations.
    let manifest: Vec<(String, String)> = paths
        .iter()
        .enumerate()
        .filter(|(_, p)| !failed_paths.contains(p))
        .map(|(idx, p)| {
            let src = Path::new(p);
            (
                format!("{idx}_{}", sanitize_filename(src)),
                p.clone(),
            )
        })
        .collect();
    let manifest_json = serde_json::to_string_pretty(&manifest).unwrap_or_default();
    let _ = fs::write(batch_dir.join("manifest.json"), manifest_json);

    Ok(CleanOutcome {
        cleaned_count,
        failed_count: failed_paths.len(),
        reclaimed_bytes,
        backup_id,
        failed_paths,
    })
}

/// Restores every file from a given backup batch back to its original path.
#[tauri::command]
pub fn restore_clean_batch(backup_id: String) -> Result<usize, String> {
    let root = backup_root().ok_or("LOCALAPPDATA not set")?;
    let batch_dir = root.join(&backup_id);
    let manifest_path = batch_dir.join("manifest.json");
    let manifest_raw = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: Vec<(String, String)> =
        serde_json::from_str(&manifest_raw).map_err(|e| e.to_string())?;

    let mut restored = 0usize;
    for (backup_name, original_path) in manifest {
        let src = batch_dir.join(&backup_name);
        let dest = Path::new(&original_path);
        if let Some(parent) = dest.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if fs::rename(&src, dest).is_ok() {
            restored += 1;
        }
    }
    Ok(restored)
}

fn sanitize_filename(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "file".to_string())
}
