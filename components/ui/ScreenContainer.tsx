/**
 * Screen root container: SafeAreaView (top/left/right only), optional ScrollView,
 * padding. Bottom safe area is applied only when safeBottom === true.
 * Use instead of SafeAreaView + LayoutStyles.container + ScrollView.
 * Keyboard handling uses react-native-keyboard-controller (KeyboardProvider in _layout.tsx;
 * use KeyboardAwareScrollView or ScreenLayout for form screens).
 */
import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing } from '@/constants/design';

export interface ScreenContainerProps {
  children: React.ReactNode;
  /** Use SafeAreaView as root. Default true. */
  safe?: boolean;
  /** Include bottom edge safe area via padding (e.g. set true only when no tab bar). Default false. */
  safeBottom?: boolean;
  /** Apply screen content padding (vertical from LayoutStyles; horizontal on root when !noPadding). Default true. */
  contentPadding?: boolean;
  /** When true, no padding. Overrides contentPadding. Default false. */
  noPadding?: boolean;
  /** When true, wrap children in ScrollView. Default false. */
  scroll?: boolean;
  /** When true, center content (flex 1, justifyContent center, alignItems center). Default false. */
  centered?: boolean;
  /** Optional refresh control when scroll=true. */
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
  /** Style for root container. */
  style?: ViewStyle;
  /** Content container style when scroll=true (ScrollView contentContainerStyle). */
  contentContainerStyle?: ViewStyle;
  /** ScrollView showsVerticalScrollIndicator when scroll=true. Default false. */
  showsVerticalScrollIndicator?: boolean;
}

const SAFE_EDGES: ('left' | 'right')[] = ['left', 'right'];

const ScreenContainerComponent = ({
  children,
  safe = true,
  safeBottom = false,
  contentPadding = true,
  noPadding = false,
  scroll = false,
  centered = false,
  refreshControl,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: ScreenContainerProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = contentPadding && !noPadding;

  const containerStyle: ViewStyle[] = [
    { flex: 1, backgroundColor: colors.background },
    ...(!noPadding ? [{ paddingHorizontal: Spacing.md }] : []),
    ...(safeBottom ? [{ paddingBottom: insets.bottom }] : []),
    ...(centered ? [styles.centered] : []),
    ...(style ? [style] : []),
  ];

  const innerStyle: ViewStyle[] = [
    styles.flex1,
    ...(padding ? [styles.padded] : []),
    ...(centered ? [styles.centered] : []),
  ];

  const scrollContentStyle: ViewStyle[] = [
    styles.scrollContent,
    ...(padding ? [styles.scrollContentPadding] : []),
    ...(centered ? [styles.scrollCentered] : []),
    ...(contentContainerStyle ? [contentContainerStyle] : []),
  ];

  const scrollContent = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={scrollContentStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={innerStyle}>{children}</View>
  );

  if (safe) {
    return (
      <SafeAreaView style={containerStyle} edges={SAFE_EDGES}>
        {scrollContent}
      </SafeAreaView>
    );
  }
  return <View style={containerStyle}>{scrollContent}</View>;
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  padded: {},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentPadding: {},
  scrollCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const ScreenContainer = memo(ScreenContainerComponent);
