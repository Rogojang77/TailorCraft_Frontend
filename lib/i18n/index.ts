export { I18nProvider, useI18n } from './context';
export type { I18nContextValue } from './context';
export type { Locale, Namespace, TranslationKey, I18nConfig } from './types';
export { getTranslation, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './translations';
/** BCP-47 tag for Intl/toLocale*String so dates follow the app language, not a hard-coded one. */
export const dateLocaleTag = (locale: 'en' | 'ro') => (locale === 'ro' ? 'ro-RO' : 'en-GB');
