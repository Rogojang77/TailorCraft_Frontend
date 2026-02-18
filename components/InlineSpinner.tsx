/**
 * Inline spinner for buttons and compact actions.
 * Use inside TouchableOpacity/buttons when performing an action.
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/design';

export interface InlineSpinnerProps {
  /** Use 'inverse' for dark backgrounds (e.g. primary button). */
  variant?: 'default' | 'inverse';
  size?: 'small' | 'large';
}

export function InlineSpinner({
  variant = 'default',
  size = 'small',
}: InlineSpinnerProps) {
  const color = variant === 'inverse' ? Colors.textInverse : Colors.primary;
  return <ActivityIndicator size={size} color={color} />;
}
