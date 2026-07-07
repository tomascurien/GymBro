import React, { createContext, useContext, useState } from 'react';
import translations from './translations';

const STORAGE_KEY = 'forma-lang';

const detectLang = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
};

const I18nContext = createContext({
  lang: 'es',
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
  locale: 'es-ES',
});

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(detectLang);

  const setLang = (next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  };

  const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es');

  // t('feed.postCount', { count: 3 }) → "3 publicaciones"
  const t = (key, vars) => {
    let str = translations[lang][key] ?? translations.es[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replaceAll(`{${k}}`, v);
      });
    }
    return str;
  };

  const locale = lang === 'es' ? 'es-ES' : 'en-US';

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, locale }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
