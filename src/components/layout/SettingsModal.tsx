import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useMemorySettings } from "../../context/MemorySettingsContext";
import "./SettingsModal.css";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useTheme();
  const { autoClean, threshold, setAutoClean, setThreshold } = useMemorySettings();

  const changeLanguage = (lng: "ko" | "en") => {
    i18n.changeLanguage(lng);
    localStorage.setItem("hyoclean.lang", lng);
  };

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div className="settings-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t("settings.title")}</h2>
          <button className="settings-close" onClick={onClose}>
            {t("settings.close")}
          </button>
        </div>

        <section className="settings-section card">
          <h4>{t("settings.language")}</h4>
          <div className="settings-row">
            <button
              className={`chip${i18n.language === "ko" ? " chip-active" : ""}`}
              onClick={() => changeLanguage("ko")}
            >
              한국어
            </button>
            <button
              className={`chip${i18n.language === "en" ? " chip-active" : ""}`}
              onClick={() => changeLanguage("en")}
            >
              English
            </button>
          </div>
        </section>

        <section className="settings-section card">
          <h4>{t("settings.theme.title")}</h4>
          <div className="settings-row">
            {(["light", "dark", "auto"] as const).map((m) => (
              <button
                key={m}
                className={`chip${mode === m ? " chip-active" : ""}`}
                onClick={() => setMode(m)}
              >
                {t(`settings.theme.${m}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section card">
          <h4>{t("settings.memory.title")}</h4>
          <div className="settings-row">
            <button
              className={`chip${autoClean ? " chip-active" : ""}`}
              onClick={() => setAutoClean(true)}
            >
              {t("settings.memory.autoOn")}
            </button>
            <button
              className={`chip${!autoClean ? " chip-active" : ""}`}
              onClick={() => setAutoClean(false)}
            >
              {t("settings.memory.autoOff")}
            </button>
          </div>
          <label className="settings-slider-wrap">
            <span>
              {t("settings.memory.threshold")}: {threshold}%
            </span>
            <input
              type="range"
              min={5}
              max={40}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              disabled={!autoClean}
            />
          </label>
        </section>
      </div>
    </div>
  );
}
