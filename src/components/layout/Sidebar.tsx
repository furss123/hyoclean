import { useTranslation } from "react-i18next";
import { APP_VERSION } from "../../version";
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
        <span className="sidebar-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 512 512" width="100%" height="100%">
            <defs>
              <linearGradient id="sbMark" x1="40" y1="40" x2="472" y2="472" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4A9FE0" />
                <stop offset="1" stopColor="#2B7CC7" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="113" fill="url(#sbMark)" />
            <path
              d="M256 101 Q281 231 411 256 Q281 281 256 411 Q231 281 101 256 Q231 231 256 101 Z"
              fill="#FFFFFF"
            />
          </svg>
        </span>
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

      <div className="sidebar-version">v{APP_VERSION}</div>
    </nav>
  );
}
