import { useTranslation } from "react-i18next";
import "./Sidebar.css";

const APP_VERSION = "0.1.0";

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
              <linearGradient id="sbMark" x1="72" y1="56" x2="440" y2="456" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4A9FE0" />
                <stop offset="0.55" stopColor="#2B7CC7" />
                <stop offset="1" stopColor="#2A9B8A" />
              </linearGradient>
            </defs>
            <rect x="32" y="32" width="448" height="448" rx="116" fill="url(#sbMark)" />
            <path d="M242 122 Q272 226 380 256 Q272 286 242 390 Q212 286 104 256 Q212 226 242 122 Z" fill="#FFFFFF" />
            <path d="M374 128 Q385 168 424 180 Q385 192 374 232 Q363 192 324 180 Q363 168 374 128 Z" fill="#FFFFFF" fillOpacity="0.9" />
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
