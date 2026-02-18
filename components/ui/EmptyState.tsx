/**
 * Empty state block: optional title, message, and action button.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Typography, Colors, Spacing } from '@/constants/design';
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
  return (
    <View style={[styles.container, style]}>
      {title != null && title !== '' && (
        <Text style={[styles.title, titleStyle]}>
          {title}
        </Text>
      )}
      {message != null && message !== '' && (
        <Text style={[styles.message, messageStyle]}>
          {message}
        </Text>
      )}
      {hint != null && hint !== '' && (
        <Text style={styles.hint}>
          {hint}
        </Text>
      )}
      {actionLabel != null && actionLabel !== '' && onAction != null && (
        <Button
          variant="primary"
          size="lg"
          onPress={onAction}
          disabled={actionDisabled}
          leftIcon={<Plus size={18} color={Colors.textInverse} />}
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
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  button: {
    marginTop: Spacing.xs,
  },
});

export const EmptyState = memo(EmptyStateComponent);
