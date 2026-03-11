/**
 * ScreenLayout — Reusable screen wrapper for safe area + keyboard handling.
 * Uses theme-aware styles from ThemeContext.
 *
 * Uses react-native-keyboard-controller instead of KeyboardAvoidingView:
 *
 * - Why KeyboardProvider replaces KeyboardAvoidingView: A single provider at root
 *   supplies keyboard height/insets to the native driver; each KeyboardAwareScrollView
 *   uses that for scroll adjustments. No per-screen behavior="padding" or guessing.
 *
 * - Why this eliminates Android resize issues: We no longer rely on
 *   android:windowSoftInputMode="adjustResize" or manual resize hacks. The library
 *   uses native keyboard insets so content moves correctly without window resizing.
 *
 * - Why smoother iOS animations: react-native-keyboard-controller uses the same
 *   keyboard animation curve as the system, so the scroll adjustment is in sync
 *   with the keyboard and there are no layout jumps.
 *
 * - Why floating footer no longer blocks scroll: bottomOffset tells KeyboardAwareScrollView
 *   how much space the footer uses; it keeps the focused input above both the
 *   keyboard and the footer, so no manual padding hacks or absolute-position tricks.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from '@/contexts/ThemeContext';

export interface ScreenLayoutProps {
  children: React.ReactNode;
  /**
   * When true, content is wrapped in KeyboardAwareScrollView so long forms scroll
   * and the focused input stays above the keyboard (and above footer when bottomOffset is set).
   */
  scrollable?: boolean;
  /** Style for the root SafeAreaView. */
  style?: ViewStyle;
  /**
   * When scrollable is true, applied to scroll contentContainerStyle.
   * Use for flexGrow, paddingBottom, etc.
   */
  contentContainerStyle?: ViewStyle;
  /**
   * Bottom offset (px) reserved for a floating footer. KeyboardAwareScrollView uses this
   * so scroll content doesn't sit under the footer and stays above keyboard correctly.
   * No manual padding hacks needed.
   */
  bottomOffset?: number;
  /**
   * Safe area edges. Default: all. Use ['top','left','right'] for tab screens
   * if the tab bar already applies bottom inset to avoid double padding.
   */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** ScrollView: show vertical scroll indicator when scrollable. Default false. */
  showsVerticalScrollIndicator?: boolean;
}

const DEFAULT_EDGES: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];

const ScreenLayoutComponent = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  bottomOffset = 0,
  edges = DEFAULT_EDGES,
  showsVerticalScrollIndicator = false,
}: ScreenLayoutProps) => {
  const { colors } = useTheme();
  
  const content = scrollable ? (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps="handled"
      bottomOffset={bottomOffset}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View style={styles.flex1}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }, style]} edges={edges}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export const ScreenLayout = memo(ScreenLayoutComponent);
