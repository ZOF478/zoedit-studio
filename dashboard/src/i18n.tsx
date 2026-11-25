import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'ar' | 'en';

interface I18nValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  setLang: (lang: Lang) => void;
  t: (ar: string, en: string) => string;
}

const STORAGE_KEY = 'zoedit-studio-lang';

const SITE_TITLES: Record<Lang, string> = {
  ar: 'Zoedit Studio — استوديو الموشن جرافيك بمساعدة الذكاء الاصطناعي',
  en: 'Zoedit Studio — AI-Directed Motion Graphics Studio',
};

const SITE_DESCRIPTIONS: Record<Lang, string> = {
  ar: 'استوديو موشن جرافيك ذكي يكتب مشاهد Remotion مخصصة بالكود، مع تعليق صوتي عبر ElevenLabs وترجمة متزامنة وتأطير آمن لمنصات الفيديو.',
  en: 'An AI-directed motion graphics studio that writes bespoke Remotion scene code, with ElevenLabs voiceover, synced captions, and platform-safe framing.',
};

const I18nContext = createContext<I18nValue | null>(null);

function readInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'ar';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = SITE_TITLES[lang];
    const description = SITE_DESCRIPTIONS[lang];
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', SITE_TITLES[lang]);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute('content', description);
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const isRtl = lang === 'ar';
    return {
      lang,
      dir: isRtl ? 'rtl' : 'ltr',
      isRtl,
      setLang,
      t: (ar: string, en: string) => (isRtl ? ar : en),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
