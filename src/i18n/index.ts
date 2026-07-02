import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko.json";
import en from "./locales/en.json";

// HyoT apps are Korean-first with a full English parallel — see brand-kit
// "Copy tone" section. Do not hardcode strings in components; add keys here.
i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  lng: localStorage.getItem("hyoclean.lang") || "ko",
  fallbackLng: "ko",
  interpolation: { escapeValue: false },
});

export default i18n;
