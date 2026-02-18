/**
 * Standard error message text. Theme-aware (Colors.error).
 */
import React, { memo } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Typography, Colors } from '@/constants/design';

export interface ErrorTextProps {
  children: string;
  /** Use darker error color where needed */
  variant?: 'default' | 'dark';
  style?: TextStyle;
  numberOfLines?: number;
}

const ErrorTextComponent = ({
  children,
  variant = 'default',
  style,
  numberOfLines,
}: ErrorTextProps) => {
  const color = variant === 'dark' ? Colors.errorTextDark : Colors.error;
  return (
    <Text style={[styles.text, { color }, style]} numberOfLines={numberOfLines ?? 2}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    ...Typography.caption,
  },
});

export const ErrorText = memo(ErrorTextComponent);
