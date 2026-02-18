/**
 * Localization types and contracts.
 * Implementations (e.g. react-i18next, custom loader) can be added later.
 */

/** Locale code. Supported: 'en' | 'ro'. */
export type Locale = 'en' | 'ro';

/** Namespace for grouping keys (e.g. 'garments', 'common'). */
export type Namespace = string;

/** Full translation key; may include namespace (e.g. 'garments.jacket.size'). */
export type TranslationKey = string;

export interface I18nConfig {
  defaultLocale: Locale;
  supportedLocales: Locale[];
  namespaces?: Namespace[];
}

export interface I18nContextValue {
  /** Current locale. */
  locale: Locale;
  /** Translate key to string. Returns key if translation missing (no implementation yet). */
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  /** Change locale. No-op until implementation. */
  setLocale: (locale: Locale) => void;
}
