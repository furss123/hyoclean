use serde::Serialize;
use std::fs;
use winreg::enums::*;
use winreg::RegKey;

use crate::scan::{RiskLevel, ScanCategorySummary, ScanItem, ScanResult};

const RUN_MRU_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU";

/// Privacy-focused scan: Windows "Recent Items" shortcuts and Explorer's
/// "Run" dialog history (RunMRU). Kept separate from `run_deep_scan` because
/// these are usage-trace artifacts, not disk-space junk.
#[tauri::command]
pub fn run_privacy_scan() -> ScanResult {
    let mut items = Vec::new();
    let mut next_id: u64 = 0;

    if let Ok(appdata) = std::env::var("APPDATA") {
        let recent = std::path::PathBuf::from(appdata).join("Microsoft/Windows/Recent");
        if let Ok(entries) = fs::read_dir(&recent) {
            for entry in entries.filter_map(|e| e.ok()) {
                let Ok(meta) = entry.metadata() else { continue };
                if !meta.is_file() {
                    continue;
                }
                next_id += 1;
                items.push(ScanItem {
                    id: next_id.to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                    category: "recent_docs".to_string(),
                    size_bytes: meta.len(),
                    risk: RiskLevel::Safe,
                });
            }
        }
    }

    let run_mru_count = run_mru_entry_count();
    if run_mru_count > 0 {
        items.push(ScanItem {
            id: "run-mru".to_string(),
            path: format!(r"HKCU\{RUN_MRU_KEY}"),
            category: "run_history".to_string(),
            size_bytes: run_mru_count as u64, // entry count, shown as-is (not bytes)
            risk: RiskLevel::Caution,
        });
    }

    let mut category_map: std::collections::HashMap<String, (usize, u64)> =
        std::collections::HashMap::new();
    for item in &items {
        let entry = category_map.entry(item.category.clone()).or_insert((0, 0));
        entry.0 += 1;
        entry.1 += item.size_bytes;
    }
    let categories = category_map
        .into_iter()
        .map(|(category, (item_count, total_size_bytes))| ScanCategorySummary {
            category,
            item_count,
            total_size_bytes,
        })
        .collect();

    ScanResult {
        scanned_at: chrono::Local::now().to_rfc3339(),
        total_size_bytes: items.iter().map(|i| i.size_bytes).sum(),
        items,
        categories,
    }
}

fn run_mru_entry_count() -> usize {
    RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(RUN_MRU_KEY)
        .map(|k| k.enum_values().filter_map(|v| v.ok()).count())
        .unwrap_or(0)
}

#[derive(Serialize, Clone)]
pub struct PrivacyClearOutcome {
    pub cleared_entries: usize,
}

/// Clears every value under Explorer's RunMRU key (Win+R history).
#[tauri::command]
pub fn clear_run_history() -> Result<PrivacyClearOutcome, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu
        .open_subkey_with_flags(RUN_MRU_KEY, KEY_ALL_ACCESS)
        .map_err(|e| e.to_string())?;

    let names: Vec<String> = key
        .enum_values()
        .filter_map(|v| v.ok())
        .map(|(n, _)| n)
        .collect();
    let mut cleared = 0usize;
    for name in names {
        if key.delete_value(&name).is_ok() {
            cleared += 1;
        }
    }
    Ok(PrivacyClearOutcome {
        cleared_entries: cleared,
    })
}
