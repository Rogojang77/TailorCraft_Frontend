/**
 * Empty state block: optional title, message, and action button.
 * Uses theme-aware styles from ThemeContext.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react-native';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
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

  return (
    <View style={[styles.container, style]}>
      {title != null && title !== '' && (
        <Text style={[styles.title, { color: colors.textPrimary }, titleStyle]}>
          {title}
        </Text>
      )}
      {message != null && message !== '' && (
        <Text style={[styles.message, { color: colors.ink3 }, messageStyle]}>
          {message}
        </Text>
      )}
      {hint != null && hint !== '' && (
        <Text style={[styles.hint, { color: colors.ink4 ?? colors.textTertiary }]}>
          {hint}
        </Text>
      )}
      {actionLabel != null && actionLabel !== '' && onAction != null && (
        <Button
          variant="primary"
          size="lg"
          onPress={onAction}
          disabled={actionDisabled}
          leftIcon={<Plus size={18} color={colors.paper ?? '#EFE9DC'} />}
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
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: '80%',
  },
  title: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  message: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.xs,
  },
  hint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  button: {
    marginTop: AtelierSpacing.xs,
  },
});

export const EmptyState = memo(EmptyStateComponent);
