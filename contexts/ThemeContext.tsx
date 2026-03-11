/**
 * ThemeContext - Provides theme-aware colors based on device color scheme
 * Supports automatic light/dark mode switching based on system preferences
 * Also supports manual override via user preference (system, light, dark)
 */
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY_THEME = '@tailorcraft/themePreference';

/**
 * Theme colors interface - defines all color tokens available in both themes
 */
export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  success: string;
  warning: string;
  error: string;
  danger: string;
  dangerDark: string;
  dangerBg: string;
  info: string;
  border: string;
  borderLight: string;
  overlay: string;
  overlayDark: string;
  overlayModal: string;
  overlayLight: string;
  overlayGradientEnd: string;
  successBg: string;
  successBorder: string;
  successText: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  errorTextDark: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  warningTextDark: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
  iconDefault: string;
  primaryLegacy: string;
  ctaGold: string;
  ctaGoldDisabled: string;
  transparent: string;
}

/**
 * Light mode color palette
 */
export const LightColors: ThemeColors = {
  // Primary (reduced saturation by ~15%)
  primary: '#C4A02D',
  primaryDark: '#A88A1A',
  primaryLight: '#E8D9A0',
  
  // Neutral
  background: '#F8F9FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Text (2026 standards)
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  danger: '#F43F5E',
  dangerDark: '#E11D48',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
  info: '#3B82F6',
  
  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  overlayModal: 'rgba(15, 23, 42, 0.72)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayGradientEnd: 'rgba(0, 0, 0, 0.98)',

  // Status backgrounds (tinted surfaces for alerts/cards)
  successBg: '#ECFDF5',
  successBorder: '#10B981',
  successText: '#065F46',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#991B1B',
  errorTextDark: '#B91C1C',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  warningTextDark: '#A16207',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
  infoText: '#1E40AF',

  // Icon/default accent
  iconDefault: '#333333',
  primaryLegacy: '#D4AF37',

  // Floating footer CTA
  ctaGold: '#C9A227',
  ctaGoldDisabled: '#E5D3A1',

  transparent: 'transparent',
};

/**
 * Dark mode color palette
 */
export const DarkColors: ThemeColors = {
  // Primary (slightly brighter for dark mode visibility)
  primary: '#D4B94D',
  primaryDark: '#B89F3A',
  primaryLight: '#3D3520',
  
  // Neutral
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  
  // Text
  textPrimary: '#F5F5F5',
  textSecondary: '#A1A1A1',
  textTertiary: '#6B6B6B',
  textInverse: '#111111',
  
  // Status (kept similar for recognition, slightly adjusted for dark bg)
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  danger: '#FB7185',
  dangerDark: '#F43F5E',
  dangerBg: 'rgba(251, 113, 133, 0.15)',
  info: '#60A5FA',
  
  // Borders & Dividers
  border: '#333333',
  borderLight: '#2A2A2A',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayDark: 'rgba(0, 0, 0, 0.9)',
  overlayModal: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.6)',
  overlayGradientEnd: 'rgba(0, 0, 0, 0.98)',

  // Status backgrounds (darker tinted surfaces)
  successBg: '#052E16',
  successBorder: '#34D399',
  successText: '#6EE7B7',
  errorBg: '#450A0A',
  errorBorder: '#F87171',
  errorText: '#FCA5A5',
  errorTextDark: '#F87171',
  warningBg: '#451A03',
  warningBorder: '#FBBF24',
  warningText: '#FCD34D',
  warningTextDark: '#FBBF24',
  infoBg: '#1E3A5F',
  infoBorder: '#60A5FA',
  infoText: '#93C5FD',

  // Icon/default accent
  iconDefault: '#E5E5E5',
  primaryLegacy: '#E5C85C',

  // Floating footer CTA
  ctaGold: '#D4B94D',
  ctaGoldDisabled: '#5C5233',

  transparent: 'transparent',
};
export type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colors: ThemeColors;
  colorScheme: ColorScheme;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  isThemeReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isThemeReady, setIsThemeReady] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY_THEME)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemePreferenceState(stored);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsThemeReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY_THEME, pref).catch(() => {});
  }, []);
  
  const value = useMemo<ThemeContextValue>(() => {
    let resolvedScheme: ColorScheme;
    if (themePreference === 'system') {
      resolvedScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
    } else {
      resolvedScheme = themePreference;
    }
    const isDark = resolvedScheme === 'dark';
    const colors = isDark ? DarkColors : LightColors;
    
    return {
      colors,
      colorScheme: resolvedScheme,
      isDark,
      themePreference,
      setThemePreference,
      isThemeReady,
    };
  }, [systemColorScheme, themePreference, setThemePreference, isThemeReady]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Helper hook to get just the colors object
 */
export function useColors(): ThemeColors {
  return useTheme().colors;
}
