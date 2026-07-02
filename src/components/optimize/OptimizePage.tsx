import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import "./OptimizePage.css";

interface StartupItem {
  name: string;
  command: string;
  enabled: boolean;
}

export function OptimizePage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StartupItem[] | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);

  const load = async () => {
    setItems(await invoke<StartupItem[]>("list_startup_items"));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (item: StartupItem) => {
    setBusyName(item.name);
    try {
      await invoke("set_startup_item_enabled", {
        name: item.name,
        command: item.command,
        enable: !item.enabled,
      });
      await load();
    } finally {
      setBusyName(null);
    }
  };

  return (
    <div className="optimize-page">
      <div className="card glass optimize-header">
        <div>
          <h3>{t("optimize.title")}</h3>
          <p>{t("optimize.subtitle")}</p>
        </div>
        <button className="btn-secondary" onClick={load}>
          {t("optimize.refresh")}
        </button>
      </div>

      <div className="card glass optimize-list">
        {items === null && <p className="optimize-empty">{t("optimize.loading")}</p>}
        {items && items.length === 0 && <p className="optimize-empty">{t("optimize.empty")}</p>}
        {items && items.length > 0 && (
          <ul>
            {items.map((item) => (
              <li key={item.name} className="optimize-item">
                <div className="optimize-item-info">
                  <span className="optimize-item-name">{item.name}</span>
                  <span className="optimize-item-command" title={item.command}>
                    {item.command}
                  </span>
                </div>
                <button
                  className={`chip${item.enabled ? " chip-active" : ""}`}
                  onClick={() => toggle(item)}
                  disabled={busyName === item.name}
                >
                  {item.enabled ? t("optimize.enabled") : t("optimize.disabled")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
