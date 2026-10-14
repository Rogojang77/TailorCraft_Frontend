/**
 * In-content loading block: centered ActivityIndicator with optional message.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily } from '@/constants/atelierDesign';

export interface LoaderProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

const LoaderComponent = ({ message, size = 'large', style }: LoaderProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={colors.brass ?? colors.primary} />
      {message != null && message !== '' && (
        <Text style={[styles.message, { color: colors.ink3 }]} numberOfLines={2}>
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
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
});

export const Loader = memo(LoaderComponent);
