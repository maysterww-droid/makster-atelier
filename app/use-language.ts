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

export function useMaksterLanguage() {
  const lang = useSyncExternalStore(
    (onChange) => {
      const notify = () => onChange();
      window.addEventListener("storage", notify);
      window.addEventListener("makster-language-change", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("makster-language-change", notify);
      };
    },
    () => {
      const saved = window.localStorage.getItem("makster-language") as Lang | null;
      return saved && languages.some((item) => item.code === saved) ? saved : "cs";
    },
    () => "cs" as Lang,
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
