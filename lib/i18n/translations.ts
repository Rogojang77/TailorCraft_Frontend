/**
 * Load translations and resolve nested keys with interpolation.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const en = require('./translations/en.json') as Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ro = require('./translations/ro.json') as Record<string, unknown>;

export type Locale = 'en' | 'ro';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ro'];
export const DEFAULT_LOCALE: Locale = 'en';

type TranslationRecord = Record<string, unknown>;

const translations: Record<Locale, TranslationRecord> = {
  en: en as TranslationRecord,
  ro: ro as TranslationRecord,
};

function getNested(obj: unknown, path: string): string | undefined {
  if (obj == null || typeof path !== 'string') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(text: string, options?: Record<string, string | number>): string {
  if (!options) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in options ? String(options[key]) : `{{${key}}}`;
  });
}

export function getTranslation(
  locale: Locale,
  key: string,
  options?: Record<string, string | number>
): string {
  const fallbackLocale: Locale = 'en';
  let value = getNested(translations[locale], key);
  if (value === undefined && locale !== fallbackLocale) {
    value = getNested(translations[fallbackLocale], key);
  }
  const text = value ?? key;
  return interpolate(text, options);
}

export function getTranslations(locale: Locale): TranslationRecord {
  return translations[locale] ?? translations[DEFAULT_LOCALE];
}
