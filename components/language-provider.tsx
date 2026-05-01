"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  t as translate,
  type Language,
  type TranslationKey,
} from "@/lib/translations";
import { cn } from "@/lib/utils";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "rapidcleanai_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(storageKey);

    if (isLanguage(storedLanguage)) {
      setLanguageState(storedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key) => translate(language, key),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return context;
}

export function useT() {
  return useLanguage().t;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold uppercase tracking-[0.14em]",
        className,
      )}
      aria-label={t("language_selector")}
    >
      {(["en", "es"] as Language[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          className={cn(
            "rounded-full px-3 py-1.5 transition",
            language === option
              ? "bg-brand-neon text-brand-bg shadow-glow"
              : "text-brand-muted hover:text-white",
          )}
          aria-pressed={language === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
