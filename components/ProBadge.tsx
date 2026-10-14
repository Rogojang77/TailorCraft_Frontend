import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';
import { usePremium } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierRadius } from '@/constants/atelierDesign';

interface ProBadgeProps {
  size?: 'sm' | 'md';
  style?: ViewStyle;
  label?: string;
  showIfFree?: boolean;
}

export function ProBadge({ size = 'md', style, label = 'PRO', showIfFree = false }: ProBadgeProps) {
  const { colors } = useTheme();
  const { isPremium: isPro, loading } = usePremium();

  if (loading) return null;
  if (!isPro && !showIfFree) return null;

  const isSizeSmall = size === 'sm';
  const iconSize = isSizeSmall ? 12 : 14;
  const textFontSize = isSizeSmall ? 10 : 12;
  const brassColor = colors.brass ?? colors.primary;

  return (
    <View
      style={[
        styles.badge,
        isSizeSmall ? styles.badgeSmall : styles.badgeMedium,
        { backgroundColor: (colors.brassPale ?? colors.brass) + '18', borderColor: brassColor },
        style,
      ]}
      accessibilityLabel={`${label} subscription`}
      accessibilityRole="text"
    >
      <Crown size={iconSize} color={brassColor} strokeWidth={2.5} />
      <Text style={[styles.text, { color: brassColor, fontSize: textFontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: AtelierRadius.full,
    gap: 4,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontFamily: FontFamily.monoBold,
    letterSpacing: 0.5,
  },
});
