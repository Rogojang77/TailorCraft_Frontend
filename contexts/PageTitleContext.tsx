import { useFocusEffect } from 'expo-router';
/**
 * Context for dynamic page title overrides and custom back button handlers.
 * 
 * Most screens get their title automatically from route detection in GlobalHeader.
 * This context is only needed for:
 * - Dynamic titles (e.g., entity names like "John's Jacket")
 * - Custom back navigation (e.g., new-order/* going to /(tabs)/orders)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface PageHeaderOverrides {
  dynamicTitle: string | null;
  onBack: (() => void) | null;
  backAccessibilityLabel?: string;
}

export interface PageTitleContextValue {
  overrides: PageHeaderOverrides;
  setDynamicTitle: (title: string | null) => void;
  setOnBack: (handler: (() => void) | null, accessibilityLabel?: string) => void;
  clearOverrides: () => void;
}

const defaultOverrides: PageHeaderOverrides = {
  dynamicTitle: null,
  onBack: null,
  backAccessibilityLabel: undefined,
};

const PageTitleContext = createContext<PageTitleContextValue | undefined>(undefined);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<PageHeaderOverrides>(defaultOverrides);

  const setDynamicTitle = useCallback((title: string | null) => {
    setOverrides((prev) => ({ ...prev, dynamicTitle: title }));
  }, []);

  const setOnBack = useCallback((handler: (() => void) | null, accessibilityLabel?: string) => {
    setOverrides((prev) => ({
      ...prev,
      onBack: handler,
      backAccessibilityLabel: accessibilityLabel,
    }));
  }, []);

  const clearOverrides = useCallback(() => {
    setOverrides(defaultOverrides);
  }, []);

  const value: PageTitleContextValue = {
    overrides,
    setDynamicTitle,
    setOnBack,
    clearOverrides,
  };

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageTitleContext(): PageTitleContextValue {
  const ctx = useContext(PageTitleContext);
  if (ctx === undefined) {
    throw new Error('usePageTitleContext must be used within PageTitleProvider');
  }
  return ctx;
}

/**
 * Hook for screens to set a dynamic title (e.g., entity name).
 * Automatically clears on unmount.
 */
export function useDynamicTitle(title: string | null): void {
  const { setDynamicTitle } = usePageTitleContext();

  // Apply only while this screen is focused; otherwise a screen lower in the stack
  // keeps its title on screens pushed on top of it.
  useFocusEffect(
    useCallback(() => {
      setDynamicTitle(title);
      return () => setDynamicTitle(null);
    }, [title, setDynamicTitle])
  );
}

/**
 * Hook for screens to set a custom back button handler.
 * Automatically clears on unmount.
 */
export function useCustomBack(onBack: () => void, accessibilityLabel?: string): void {
  const { setOnBack } = usePageTitleContext();
  
  // Store the callback in a ref so we can call the latest version without re-running useEffect
  const onBackRef = React.useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    // Create a stable wrapper that always calls the latest onBack from the ref
    const stableOnBack = () => onBackRef.current();
    setOnBack(stableOnBack, accessibilityLabel);
    return () => {
      setOnBack(null);
    };
  }, [accessibilityLabel, setOnBack]);
}

/**
 * @deprecated Use useDynamicTitle for titles and useCustomBack for back navigation.
 * This hook is kept for backward compatibility during migration.
 */
export function usePageHeader(options: {
  title: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
}): void {
  const { setDynamicTitle, setOnBack, clearOverrides } = usePageTitleContext();

  useEffect(() => {
    setDynamicTitle(options.title);
    if (options.onBack) {
      setOnBack(options.onBack, options.backAccessibilityLabel);
    }

    return () => {
      clearOverrides();
    };
  }, [options.title, options.onBack, options.backAccessibilityLabel, setDynamicTitle, setOnBack, clearOverrides]);
}
