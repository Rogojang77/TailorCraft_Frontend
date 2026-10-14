/**
 * Global app settings (measurement unit, phone default, etc.) with persistent storage.
 * Persisted via AsyncStorage; changes apply immediately across the app.
 */

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNIT_REGISTRY } from '@/constants/units';

export type PreferredUnit = string;
export type PreferredCurrency = string;

const STORAGE_KEY_UNIT = '@tailorcraft/preferredUnit';
const STORAGE_KEY_DEFAULT_PHONE_PREFIX = '@tailorcraft/defaultPhonePrefix';
const STORAGE_KEY_SHOW_DEADLINE_BAR = '@tailorcraft/showDeadlineBar';
const STORAGE_KEY_SHOW_RECENT_ORDERS = '@tailorcraft/showRecentOrders';
const STORAGE_KEY_PREFERRED_CURRENCY = '@tailorcraft/preferredCurrency';

/** Fallback when validating stored unit; API provides full list. */
export const PREFERRED_UNIT_OPTIONS: PreferredUnit[] = ['cm', 'inch', 'm', 'mm', 'ft', 'yd'];
export const PREFERRED_CURRENCY_OPTIONS: PreferredCurrency[] = [
  'RON', 'EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF',
  'BGN', 'TRY', 'RSD', 'UAH', 'MDL', 'RUB', 'AED', 'SAR', 'QAR', 'KWD', 'BHD',
  'OMR', 'JOD', 'ILS', 'EGP', 'MAD', 'TND', 'ZAR', 'NGN', 'KES', 'GHS', 'INR',
  'PKR', 'BDT', 'LKR', 'NPR', 'CNY', 'JPY', 'KRW', 'HKD', 'SGD', 'MYR', 'THB',
  'IDR', 'PHP', 'VND', 'AUD', 'NZD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP',
  'PEN', 'UYU',
];

export const DEFAULT_SHOW_DEADLINE_BAR = true;
export const DEFAULT_SHOW_RECENT_ORDERS = true;

// Common phone prefixes
export const PHONE_PREFIX_OPTIONS = [
  { value: '', label: 'None' },
  { value: '+40', label: 'Romania (+40)' },
  { value: '+1', label: 'USA/Canada (+1)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+61', label: 'Australia (+61)' },
  { value: '+64', label: 'New Zealand (+64)' },
  { value: '+31', label: 'Netherlands (+31)' },
  { value: '+32', label: 'Belgium (+32)' },
  { value: '+49', label: 'Germany (+49)' },
  { value: '+43', label: 'Austria (+43)' },
  { value: '+41', label: 'Switzerland (+41)' },
  { value: '+46', label: 'Sweden (+46)' },
  { value: '+47', label: 'Norway (+47)' },
  { value: '+45', label: 'Denmark (+45)' },
  { value: '+48', label: 'Poland (+48)' },
  { value: '+420', label: 'Czechia (+420)' },
  { value: '+36', label: 'Hungary (+36)' },
  { value: '+359', label: 'Bulgaria (+359)' },
  { value: '+30', label: 'Greece (+30)' },
  { value: '+351', label: 'Portugal (+351)' },
  { value: '+33', label: 'France (+33)' },
  { value: '+39', label: 'Italy (+39)' },
  { value: '+34', label: 'Spain (+34)' },
  { value: '+90', label: 'Turkey (+90)' },
  { value: '+381', label: 'Serbia (+381)' },
  { value: '+380', label: 'Ukraine (+380)' },
  { value: '+373', label: 'Moldova (+373)' },
  { value: '+7', label: 'Russia/Kazakhstan (+7)' },
  { value: '+91', label: 'India (+91)' },
  { value: '+92', label: 'Pakistan (+92)' },
  { value: '+880', label: 'Bangladesh (+880)' },
  { value: '+86', label: 'China (+86)' },
  { value: '+81', label: 'Japan (+81)' },
  { value: '+82', label: 'South Korea (+82)' },
  { value: '+65', label: 'Singapore (+65)' },
  { value: '+60', label: 'Malaysia (+60)' },
  { value: '+66', label: 'Thailand (+66)' },
  { value: '+62', label: 'Indonesia (+62)' },
  { value: '+63', label: 'Philippines (+63)' },
  { value: '+84', label: 'Vietnam (+84)' },
  { value: '+971', label: 'UAE (+971)' },
  { value: '+966', label: 'Saudi Arabia (+966)' },
  { value: '+972', label: 'Israel (+972)' },
  { value: '+20', label: 'Egypt (+20)' },
  { value: '+212', label: 'Morocco (+212)' },
  { value: '+27', label: 'South Africa (+27)' },
  { value: '+234', label: 'Nigeria (+234)' },
  { value: '+254', label: 'Kenya (+254)' },
  { value: '+55', label: 'Brazil (+55)' },
  { value: '+54', label: 'Argentina (+54)' },
  { value: '+56', label: 'Chile (+56)' },
  { value: '+57', label: 'Colombia (+57)' },
  { value: '+51', label: 'Peru (+51)' },
  { value: '+52', label: 'Mexico (+52)' },
] as const;

export type PhonePrefix = typeof PHONE_PREFIX_OPTIONS[number]['value'];

function normalizeUnit(value: string | null): PreferredUnit {
  if (value === null) return 'cm';
  const normalized = value.trim().toLowerCase();
  if (PREFERRED_UNIT_OPTIONS.includes(normalized)) return normalized;
  if (UNIT_REGISTRY[normalized]) return normalized;
  return 'cm';
}

