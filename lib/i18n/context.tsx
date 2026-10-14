/**
 * I18n context — loads translations, persists locale, provides t() and setLocale.
 * Uses AsyncStorage so the selected language survives app restarts reliably.
 */

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, updateLocale } from '@/lib/services/authService';
import type { Locale, TranslationKey } from './types';
import {
  getTranslation,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from './translations';

const LOCALE_STORAGE_KEY = '@tailorcraft/locale';

export interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  isLocaleReady: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function normalizeLocale(value: string | null): Locale {
  if (value === 'en' || value === 'ro') return value;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken, user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isLocaleReady, setIsLocaleReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const next = normalizeLocale(stored);
        setLocaleState(next);
      })
      .catch(() => {
        if (!cancelled) setLocaleState(DEFAULT_LOCALE);
      })
      .finally(() => {
        if (!cancelled) setIsLocaleReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    let cancelled = false;

    const syncLocaleFromBackend = async () => {
      try {
        const userLocale = user?.locale;
        const backendLocale =
          userLocale === 'en' || userLocale === 'ro'
            ? userLocale
            : (await getCurrentUser(accessToken)).locale;
        const normalized = normalizeLocale(backendLocale ?? null);
        if (cancelled) return;
        setLocaleState(normalized);
        AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalized).catch(() => {});
      } catch (error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[i18n] Failed to sync locale from backend:', error);
        }
      }
    };

    void syncLocaleFromBackend();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken, user?.locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const normalized = normalizeLocale(next);
      if (!SUPPORTED_LOCALES.includes(normalized)) return;

      setLocaleState(normalized);
      AsyncStorage.setItem(LOCALE_STORAGE_KEY, normalized).catch(() => {});

      if (!isAuthenticated || !accessToken) return;
      void updateLocale(accessToken, normalized).catch((error) => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[i18n] Failed to persist locale to backend:', error);
        }
      });
    },
    [isAuthenticated, accessToken]
  );

  const t = useCallback(
    (key: TranslationKey, options?: Record<string, string | number>) => {
      return getTranslation(locale, key, options);
    },
    [locale]
  );

  const value: I18nContextValue = {
    locale,
    t,
    setLocale,
    isLocaleReady,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === undefined) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
