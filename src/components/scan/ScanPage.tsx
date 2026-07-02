import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatBytes, useScan, type ScanItem } from "../../hooks/useScan";
import "./ScanPage.css";

export function ScanPage() {
  const { t } = useTranslation();
  const { result, scanning, cleaning, lastOutcome, runScan, cleanItems, restore } = useScan();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoredMsg, setRestoredMsg] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!result) return {} as Record<string, ScanItem[]>;
    return result.items.reduce<Record<string, ScanItem[]>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});
  }, [result]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSafe = () => {
    if (!result) return;
    setSelected(new Set(result.items.filter((i) => i.risk === "safe").map((i) => i.id)));
  };

  const deselectAll = () => setSelected(new Set());

  const handleClean = async () => {
    if (!result) return;
    const paths = result.items.filter((i) => selected.has(i.id)).map((i) => i.path);
    if (paths.length === 0) return;
    await cleanItems(paths);
    setSelected(new Set());
  };

  const handleRestore = async () => {
    if (!lastOutcome) return;
    const count = await restore(lastOutcome.backup_id);
    setRestoredMsg(`${t("scan.restored")} (${count})`);
  };

  const selectedSize = result
    ? result.items.filter((i) => selected.has(i.id)).reduce((sum, i) => sum + i.size_bytes, 0)
    : 0;

  return (
    <div className="scan-page">
      <div className="card glass scan-toolbar">
        <button className="btn-primary" onClick={runScan} disabled={scanning}>
          {scanning ? t("scan.scanning") : t("scan.runScan")}
        </button>
        {result && (
          <span className="scan-total">
            {t("scan.totalFound")}: {formatBytes(result.total_size_bytes)}
          </span>
        )}
      </div>

      {!result && !scanning && (
        <div className="card glass placeholder-card">{t("scan.noResults")}</div>
      )}

      {result && (
        <>
          <div className="card glass scan-categories">
            {result.categories.map((c) => (
              <div key={c.category} className="scan-category-chip">
                <span>{t(`scan.category.${c.category}`, c.category)}</span>
                <span className="scan-category-size">{formatBytes(c.total_size_bytes)}</span>
              </div>
            ))}
          </div>

          <div className="card glass scan-actions-bar">
            <button className="btn-secondary" onClick={selectAllSafe}>
              {t("scan.selectAllSafe")}
            </button>
            <button className="btn-secondary" onClick={deselectAll}>
              {t("scan.deselectAll")}
            </button>
            <span className="scan-selected-size">{formatBytes(selectedSize)}</span>
            <button
              className="btn-primary"
              onClick={handleClean}
              disabled={cleaning || selected.size === 0}
            >
              {cleaning ? t("scan.cleaning") : t("scan.cleanSelected")}
            </button>
          </div>

          <div className="scan-list">
            {Object.entries(groups).map(([category, items]) => {
              const summary = result.categories.find((c) => c.category === category);
              const shownCount = Math.min(items.length, 200);
              const truncated = summary ? summary.item_count > shownCount : false;
              return (
                <div key={category} className="card glass scan-group">
                  <h4>
                    {t(`scan.category.${category}`, category)}
                    {truncated && (
                      <span className="scan-group-truncated">
                        {" "}
                        ({t("scan.showingTopItems", { count: shownCount })})
                      </span>
                    )}
                  </h4>
                  <ul>
                    {items.slice(0, 200).map((item) => (
                      <li key={item.id} className="scan-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggle(item.id)}
                          />
                          <span className="scan-item-path" title={item.path}>
                            {item.path}
                          </span>
                        </label>
                        <span className={`chip risk-${item.risk}`}>
                          {t(`scan.risk.${item.risk}`)}
                        </span>
                        <span className="scan-item-size">{formatBytes(item.size_bytes)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}

      {lastOutcome && (
        <div className="card glass scan-outcome">
          <h4>{t("scan.cleanDone")}</h4>
          <p>
            {t("scan.reclaimed")}: {formatBytes(lastOutcome.reclaimed_bytes)} ·{" "}
            {t("scan.failed")}: {lastOutcome.failed_count}
          </p>
          <button className="btn-secondary" onClick={handleRestore}>
            {t("scan.restore")}
          </button>
          {restoredMsg && <span className="scan-restored-msg">{restoredMsg}</span>}
        </div>
      )}
    </div>
  );
}
