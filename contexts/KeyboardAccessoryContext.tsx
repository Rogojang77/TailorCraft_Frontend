/**
 * Keyboard Accessory system for Android (and optional iOS).
 *
 * iOS: InputAccessoryView (native) is used by NumericMeasurementInput.
 * Android: Accessory bar is rendered at the bottom, above the keyboard, via a root-level host
 * that uses react-native-keyboard-controller so the bar moves with the keyboard. The bar
 * only appears when the keyboard is open.
 *
 * Context: inputs register (id, content) on focus and clear on blur; only one focused at a time.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { KeyboardStickyView, useKeyboardAnimation } from 'react-native-keyboard-controller';

export type SetFocusedAccessoryFn = (id: string | null, content: React.ReactNode | null) => void;

export type KeyboardAccessoryContextValue = {
  setFocusedAccessory: SetFocusedAccessoryFn;
  /** Content to render in the accessory slot (e.g. for @flyerhq KeyboardAccessoryView). Null when no input is focused. */
  currentContent: React.ReactNode | null;
};

const KeyboardAccessoryContext = createContext<KeyboardAccessoryContextValue | null>(null);

export function useKeyboardAccessory(): KeyboardAccessoryContextValue {
  const ctx = useContext(KeyboardAccessoryContext);
  if (!ctx) {
    throw new Error(
      'useKeyboardAccessory must be used within KeyboardAccessoryProvider. Add <KeyboardAccessoryProvider> in your root layout (e.g. inside KeyboardProvider).'
    );
  }
  return ctx;
}

/** Optional hook: use only when you need the accessory (e.g. Android). Returns null when not needed. */
export function useKeyboardAccessoryOptional(): KeyboardAccessoryContextValue | null {
  return useContext(KeyboardAccessoryContext);
}

/**
 * Shared Android accessory bar UI. Renders at bottom of its container, sticks above keyboard.
 * Use at app root (AndroidAccessoryHostAboveKeyboard) or inside a modal (KeyboardAccessoryHostForModal).
 */
function AndroidAccessoryBarView({ content }: { content: React.ReactNode }) {
  const { progress } = useKeyboardAnimation();
  const [pointerEventsEnabled, setPointerEventsEnabled] = useState(false);

  useEffect(() => {
    const listenerId = progress.addListener(({ value }: { value: number }) => {
      setPointerEventsEnabled(value > 0.02);
    });
    return () => progress.removeListener(listenerId);
  }, [progress]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.02, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.hostContainer} pointerEvents={pointerEventsEnabled ? 'box-none' : 'none'}>
      <Animated.View style={[styles.hostAnimated, { opacity }]}>
        <KeyboardStickyView enabled style={styles.sticky}>
          <View pointerEvents="auto">{content}</View>
        </KeyboardStickyView>
      </Animated.View>
    </View>
  );
}

/**
 * Root-level Android host that renders the accessory bar at the bottom, above the keyboard.
 * Uses useKeyboardAnimation so the bar moves with the keyboard; hidden when keyboard is closed.
 */
function AndroidAccessoryHostAboveKeyboard({ content }: { content: React.ReactNode | null }) {
  if (content == null) return null;
  return <AndroidAccessoryBarView content={content} />;
}

/**
 * Renders the keyboard accessory bar inside a modal so it appears in the modal's view hierarchy.
 * Use this inside React Native Modal when the modal contains inputs that use the accessory (e.g. NumericMeasurementInput).
 * Only renders on Android; no-op on iOS.
 */
export function KeyboardAccessoryHostForModal() {
  const ctx = useKeyboardAccessoryOptional();
  if (Platform.OS !== 'android' || !ctx?.currentContent) return null;
  return <AndroidAccessoryBarView content={ctx.currentContent} />;
}

const styles = StyleSheet.create({
  hostContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1e6,
  },
  hostAnimated: {
    width: '100%',
  },
  sticky: {
    width: '100%',
  },
});

type HostState = {
  focusedId: string | null;
  contentById: Record<string, React.ReactNode>;
};

type KeyboardAccessoryProviderProps = {
  children: React.ReactNode;
};

/**
 * Wrap the app with this provider so inputs can register accessory content.
 * On Android, a root-level host renders the accessory bar at the bottom above the keyboard.
 */
export function KeyboardAccessoryProvider({ children }: KeyboardAccessoryProviderProps) {
  const [state, setState] = useState<HostState>({ focusedId: null, contentById: {} });

  const setFocusedAccessory = useCallback((id: string | null, content: React.ReactNode | null) => {
    setState((prev) => {
      if (id === null) {
        return { focusedId: null, contentById: {} };
      }
      return {
        focusedId: id,
        contentById: { ...prev.contentById, [id]: content },
      };
    });
  }, []);

  const currentContent =
    state.focusedId != null ? state.contentById[state.focusedId] ?? null : null;

  const value = useMemo<KeyboardAccessoryContextValue>(
    () => ({ setFocusedAccessory, currentContent }),
    [setFocusedAccessory, currentContent]
  );

  return (
    <KeyboardAccessoryContext.Provider value={value}>
      {Platform.OS === 'android' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={providerStyles.childrenWrap} pointerEvents="box-none" collapsable={false}>
            {children}
          </View>
          <AndroidAccessoryHostAboveKeyboard content={currentContent} />
        </View>
      ) : (
        children
      )}
    </KeyboardAccessoryContext.Provider>
  );
}

const providerStyles = StyleSheet.create({
  childrenWrap: {
    flex: 1,
  },
});
