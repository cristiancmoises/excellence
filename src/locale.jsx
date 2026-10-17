import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { languageUrl, resolveLanguage, translate } from "./i18n.mjs";

export const LocaleContext = createContext({ language: "en", t: (key, values) => translate(key, "en", values) });
export const useLocale = () => useContext(LocaleContext);

export function LocaleProvider({ children }) {
  const [language, setLanguage] = useState(() => resolveLanguage(window.location.search));
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "pt-BR" ? "Excellence • Planilhas livres" : "Excellence • Free spreadsheets";
    document.querySelector('meta[name="description"]')?.setAttribute("content", language === "pt-BR" ? "Excellence: planilhas livres, do seu jeito." : "Excellence: free spreadsheets, your way.");
  }, [language]);
  useEffect(() => {
    const changed = () => setLanguage(resolveLanguage(window.location.search));
    window.addEventListener("popstate", changed);
    return () => window.removeEventListener("popstate", changed);
  }, []);
  const value = useMemo(() => ({
    language,
    t: (key, values) => translate(key, language, values),
    setLanguage(next) {
      const supported = next === "pt-BR" ? "pt-BR" : "en";
      history.replaceState(null, "", languageUrl(location.href, supported));
      setLanguage(supported);
    },
  }), [language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function LanguagePicker() {
  const { language, setLanguage } = useLocale();
  return <select className="language-picker" aria-label="Language / Idioma" value={language} onChange={(event) => setLanguage(event.target.value)}>
    <option value="en" lang="en">English</option>
    <option value="pt-BR" lang="pt-BR">Português</option>
  </select>;
}
