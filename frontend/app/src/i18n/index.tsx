import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import translations, { type Lang } from "./translations";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "ru",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("salyq_language");
    if (saved === "ru" || saved === "en" || saved === "kz") return saved;
    return "ru";
  });

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("salyq_language", l);
  }

  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem("salyq_language");
      if (saved === "ru" || saved === "en" || saved === "kz") {
        setLangState(saved);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function t(key: string): string {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.ru || key;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export type { Lang };
