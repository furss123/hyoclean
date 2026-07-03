import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { useMemorySettings } from "../../context/MemorySettingsContext";
import "./MemoryCard.css";

interface MemoryStatus {
  total_mb: number;
  used_mb: number;
  available_mb: number;
  percent_used: number;
}

// Smart trigger: only auto-clean once free memory stays below this percentage
// (i.e. percent_used above 100 - threshold) for POLL_INTERVAL * SUSTAIN_TICKS.
const POLL_INTERVAL_MS = 2000;
const SUSTAIN_TICKS = 15; // ~30s sustained, matches product spec

export function MemoryCard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const { autoClean, threshold } = useMemorySettings();
  const [lastCleaned, setLastCleaned] = useState<string | null>(null);
  const [reclaimedMb, setReclaimedMb] = useState<number | null>(null);
  const sustainCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await invoke<MemoryStatus>("get_memory_status");
        if (cancelled) return;
        setStatus(result);

        const freePercent = 100 - result.percent_used;
        if (autoClean && freePercent < threshold) {
          sustainCount.current += 1;
          if (sustainCount.current >= SUSTAIN_TICKS) {
            await runClean(result);
            sustainCount.current = 0;
          }
        } else {
          sustainCount.current = 0;
        }
      } catch (e) {
        // Silently ignore in the browser-only dev preview (no Tauri host).
        console.debug("memory status unavailable", e);
      }
    }

    async function runClean(before: MemoryStatus) {
      // Auto-clean must actually reclaim RAM — use aggressive mode (protected
      // and foreground processes are skipped in the Rust layer). Falls back to
      // the conservative re-measure if aggressive mode is unavailable.
      let after: MemoryStatus;
      try {
        after = await invoke<MemoryStatus>("clean_memory_aggressive", { whitelist: [] });
      } catch {
        after = await invoke<MemoryStatus>("clean_memory_now");
      }
      setStatus(after);
      setReclaimedMb(Math.max(0, before.used_mb - after.used_mb));
      setLastCleaned(new Date().toLocaleTimeString());
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [autoClean, threshold]);

  const [deepFreeing, setDeepFreeing] = useState(false);

  const handleCleanNow = async () => {
    if (!status) return;
    const after = await invoke<MemoryStatus>("clean_memory_now");
    setReclaimedMb(Math.max(0, status.used_mb - after.used_mb));
    setStatus(after);
    setLastCleaned(new Date().toLocaleTimeString());
  };

  // Pro "aggressive mode": trims background process working sets to free
  // physical RAM immediately (Windows only; the Rust side skips protected
  // and foreground processes). Falls back gracefully on non-Windows hosts.
  const handleDeepFree = async () => {
    if (!status || deepFreeing) return;
    setDeepFreeing(true);
    try {
      const after = await invoke<MemoryStatus>("clean_memory_aggressive", { whitelist: [] });
      setReclaimedMb(Math.max(0, status.used_mb - after.used_mb));
      setStatus(after);
      setLastCleaned(new Date().toLocaleTimeString());
    } catch (e) {
      console.debug("aggressive clean unavailable", e);
    } finally {
      setDeepFreeing(false);
    }
  };

  const usedPercent = status?.percent_used ?? 0;

  return (
    <div className="card memory-card glass">
      <div className="memory-card-header">
        <h3>{t("dashboard.memoryCard.title")}</h3>
        <span className={`chip${autoClean ? " chip-active" : ""}`}>
          {t("dashboard.memoryCard.autoClean")} {autoClean ? "ON" : "OFF"}
        </span>
      </div>

      <div className="memory-gauge">
        <div className="memory-gauge-readout">
          <span className="memory-gauge-percent">{Math.round(usedPercent)}%</span>
          <span className="memory-gauge-caption">{t("dashboard.memoryCard.inUse")}</span>
        </div>
        <div className="memory-gauge-track">
          <div
            className="memory-gauge-fill"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="memory-gauge-labels">
          <span>{t("dashboard.memoryCard.used")}: {status?.used_mb ?? 0} MB</span>
          <span>{t("dashboard.memoryCard.available")}: {status?.available_mb ?? 0} MB</span>
        </div>
      </div>

      <div className="memory-threshold">{t("dashboard.memoryCard.threshold")}: {threshold}%</div>

      <div className="memory-card-footer">
        <button className="btn-primary" onClick={handleCleanNow}>
          {t("dashboard.memoryCard.cleanNow")}
        </button>
        <button
          className="btn-secondary"
          onClick={handleDeepFree}
          disabled={deepFreeing}
          title={t("dashboard.memoryCard.deepFreeHint")}
        >
          {deepFreeing ? t("dashboard.memoryCard.deepFreeing") : t("dashboard.memoryCard.deepFree")}
        </button>
        {lastCleaned && (
          <span className="memory-last">
            {t("dashboard.memoryCard.lastCleaned")}: {lastCleaned}
            {reclaimedMb != null && ` (${t("dashboard.memoryCard.reclaimed")} ${reclaimedMb} MB)`}
          </span>
        )}
      </div>
    </div>
  );
}
