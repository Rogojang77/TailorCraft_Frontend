/**
 * Empty state block: optional title, message, and action button.
 * Uses theme-aware styles from ThemeContext.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing } from '@/constants/design';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react-native';

export interface EmptyStateProps {
  /** Short title (e.g. "No clients") */
  title?: string;
  /** Description text */
  message?: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Action button onPress (if actionLabel is set) */
  onAction?: () => void;
  /** Optional hint below message (e.g. limit message) */
  hint?: string;
  /** Disable the action button */
  actionDisabled?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

const EmptyStateComponent = ({
  title,
  message,
  actionLabel,
  onAction,
  hint,
  actionDisabled = false,
  style,
  titleStyle,
  messageStyle,
}: EmptyStateProps) => {
  const { colors } = useTheme();
  const typography = getTypography(colors);

  return (
    <View style={[styles.container, style]}>
      {title != null && title !== '' && (
        <Text style={[typography.body, styles.title, titleStyle]}>
          {title}
        </Text>
      )}
      {message != null && message !== '' && (
        <Text style={[typography.body, { color: colors.textSecondary }, styles.message, messageStyle]}>
          {message}
        </Text>
      )}
      {hint != null && hint !== '' && (
        <Text style={[typography.caption, { color: colors.textTertiary }, styles.hint]}>
          {hint}
        </Text>
      )}
      {actionLabel != null && actionLabel !== '' && onAction != null && (
        <Button
          variant="primary"
          size="lg"
          onPress={onAction}
          disabled={actionDisabled}
          leftIcon={<Plus size={18} color={colors.textInverse} />}
          style={styles.button}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: '80%',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  hint: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  button: {
    marginTop: Spacing.xs,
  },
});

export const EmptyState = memo(EmptyStateComponent);
