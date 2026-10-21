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

  // Atelier palette
  paper: string;
  paperDeep: string;
  card: string;
  cardSoft: string;
  ink2: string;
  ink3: string;
  ink4: string;
  rule: string;
  ruleSoft: string;
  brass: string;
  brassDeep: string;
  brassPale: string;
  ember: string;
  pine: string;
  ocean: string;
}

/**
 * Light mode color palette
 */
/**
 * Legacy token names (primary, surface, textSecondary, status colours…) are mapped onto the atelier
 * palette so older screens match the paper/ink/brass design without touching each one.
 */
export const LightColors: ThemeColors = {
  // Primary (reduced saturation by ~15%)
  primary: '#9C7A3E',
  primaryDark: '#6E5326',
  primaryLight: '#E9DCC0',
  
  // Neutral
  background: '#EFE9DC',
  surface: '#F7F2E6',
  surfaceElevated: '#FBF7EC',
  
  // Text (2026 standards)
  textPrimary: '#1B1611',
  textSecondary: '#5E5446',
  textTertiary: '#8E8371',
  textInverse: '#FFFFFF',
  
  // Status
  success: '#3D5C48',
  warning: '#9C6B1E',
  error: '#A23E2E',
  danger: '#A23E2E',
  dangerDark: '#7E2E22',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
  info: '#3C5772',
  
  // Borders & Dividers
  border: '#D6CBB3',
  borderLight: '#E3D9C2',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  overlayModal: 'rgba(15, 23, 42, 0.72)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayGradientEnd: 'rgba(0, 0, 0, 0.98)',

  // Status backgrounds (tinted surfaces for alerts/cards)
  successBg: '#E1E8DC',
  successBorder: '#3D5C48',
  successText: '#2C4434',
  errorBg: '#F2DFD9',
  errorBorder: '#D9A99F',
  errorText: '#7E2E22',
  errorTextDark: '#6A261C',
  warningBg: '#F2E6CC',
  warningBorder: '#D9C18B',
  warningText: '#6E5326',
  warningTextDark: '#5A4320',
  infoBg: '#DFE5EA',
  infoBorder: '#A9B9C8',
  infoText: '#2C4256',

  // Icon/default accent
  iconDefault: '#3F362A',
  primaryLegacy: '#9C7A3E',

  // Floating footer CTA
  ctaGold: '#9C7A3E',
  ctaGoldDisabled: '#D9C9A5',

  transparent: 'transparent',

  // Atelier palette
  paper: '#EFE9DC',
  paperDeep: '#E6DECD',
  card: '#F7F2E6',
  cardSoft: '#FBF7EC',
  ink2: '#3F362A',
  ink3: '#7B7060',
  ink4: '#A89E8C',
  rule: '#D6CBB3',
  ruleSoft: '#E3D9C2',
  brass: '#9C7A3E',
  brassDeep: '#6E5326',
  brassPale: '#D9C18B',
  ember: '#A23E2E',
  pine: '#3D5C48',
  ocean: '#3C5772',
};

/**
 * Dark mode color palette
 */
export const DarkColors: ThemeColors = {
  // Primary (slightly brighter for dark mode visibility)
  primary: '#C49640',
  primaryDark: '#8A6830',
  primaryLight: '#3A2F1E',
  
  // Neutral
  background: '#1E1A14',
  surface: '#252018',
  surfaceElevated: '#2A2419',
  
  // Text
  textPrimary: '#EFE9DC',
  textSecondary: '#C9C0AD',
  textTertiary: '#8A8070',
  textInverse: '#111111',
  
  // Status (kept similar for recognition, slightly adjusted for dark bg)
  success: '#7FA58A',
  warning: '#D4A85A',
  error: '#D9786A',
  danger: '#D9786A',
  dangerDark: '#C25A4A',
  dangerBg: 'rgba(251, 113, 133, 0.15)',
  info: '#86A3C0',
  
  // Borders & Dividers
  border: '#3A322A',
  borderLight: '#302820',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayDark: 'rgba(0, 0, 0, 0.9)',
  overlayModal: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.6)',
  overlayGradientEnd: 'rgba(0, 0, 0, 0.98)',

  // Status backgrounds (darker tinted surfaces)
  successBg: '#1F2A22',
  successBorder: '#7FA58A',
  successText: '#A9C7B1',
  errorBg: '#2E1C18',
  errorBorder: '#D9786A',
  errorText: '#E8A99F',
  errorTextDark: '#D9786A',
  warningBg: '#2E2516',
  warningBorder: '#D4A85A',
  warningText: '#E3C58C',
  warningTextDark: '#D4A85A',
  infoBg: '#1C2530',
  infoBorder: '#86A3C0',
  infoText: '#B5C7D9',

  // Icon/default accent
  iconDefault: '#C9C0AD',
  primaryLegacy: '#C49640',

  // Floating footer CTA
  ctaGold: '#C49640',
  ctaGoldDisabled: '#4A3F2C',

  transparent: 'transparent',

  // Atelier palette (dark variants)
  paper: '#1E1A14',
  paperDeep: '#181410',
  card: '#252018',
  cardSoft: '#2A2419',
  ink2: '#C9C0AD',
  ink3: '#8A8070',
  ink4: '#5A5245',
  rule: '#3A322A',
  ruleSoft: '#302820',
  brass: '#C49640',
  brassDeep: '#8A6830',
  brassPale: '#A88A5A',
  ember: '#C04E3E',
  pine: '#508070',
  ocean: '#4E7090',
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
