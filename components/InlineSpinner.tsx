/**
 * Inline spinner for buttons and compact actions.
 * Use inside TouchableOpacity/buttons when performing an action.
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export interface InlineSpinnerProps {
  /** Use 'inverse' for dark backgrounds (e.g. primary button). */
  variant?: 'default' | 'inverse';
  size?: 'small' | 'large';
}

export function InlineSpinner({
  variant = 'default',
  size = 'small',
}: InlineSpinnerProps) {
  const { colors } = useTheme();
  const color = variant === 'inverse' ? colors.textInverse : colors.primary;
  return <ActivityIndicator size={size} color={color} />;
}
