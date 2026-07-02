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
      // Drop cleaned items from the current result so the list reflects reality.
      if (result) {
        const cleanedSet = new Set(paths.filter((p) => !outcome.failed_paths.includes(p)));
        setResult({
          ...result,
          items: result.items.filter((i) => !cleanedSet.has(i.path)),
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
