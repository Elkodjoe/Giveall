import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

// English is the default and the only fully-authored-by-hand source of
// truth; the rest are a professional-quality AI-assisted pass, not a
// native-speaker review — see docs/07-internationalization.md before
// treating any non-English string as final, ship-ready copy.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

export const LANGUAGE_STORAGE_KEY = 'giveall_language_override';

const resources = { en: { translation: en }, es: { translation: es }, fr: { translation: fr }, de: { translation: de }, pt: { translation: pt }, zh: { translation: zh }, ja: { translation: ja } };

/** First supported language matching the device's locale list, else 'en'. */
function detectDeviceLanguage(): LanguageCode {
  const locales = Localization.getLocales();
  for (const l of locales) {
    if (SUPPORTED_CODES.includes(l.languageCode ?? '')) return l.languageCode as LanguageCode;
  }
  return 'en';
}

let initPromise: Promise<void> | null = null;

/**
 * Initializes i18next once: a saved user override wins, otherwise the
 * device locale (falling back to English) — "optional, English default"
 * per the product requirement. Safe to call multiple times; subsequent
 * calls reuse the first init.
 */
export function initI18n(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    let saved: string | null = null;
    try {
      saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // best-effort; falls through to device detection
    }
    const initial = saved && SUPPORTED_CODES.includes(saved) ? saved : detectDeviceLanguage();

    await i18n.use(initReactI18next).init({
      resources,
      lng: initial,
      fallbackLng: 'en',
      interpolation: { escapeValue: false }, // React already escapes
      compatibilityJSON: 'v4',
    });
  })();
  return initPromise;
}

/** Changes the active language and persists the override for next launch. */
export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // best-effort; the in-memory change still applies this session
  }
}

export default i18n;
