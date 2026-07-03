use chrono::Local;
use serde::Serialize;
use std::path::PathBuf;
use walkdir::WalkDir;

/// Trust tier shown in the UI as a colored chip — drives default checkbox state.
/// "safe" is pre-checked, "caution" is unchecked by default, "risky" always
/// requires an explicit opt-in (never included in "select all").
#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Safe,
    Caution,
    Risky,
}

#[derive(Serialize, Clone)]
pub struct ScanItem {
    pub id: String,
    pub path: String,
    pub category: String,
    pub size_bytes: u64,
    pub risk: RiskLevel,
}

#[derive(Serialize, Clone)]
pub struct ScanCategorySummary {
    pub category: String,
    pub item_count: usize,
    pub total_size_bytes: u64,
}

#[derive(Serialize, Clone)]
pub struct ScanResult {
    pub scanned_at: String,
    pub items: Vec<ScanItem>,
    pub categories: Vec<ScanCategorySummary>,
    pub total_size_bytes: u64,
}

/// Candidate directories considered safe-ish to scan for cleanup targets.
/// Each entry maps to a (category, risk) pair used for every file found inside.
fn scan_targets() -> Vec<(PathBuf, &'static str, RiskLevel)> {
    let mut targets = Vec::new();

    if let Ok(temp) = std::env::var("TEMP") {
        targets.push((PathBuf::from(temp), "temp_files", RiskLevel::Safe));
    }
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let base = PathBuf::from(&local_appdata);
        targets.push((
            base.join("Temp"),
            "temp_files",
            RiskLevel::Safe,
        ));
        targets.push((
            base.join("Google/Chrome/User Data/Default/Cache"),
            "browser_cache",
            RiskLevel::Safe,
        ));
        targets.push((
            base.join("Microsoft/Edge/User Data/Default/Cache"),
            "browser_cache",
            RiskLevel::Safe,
        ));
        targets.push((
            base.join("Microsoft/Windows/INetCache"),
            "browser_cache",
            RiskLevel::Caution,
        ));
        targets.push((
            base.join("Microsoft/Windows/WER"),
            "update_leftovers",
            RiskLevel::Caution,
        ));
    }
    if let Ok(windir) = std::env::var("WINDIR") {
        targets.push((
            PathBuf::from(&windir).join("SoftwareDistribution/Download"),
            "update_leftovers",
            RiskLevel::Caution,
        ));
        targets.push((
            PathBuf::from(&windir).join("Temp"),
            "temp_files",
            RiskLevel::Safe,
        ));
        // Crash minidumps: safe to reclaim disk space, but risky to delete
        // blindly since they're the only record of a past BSOD/crash — keep
        // this the one category that always requires an explicit opt-in.
        targets.push((
            PathBuf::from(&windir).join("Minidump"),
            "crash_dumps",
            RiskLevel::Risky,
        ));
    }
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        targets.push((
            PathBuf::from(&local_appdata).join("CrashDumps"),
            "crash_dumps",
            RiskLevel::Risky,
        ));
    }

    targets
}

/// Per-category cap on how many individual file rows are sent to the
/// frontend. Cache/temp folders can easily contain 50k+ tiny files; shipping
/// every single path over IPC and re-rendering them is the main scan-time
/// bottleneck. Totals (count/size) are still accumulated across *all* files
/// found, not just the capped subset — only the detailed row list is capped.
const MAX_ITEMS_PER_CATEGORY: usize = 1500;

/// Deep scan across temp/cache/update-leftover directories. Best-effort:
/// unreadable/permission-denied entries are skipped rather than failing the
/// whole scan (matches CCleaner-style resilience on locked system folders).
#[tauri::command]
pub fn run_deep_scan() -> ScanResult {
    let mut items = Vec::new();
    let mut next_id: u64 = 0;
    let mut category_map: std::collections::HashMap<String, (usize, u64)> =
        std::collections::HashMap::new();
    let mut kept_per_category: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();

    for (root, category, risk) in scan_targets() {
        if !root.exists() {
            continue;
        }
        for entry in WalkDir::new(&root)
            .max_depth(6)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            if size == 0 {
                continue;
            }

            // Always count toward the category total, even once the detail
            // rows for that category are capped, so summaries stay accurate.
            let totals = category_map.entry(category.to_string()).or_insert((0, 0));
            totals.0 += 1;
            totals.1 += size;

            let kept = kept_per_category.entry(category.to_string()).or_insert(0);
            if *kept >= MAX_ITEMS_PER_CATEGORY {
                continue;
            }
            *kept += 1;

            next_id += 1;
            items.push(ScanItem {
                id: next_id.to_string(),
                path: entry.path().to_string_lossy().to_string(),
                category: category.to_string(),
                size_bytes: size,
                risk,
            });
        }
    }

    let categories = category_map
        .into_iter()
        .map(|(category, (item_count, total_size_bytes))| ScanCategorySummary {
            category,
            item_count,
            total_size_bytes,
        })
        .collect::<Vec<_>>();

    let total_size_bytes = categories.iter().map(|c| c.total_size_bytes).sum();

    ScanResult {
        scanned_at: Local::now().to_rfc3339(),
        items,
        categories,
        total_size_bytes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deep_scan_runs_even_when_crash_dump_folders_are_absent() {
        // Real invocation of the production scan path on this machine. Minidump
        // and CrashDumps folders may or may not exist here — either way this
        // must not panic (scan_targets skips missing roots via `root.exists()`).
        let result = run_deep_scan();
        assert!(!result.scanned_at.is_empty());

        // If any crash dumps were actually found, they must be tagged Risky —
        // this is the one tier `selectAllSafe` on the frontend must never
        // auto-include.
        for item in result.items.iter().filter(|i| i.category == "crash_dumps") {
            assert_eq!(item.risk, RiskLevel::Risky, "crash dump items must be Risky");
        }
    }
}
