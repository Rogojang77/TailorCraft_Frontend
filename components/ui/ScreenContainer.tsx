/**
 * Screen root container: SafeAreaView (top/left/right only), optional ScrollView,
 * padding. Bottom safe area is applied only when safeBottom === true.
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
import { AtelierSpacing } from '@/constants/atelierDesign';

export interface ScreenContainerProps {
  children: React.ReactNode;
  safe?: boolean;
  safeBottom?: boolean;
  contentPadding?: boolean;
  noPadding?: boolean;
  scroll?: boolean;
  centered?: boolean;
  refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>>;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
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

  const containerStyle: ViewStyle[] = [
    { flex: 1, backgroundColor: colors.paper ?? colors.background },
    ...(!noPadding ? [{ paddingHorizontal: AtelierSpacing.md }] : []),
    ...(safeBottom ? [{ paddingBottom: insets.bottom }] : []),
    ...(centered ? [styles.centered] : []),
    ...(style ? [style] : []),
  ];

  const innerStyle: ViewStyle[] = [
    styles.flex1,
    ...(centered ? [styles.centered] : []),
  ];

  const scrollContentStyle: ViewStyle[] = [
    styles.scrollContent,
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
  flex1: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  scrollCentered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});

export const ScreenContainer = memo(ScreenContainerComponent);
