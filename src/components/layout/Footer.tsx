import { useTranslation } from "react-i18next";

const APP_VERSION = "0.1.0";
const HOMEPAGE_URL = "https://hyot.dev";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      {t("footer", {
        name: t("app.name"),
        nameKo: t("app.nameKo"),
        version: APP_VERSION,
        year,
      })}
      {" · "}
      <a href={HOMEPAGE_URL} target="_blank" rel="noreferrer">
        {t("footerHome")}
      </a>
    </footer>
  );
}
