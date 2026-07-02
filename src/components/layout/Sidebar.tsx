import { useTranslation } from "react-i18next";
import "./Sidebar.css";

export type NavKey =
  | "dashboard"
  | "scan"
  | "clean"
  | "optimize"
  | "privacy"
  | "tools"
  | "reports"
  | "settings";

const NAV_ITEMS: { key: NavKey; icon: string }[] = [
  { key: "dashboard", icon: "🏠" },
  { key: "scan", icon: "🔍" },
  { key: "clean", icon: "🧹" },
  { key: "optimize", icon: "⚡" },
  { key: "privacy", icon: "🛡️" },
  { key: "tools", icon: "🛠️" },
  { key: "reports", icon: "📊" },
];

interface SidebarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ active, onNavigate, onOpenSettings }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <nav className="sidebar glass">
      <div className="sidebar-brand">
        <span className="sidebar-brand-dot" />
        <span className="sidebar-brand-name">{t("app.name")}</span>
      </div>

      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.key}>
            <button
              className={`sidebar-nav-item${active === item.key ? " active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{t(`nav.${item.key}`)}</span>
            </button>
          </li>
        ))}
      </ul>

      <button className="sidebar-nav-item sidebar-settings" onClick={onOpenSettings}>
        <span className="sidebar-nav-icon">⚙️</span>
        <span>{t("nav.settings")}</span>
      </button>
    </nav>
  );
}
