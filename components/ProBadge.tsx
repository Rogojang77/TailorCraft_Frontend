import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';
import { usePremium } from '@/contexts/PremiumContext';
import { Colors, BorderRadius, Spacing } from '@/constants/design';

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
 * 
 * @example
 * // Default medium size badge
 * <ProBadge />
 * 
 * @example
 * // Small badge with custom styling
 * <ProBadge size="sm" style={{ marginLeft: 8 }} />
 * 
 * @example
 * // Custom label for future plans
 * <ProBadge label="ENTERPRISE" />
 */
export function ProBadge({ size = 'md', style, label = 'PRO', showIfFree = false }: ProBadgeProps) {
  const { isPremium: isPro, loading } = usePremium();

  if (loading) return null;
  if (!isPro && !showIfFree) return null;
  
  const isSizeSmall = size === 'sm';
  const iconSize = isSizeSmall ? 12 : 14;
  const badgeStyle = isSizeSmall ? styles.badgeSmall : styles.badgeMedium;
  const textStyle = isSizeSmall ? styles.textSmall : styles.textMedium;
  
  return (
    <View style={[styles.badge, badgeStyle, style]} accessibilityLabel={`${label} subscription`} accessibilityRole="text">
      <Crown size={iconSize} color={Colors.primary} strokeWidth={2.5} />
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningBg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
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
    color: Colors.primary,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
});
