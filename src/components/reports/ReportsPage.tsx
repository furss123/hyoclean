import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { formatBytes } from "../../hooks/useScan";
import "./ReportsPage.css";

interface CleanHistoryEntry {
  backup_id: string;
  item_count: number;
  total_size_bytes: number;
}

function formatBackupId(backupId: string): string {
  // backup_id looks like "20260702-193000" (%Y%m%d-%H%M%S)
  const match = backupId.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  if (!match) return backupId;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

export function ReportsPage() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<CleanHistoryEntry[] | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const load = async () => {
    setHistory(await invoke<CleanHistoryEntry[]>("list_clean_history"));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async (backupId: string) => {
    await invoke<number>("restore_clean_batch", { backupId });
    setRestoredId(backupId);
    load();
  };

  return (
    <div className="reports-page">
      {history === null && <div className="card glass placeholder-card">{t("scan.scanning")}</div>}
      {history && history.length === 0 && (
        <div className="card glass placeholder-card">{t("reports.empty")}</div>
      )}
      {history && history.length > 0 && (
        <div className="reports-list">
          {history.map((entry) => (
            <div key={entry.backup_id} className="card glass reports-entry">
              <div>
                <div className="reports-entry-date">{formatBackupId(entry.backup_id)}</div>
                <div className="reports-entry-meta">
                  {entry.item_count} {t("reports.items")} ·{" "}
                  {formatBytes(entry.total_size_bytes)}
                </div>
              </div>
              <button className="btn-secondary" onClick={() => handleRestore(entry.backup_id)}>
                {t("reports.restore")}
              </button>
              {restoredId === entry.backup_id && (
                <span className="reports-restored-msg">{t("scan.restored")}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
