import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';
import { usePremium } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BorderRadius } from '@/constants/design';

interface ProBadgeProps {
  /**
   * Size variant of the badge
   * @default 'md'
   */
  size?: 'sm' | 'md';
  
  /**
   * Optional custom style to override or extend default styles
   */
  style?: ViewStyle;
  
  /**
   * Optional custom label (for future plan types like "TRIAL", "ENTERPRISE")
   * @default 'PRO'
   */
  label?: string;
  
  /**
   * Debug flag to show badge even if not on Pro plan
   * @default false
   */
  showIfFree?: boolean;
}

/**
 * ProBadge Component
 * 
 * A reusable badge that displays the user's Pro subscription status.
 * The badge automatically checks the subscription state and only renders when the user is on a Pro plan.
 */
export function ProBadge({ size = 'md', style, label = 'PRO', showIfFree = false }: ProBadgeProps) {
  const { colors } = useTheme();
  const { isPremium: isPro, loading } = usePremium();

  if (loading) return null;
  if (!isPro && !showIfFree) return null;
  
  const isSizeSmall = size === 'sm';
  const iconSize = isSizeSmall ? 12 : 14;
  const badgeStyle = isSizeSmall ? styles.badgeSmall : styles.badgeMedium;
  const textFontSize = isSizeSmall ? 10 : 12;
  
  return (
    <View 
      style={[
        styles.badge, 
        badgeStyle, 
        { backgroundColor: colors.warningBg, borderColor: colors.primary },
        style
      ]} 
      accessibilityLabel={`${label} subscription`} 
      accessibilityRole="text"
    >
      <Crown size={iconSize} color={colors.primary} strokeWidth={2.5} />
      <Text style={[styles.text, { color: colors.primary, fontSize: textFontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
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
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
