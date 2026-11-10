import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi }
};

const savedLanguage = localStorage.getItem('sanjeevni_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export const changeLanguage = (lng: string) => {
  localStorage.setItem('sanjeevni_language', lng);
  i18n.changeLanguage(lng);
};

export default i18n;
