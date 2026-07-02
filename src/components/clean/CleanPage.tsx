import { useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { formatBytes, type CleanOutcome, type ScanResult } from "../../hooks/useScan";
import "./CleanPage.css";

/// "스마트 정리": one-click flow that scans then immediately cleans only
/// safe-rated items — the automated counterpart to the manual Scan page.
export function CleanPage() {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<CleanOutcome | null>(null);
  const [restoredMsg, setRestoredMsg] = useState<string | null>(null);

  const runQuickClean = async () => {
    setRunning(true);
    setRestoredMsg(null);
    try {
      const scan = await invoke<ScanResult>("run_deep_scan");
      const safePaths = scan.items.filter((i) => i.risk === "safe").map((i) => i.path);
      if (safePaths.length === 0) {
        setOutcome({
          cleaned_count: 0,
          failed_count: 0,
          reclaimed_bytes: 0,
          backup_id: "",
          failed_paths: [],
        });
        return;
      }
      const result = await invoke<CleanOutcome>("clean_selected_items", { paths: safePaths });
      setOutcome(result);
    } finally {
      setRunning(false);
    }
  };

  const handleRestore = async () => {
    if (!outcome?.backup_id) return;
    const count = await invoke<number>("restore_clean_batch", { backupId: outcome.backup_id });
    setRestoredMsg(`${t("scan.restored")} (${count})`);
  };

  return (
    <div className="clean-page">
      <div className="card glass clean-hero">
        <h3>{t("clean.title")}</h3>
        <p>{t("clean.subtitle")}</p>
        <button className="btn-primary" onClick={runQuickClean} disabled={running}>
          {running ? t("scan.cleaning") : t("clean.quickClean")}
        </button>
      </div>

      <div className="card glass clean-result">
        <h4>{t("clean.lastRun")}</h4>
        {!outcome ? (
          <p className="clean-empty">{t("clean.noRun")}</p>
        ) : (
          <>
            <p>
              {t("scan.reclaimed")}: {formatBytes(outcome.reclaimed_bytes)} ·{" "}
              {t("scan.failed")}: {outcome.failed_count}
            </p>
            {outcome.backup_id && (
              <button className="btn-secondary" onClick={handleRestore}>
                {t("scan.restore")}
              </button>
            )}
            {restoredMsg && <span className="clean-restored-msg">{restoredMsg}</span>}
          </>
        )}
      </div>
    </div>
  );
}
