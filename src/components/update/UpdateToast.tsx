import { useTranslation } from "react-i18next";
import "./UpdateToast.css";

interface UpdateToastProps {
  version: string;
  onOpen: () => void;
}

export function UpdateToast({ version, onOpen }: UpdateToastProps) {
  const { t } = useTranslation();
  return (
    <button className="update-toast glass" onClick={onOpen}>
      {t("update.available", { version })}
    </button>
  );
}