function normalizePhonePrefix(value: string | null): PhonePrefix {
  if (value === null) return '';
  if (value === '') return '';
  if (/^\+\d+$/.test(value) || PHONE_PREFIX_OPTIONS.some((p) => p.value === value)) return value as PhonePrefix;
  return '';
}

function normalizeCurrency(value: string | null): PreferredCurrency {
  if (value === null) return 'RON';
  const normalized = value.trim().toUpperCase();
  if (PREFERRED_CURRENCY_OPTIONS.includes(normalized)) return normalized;
  if (/^[A-Z]{3}$/.test(normalized)) return normalized;
  return 'RON';
}

function normalizeShowDeadlineBar(value: string | null): boolean {
  if (value === null) return DEFAULT_SHOW_DEADLINE_BAR;
  return value === 'true';
}

function normalizeShowRecentOrders(value: string | null): boolean {
  if (value === null) return DEFAULT_SHOW_RECENT_ORDERS;
  return value === 'true';
}

export interface SettingsContextValue {
  preferredUnit: PreferredUnit;
  setPreferredUnit: (unit: PreferredUnit) => void;
  preferredCurrency: PreferredCurrency;
  setPreferredCurrency: (currency: PreferredCurrency) => void;
  defaultPhonePrefix: PhonePrefix;
  setDefaultPhonePrefix: (prefix: PhonePrefix) => void;
  showDeadlineBar: boolean;
  setShowDeadlineBar: (show: boolean) => void;
  showRecentOrders: boolean;
  setShowRecentOrders: (show: boolean) => void;
  isSettingsReady: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [preferredUnit, setPreferredUnitState] = useState<PreferredUnit>('cm');
  const [preferredCurrency, setPreferredCurrencyState] = useState<PreferredCurrency>('RON');
  const [defaultPhonePrefix, setDefaultPhonePrefixState] = useState<PhonePrefix>('');
  const [showDeadlineBar, setShowDeadlineBarState] = useState<boolean>(DEFAULT_SHOW_DEADLINE_BAR);
  const [showRecentOrders, setShowRecentOrdersState] = useState<boolean>(DEFAULT_SHOW_RECENT_ORDERS);
  const [isSettingsReady, setIsSettingsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_UNIT),
      AsyncStorage.getItem(STORAGE_KEY_DEFAULT_PHONE_PREFIX),
      AsyncStorage.getItem(STORAGE_KEY_SHOW_DEADLINE_BAR),
      AsyncStorage.getItem(STORAGE_KEY_SHOW_RECENT_ORDERS),
      AsyncStorage.getItem(STORAGE_KEY_PREFERRED_CURRENCY),
    ])
      .then(([storedUnit, storedPhonePrefix, storedShowDeadlineBar, storedShowRecentOrders, storedCurrency]) => {
        if (cancelled) return;
        setPreferredUnitState(normalizeUnit(storedUnit));
        setDefaultPhonePrefixState(normalizePhonePrefix(storedPhonePrefix));
        setShowDeadlineBarState(normalizeShowDeadlineBar(storedShowDeadlineBar));
        setShowRecentOrdersState(normalizeShowRecentOrders(storedShowRecentOrders));
        setPreferredCurrencyState(normalizeCurrency(storedCurrency));
      })
      .catch(() => {
        if (!cancelled) {
          setPreferredUnitState('cm');
          setPreferredCurrencyState('RON');
          setDefaultPhonePrefixState('');
          setShowDeadlineBarState(DEFAULT_SHOW_DEADLINE_BAR);
          setShowRecentOrdersState(DEFAULT_SHOW_RECENT_ORDERS);
        }
      })
      .finally(() => {
        if (!cancelled) setIsSettingsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreferredUnit = useCallback((unit: PreferredUnit) => {
    if (!UNIT_REGISTRY[unit]) return;
    setPreferredUnitState(unit);
    AsyncStorage.setItem(STORAGE_KEY_UNIT, unit).catch(() => {});
  }, []);

  const setPreferredCurrency = useCallback((currency: PreferredCurrency) => {
    setPreferredCurrencyState(currency);
    AsyncStorage.setItem(STORAGE_KEY_PREFERRED_CURRENCY, currency).catch(() => {});
  }, []);

  const setDefaultPhonePrefix = useCallback((prefix: PhonePrefix) => {
    setDefaultPhonePrefixState(prefix);
    AsyncStorage.setItem(STORAGE_KEY_DEFAULT_PHONE_PREFIX, prefix).catch(() => {});
  }, []);

  const setShowDeadlineBar = useCallback((show: boolean) => {
    setShowDeadlineBarState(show);
    AsyncStorage.setItem(STORAGE_KEY_SHOW_DEADLINE_BAR, String(show)).catch(() => {});
  }, []);

  const setShowRecentOrders = useCallback((show: boolean) => {
    setShowRecentOrdersState(show);
    AsyncStorage.setItem(STORAGE_KEY_SHOW_RECENT_ORDERS, String(show)).catch(() => {});
  }, []);

  const value: SettingsContextValue = {
    preferredUnit,
    setPreferredUnit,
    preferredCurrency,
    setPreferredCurrency,
    defaultPhonePrefix,
    setDefaultPhonePrefix,
    showDeadlineBar,
    setShowDeadlineBar,
    showRecentOrders,
    setShowRecentOrders,
    isSettingsReady,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
