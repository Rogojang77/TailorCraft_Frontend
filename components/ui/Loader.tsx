/**
 * In-content loading block: centered ActivityIndicator with optional message.
 * Use for section/screen loading (not full-screen; use ListSkeletonLoader for that).
 * Uses theme-aware styles from ThemeContext.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography } from '@/constants/design';

export interface LoaderProps {
  /** Optional message below spinner */
  message?: string;
  /** Spinner size */
  size?: 'small' | 'large';
  style?: ViewStyle;
}

const LoaderComponent = ({ message, size = 'large', style }: LoaderProps) => {
  const { colors } = useTheme();
  const typography = getTypography(colors);

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message != null && message !== '' && (
        <Text style={[typography.caption, { color: colors.textSecondary }, styles.message]} numberOfLines={2}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  message: {
    marginTop: 12,
  },
});

export const Loader = memo(LoaderComponent);
