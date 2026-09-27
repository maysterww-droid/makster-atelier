"use client";

import { useEffect, useSyncExternalStore } from "react";
import { languages, type Lang } from "./content";

const htmlLanguages: Record<Lang, string> = {
  ru: "ru",
  ua: "uk",
  cs: "cs",
  en: "en",
  pl: "pl",
  de: "de",
};

const systemLanguages: Record<string, Lang> = {
  ru: "ru",
  uk: "ua",
  ua: "ua",
  cs: "cs",
  en: "en",
  pl: "pl",
  de: "de",
};

function isSupportedLanguage(value: string | null): value is Lang {
  return Boolean(value && languages.some((item) => item.code === value));
}

function detectSystemLanguage(): Lang {
  const preferred = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const value of preferred) {
    const baseLanguage = value.toLowerCase().split("-")[0];
    const match = systemLanguages[baseLanguage];
    if (match) return match;
  }

  return "en";
}

function getLanguageSnapshot(): Lang {
  const saved = window.localStorage.getItem("makster-language");
  return isSupportedLanguage(saved) ? saved : detectSystemLanguage();
}

export function useMaksterLanguage() {
  const lang = useSyncExternalStore(
    (onChange) => {
      const notify = () => onChange();
      window.addEventListener("storage", notify);
      window.addEventListener("languagechange", notify);
      window.addEventListener("makster-language-change", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("languagechange", notify);
        window.removeEventListener("makster-language-change", notify);
      };
    },
    getLanguageSnapshot,
    () => "en" as Lang,
  );

  useEffect(() => {
    document.documentElement.lang = htmlLanguages[lang];
  }, [lang]);

  const changeLanguage = (value: Lang) => {
    window.localStorage.setItem("makster-language", value);
    window.dispatchEvent(new Event("makster-language-change"));
  };

  return { lang, changeLanguage };
}
