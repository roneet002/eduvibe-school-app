import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { storage } from "@/src/utils/storage";

export type Language = "EN" | "HI";

type LanguageContextValue = {
  language: Language;
  toggle: () => void;
  t: (en: string, hi: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const KEY = "eduvibe-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("EN");

  useEffect(() => {
    storage.getItem<Language>(KEY, "EN").then((v) => v && setLanguage(v));
  }, []);

  const toggle = useCallback(() => {
    setLanguage((prev) => {
      const next: Language = prev === "EN" ? "HI" : "EN";
      void storage.setItem(KEY, next);
      return next;
    });
  }, []);

  const t = useCallback((en: string, hi: string) => (language === "EN" ? en : hi), [language]);

  const value = useMemo(() => ({ language, toggle, t }), [language, toggle, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
