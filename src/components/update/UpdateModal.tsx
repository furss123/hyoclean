import { useTranslation } from "react-i18next";
import "./UpdateModal.css";

interface UpdateModalProps {
  version: string;
  notesKo: string;
  notesEn: string;
  onUpdateNow: () => void;
  onLater: () => void;
  onSkip: () => void;
}

/// The accept/decline surface for the auto-update flow confirmed with the
/// user: toast + badge -> this modal with release notes -> 지금/나중에/건너뛰기.
export function UpdateModal({
  version,
  notesKo,
  notesEn,
  onUpdateNow,
  onLater,
  onSkip,
}: UpdateModalProps) {
  const { t, i18n } = useTranslation();
  const notes = i18n.language === "ko" ? notesKo : notesEn;

  return (
    <div className="update-backdrop">
      <div className="update-modal glass">
        <h3>{t("update.available", { version })}</h3>
        {notes && (
          <div className="update-notes">
            <h4>{t("update.releaseNotes")}</h4>
            <p>{notes}</p>
          </div>
        )}
        <div className="update-actions">
          <button className="btn-primary" onClick={onUpdateNow}>
            {t("update.updateNow")}
          </button>
          <button className="btn-secondary" onClick={onLater}>
            {t("update.later")}
          </button>
          <button className="btn-secondary" onClick={onSkip}>
            {t("update.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
