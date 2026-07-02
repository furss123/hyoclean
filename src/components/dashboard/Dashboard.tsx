import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { MemoryCard } from "./MemoryCard";
import "./Dashboard.css";

interface SystemOverview {
  cpu_percent: number;
  drive: string;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_used_percent: number;
}

const OVERVIEW_POLL_MS = 3000;

export function Dashboard() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<SystemOverview | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        const result = await invoke<SystemOverview>("get_system_overview");
        if (!cancelled) setOverview(result);
      } catch (e) {
        console.debug("system overview unavailable", e);
      }
    };

    loadOverview();
    const id = setInterval(loadOverview, OVERVIEW_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const diskUsage = Math.round(overview?.disk_used_percent ?? 0);
  const cpuUsage = Math.round(overview?.cpu_percent ?? 0);

  return (
    <div className="dashboard">
      <MemoryCard />

      <div className="card storage-card glass">
        <h3>{t("dashboard.storageCard.title")}</h3>
        <div className="dashboard-gauge-track">
          <div className="dashboard-gauge-fill" style={{ width: `${diskUsage}%` }} />
        </div>
        <div className="dashboard-row-meta">
          <span>
            {t("dashboard.storageCard.used")}: {overview?.disk_used_gb ?? 0} GB
          </span>
          <span>{diskUsage}%</span>
        </div>
      </div>

      <div className="card system-card glass">
        <h3>{t("dashboard.systemStatus.title")}</h3>
        <div className="system-stat">
          <div className="dashboard-row-meta">
            <span>{t("dashboard.systemStatus.cpu")}</span>
            <span>{cpuUsage}%</span>
          </div>
          <div className="dashboard-gauge-track">
            <div className="dashboard-gauge-fill cpu" style={{ width: `${cpuUsage}%` }} />
          </div>
        </div>
        <div className="system-stat">
          <div className="dashboard-row-meta">
            <span>{t("dashboard.systemStatus.disk")}</span>
            <span>{diskUsage}%</span>
          </div>
          <div className="dashboard-gauge-track">
            <div className="dashboard-gauge-fill" style={{ width: `${diskUsage}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
