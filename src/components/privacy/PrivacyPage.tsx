import { useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useScan, formatBytes, type ScanResult } from "../../hooks/useScan";
import "./PrivacyPage.css";

export function PrivacyPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [clearedMsg, setClearedMsg] = useState<string | null>(null);
  const { cleanItems, cleaning } = useScan();

  const handleScan = async () => {
    setScanning(true);
    setClearedMsg(null);
    try {
      const res = await invoke<ScanResult>("run_privacy_scan");
      setResult(res);
    } finally {
      setScanning(false);
    }
  };

  const handleClearRunHistory = async () => {
    const outcome = await invoke<{ cleared_entries: number }>("clear_run_history");
    setClearedMsg(`${outcome.cleared_entries}${t("privacy.cleared")}`);
    handleScan();
  };

  const handleCleanRecentDocs = async () => {
    if (!result) return;
    const paths = result.items.filter((i) => i.category === "recent_docs").map((i) => i.path);
    if (paths.length > 0) {
      await cleanItems(paths);
      handleScan();
    }
  };

  return (
    <div className="privacy-page">
      <div className="card glass privacy-toolbar">
        <button className="btn-primary" onClick={handleScan} disabled={scanning}>
          {t("privacy.runScan")}
        </button>
        <button className="btn-secondary" onClick={handleClearRunHistory}>
          {t("privacy.clearRunHistory")}
        </button>
        {clearedMsg && <span className="privacy-cleared-msg">{clearedMsg}</span>}
      </div>

      {result && (
        <div className="card glass privacy-results">
          {result.categories.map((c) => (
            <div key={c.category} className="privacy-category">
              <div className="privacy-category-header">
                <span>{t(`privacy.category.${c.category}`, c.category)}</span>
                <span>
                  {c.category === "run_history"
                    ? `${c.total_size_bytes}`
                    : formatBytes(c.total_size_bytes)}
                </span>
              </div>
              {c.category === "recent_docs" && (
                <button
                  className="btn-secondary"
                  onClick={handleCleanRecentDocs}
                  disabled={cleaning}
                >
                  {t("scan.cleanSelected")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
