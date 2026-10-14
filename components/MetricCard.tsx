import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import type { LucideIcon } from 'lucide-react-native';

interface MetricCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  onPress?: () => void;
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
        { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border },
        AtelierShadow.card,
        isLarge && styles.cardLarge,
      ]}
    >
      <View style={[styles.iconContainer, isLarge && styles.iconContainerLarge]}>
        <Icon size={isLarge ? 28 : 20} color={iconColor ?? (colors.brass ?? colors.primary)} strokeWidth={1.5} />
      </View>
      {value !== undefined ? (
        <Text style={[styles.value, { color: colors.textPrimary }, isLarge && styles.valueLarge]}>
          {value}
        </Text>
      ) : null}
      <Text
        style={[styles.title, { color: colors.ink3 }, isLarge && styles.titleLarge]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.subtitle, { color: colors.ink4 ?? colors.textTertiary }, isLarge && styles.subtitleLarge]}
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

  return <View style={[styles.touchable, isLarge && styles.touchableLarge]}>{content}</View>;
}

const styles = StyleSheet.create({
  touchable: { width: '48%' },
  touchableLarge: { width: '100%' },
  card: {
    borderRadius: AtelierRadius.lg,
    borderWidth: 1,
    padding: AtelierSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  cardLarge: {
    minHeight: 140,
    padding: AtelierSpacing.lg,
  },
  iconContainer: { marginBottom: AtelierSpacing.xs },
  iconContainerLarge: { marginBottom: AtelierSpacing.sm },
  value: {
    fontFamily: FontFamily.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  valueLarge: {
    fontSize: 36,
    lineHeight: 42,
  },
  title: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  titleLarge: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    marginTop: AtelierSpacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  subtitleLarge: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
