/**
 * Global app settings (measurement unit, phone default, etc.) with persistent storage.
 * Persisted via AsyncStorage; changes apply immediately across the app.
 */

import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNIT_REGISTRY } from '@/constants/units';

export type PreferredUnit = 'cm' | 'inch';

const STORAGE_KEY_UNIT = '@tailorcraft/preferredUnit';
const STORAGE_KEY_DEFAULT_PHONE_PREFIX = '@tailorcraft/defaultPhonePrefix';
const STORAGE_KEY_SHOW_DEADLINE_BAR = '@tailorcraft/showDeadlineBar';
const STORAGE_KEY_SHOW_RECENT_ORDERS = '@tailorcraft/showRecentOrders';

export const PREFERRED_UNIT_OPTIONS: PreferredUnit[] = ['cm', 'inch'];

export const DEFAULT_SHOW_DEADLINE_BAR = true;
export const DEFAULT_SHOW_RECENT_ORDERS = true;

// Common phone prefixes
export const PHONE_PREFIX_OPTIONS = [
  { value: '', label: 'None' },
  { value: '+40', label: 'Romania (+40)' },
  { value: '+1', label: 'USA/Canada (+1)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+49', label: 'Germany (+49)' },
  { value: '+33', label: 'France (+33)' },
  { value: '+39', label: 'Italy (+39)' },
  { value: '+34', label: 'Spain (+34)' },
] as const;

export type PhonePrefix = typeof PHONE_PREFIX_OPTIONS[number]['value'];

function normalizeUnit(value: string | null): PreferredUnit {
  if (value === 'cm' || value === 'inch') return value;
  return 'cm';
}

function normalizePhonePrefix(value: string | null): PhonePrefix {
  if (value === null) return '+40'; // Default to Romania
  const validPrefixes = PHONE_PREFIX_OPTIONS.map(p => p.value);
  if (validPrefixes.includes(value as PhonePrefix)) return value as PhonePrefix;
  return '+40';
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
  const [defaultPhonePrefix, setDefaultPhonePrefixState] = useState<PhonePrefix>('+40');
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
    ])
      .then(([storedUnit, storedPhonePrefix, storedShowDeadlineBar, storedShowRecentOrders]) => {
        if (cancelled) return;
        setPreferredUnitState(normalizeUnit(storedUnit));
        setDefaultPhonePrefixState(normalizePhonePrefix(storedPhonePrefix));
        setShowDeadlineBarState(normalizeShowDeadlineBar(storedShowDeadlineBar));
        setShowRecentOrdersState(normalizeShowRecentOrders(storedShowRecentOrders));
      })
      .catch(() => {
        if (!cancelled) {
          setPreferredUnitState('cm');
          setDefaultPhonePrefixState('+40');
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
