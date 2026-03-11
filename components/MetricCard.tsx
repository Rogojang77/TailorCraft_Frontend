import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, Shadows, Typography } from '@/constants/design';
import type { LucideIcon } from 'lucide-react-native';

interface MetricCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  onPress?: () => void;
  /** When 'large', card is full width with bigger content (e.g. when recent orders are hidden on homepage). */
  size?: 'default' | 'large';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  onPress,
  size = 'default',
}: MetricCardProps) {
  const { colors } = useTheme();
  const isLarge = size === 'large';

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isLarge && styles.cardLarge,
      ]}
    >
      <View style={[styles.iconContainer, isLarge && styles.iconContainerLarge]}>
        <Icon size={isLarge ? 28 : 20} color={iconColor ?? colors.primary} strokeWidth={1.5} />
      </View>
      {value !== undefined ? (
        <Text style={[styles.value, { color: colors.textPrimary }, isLarge && styles.valueLarge]}>
          {value}
        </Text>
      ) : null}
      <Text
        style={[styles.title, { color: colors.textSecondary }, isLarge && styles.titleLarge]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.subtitle, { color: colors.textTertiary }, isLarge && styles.subtitleLarge]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.touchable, isLarge && styles.touchableLarge]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.touchable, isLarge && styles.touchableLarge]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: '48%',
  },
  touchableLarge: {
    width: '100%',
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    ...Shadows.sm,
  },
  cardLarge: {
    minHeight: 140,
    padding: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.xs,
  },
  iconContainerLarge: {
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  valueLarge: {
    fontSize: 36,
    lineHeight: 42,
  },
  title: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
  titleLarge: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  subtitle: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: 2,
  },
  subtitleLarge: {
    fontSize: 13,
    marginTop: 4,
  },
});
