import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS } from "@/lib/i18n";

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("tu-lang") || "ar");

  useEffect(() => {
    localStorage.setItem("tu-lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const t = useCallback((key, vars) => {
    let s = STRINGS[lang][key] ?? STRINGS.ar[key] ?? key;
    if (vars && typeof s === "string") Object.entries(vars).forEach(([k, v]) => (s = s.replaceAll(`{${k}}`, v)));
    return s;
  }, [lang]);

  const pick = useCallback((obj) => (obj ? obj[lang] ?? obj.ar : ""), [lang]);
  const errMsg = useCallback((code) => STRINGS[lang].err[code] || (typeof code === "string" && code.length < 120 ? code : STRINGS[lang].err.default), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, pick, errMsg, dir: lang === "ar" ? "rtl" : "ltr" }), [lang, t, pick, errMsg]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
