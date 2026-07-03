import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface ScanItem {
  id: string;
  path: string;
  category: string;
  size_bytes: number;
  risk: "safe" | "caution" | "risky";
}

export interface ScanCategorySummary {
  category: string;
  item_count: number;
  total_size_bytes: number;
}

export interface ScanResult {
  scanned_at: string;
  items: ScanItem[];
  categories: ScanCategorySummary[];
  total_size_bytes: number;
}

export interface CleanOutcome {
  cleaned_count: number;
  failed_count: number;
  reclaimed_bytes: number;
  backup_id: string;
  failed_paths: string[];
}

export function useScan() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [lastOutcome, setLastOutcome] = useState<CleanOutcome | null>(null);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await invoke<ScanResult>("run_deep_scan");
      setResult(res);
      setLastOutcome(null);
    } finally {
      setScanning(false);
    }
  };

  const cleanItems = async (paths: string[]) => {
    setCleaning(true);
    try {
      const outcome = await invoke<CleanOutcome>("clean_selected_items", { paths });
      setLastOutcome(outcome);
      // Drop cleaned items from the current result and roll their size/count
      // back out of the category summaries and grand total — otherwise those
      // figures stay stuck at pre-clean values (scan totals reflect every file
      // found, not just the capped rows kept in `items`, so we adjust by delta
      // instead of recomputing summaries from the item list).
      if (result) {
        const cleanedSet = new Set(paths.filter((p) => !outcome.failed_paths.includes(p)));
        const removedItems = result.items.filter((i) => cleanedSet.has(i.path));
        const deltaByCategory = new Map<string, { count: number; size: number }>();
        for (const item of removedItems) {
          const delta = deltaByCategory.get(item.category) ?? { count: 0, size: 0 };
          delta.count += 1;
          delta.size += item.size_bytes;
          deltaByCategory.set(item.category, delta);
        }
        const removedBytes = removedItems.reduce((sum, i) => sum + i.size_bytes, 0);

        setResult({
          ...result,
          items: result.items.filter((i) => !cleanedSet.has(i.path)),
          categories: result.categories.map((c) => {
            const delta = deltaByCategory.get(c.category);
            if (!delta) return c;
            return {
              ...c,
              item_count: Math.max(0, c.item_count - delta.count),
              total_size_bytes: Math.max(0, c.total_size_bytes - delta.size),
            };
          }),
          total_size_bytes: Math.max(0, result.total_size_bytes - removedBytes),
        });
      }
      return outcome;
    } finally {
      setCleaning(false);
    }
  };

  const restore = async (backupId: string) => {
    return invoke<number>("restore_clean_batch", { backupId });
  };

  return { result, scanning, cleaning, lastOutcome, runScan, cleanItems, restore };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
