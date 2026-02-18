/**
 * In-content loading block: centered ActivityIndicator with optional message.
 * Use for section/screen loading (not full-screen; use FullScreenLoader for that).
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors, Typography } from '@/constants/design';

export interface LoaderProps {
  /** Optional message below spinner */
  message?: string;
  /** Spinner size */
  size?: 'small' | 'large';
  style?: ViewStyle;
}

const LoaderComponent = ({ message, size = 'large', style }: LoaderProps) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {message != null && message !== '' && (
        <Text style={styles.message} numberOfLines={2}>
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
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});

export const Loader = memo(LoaderComponent);
