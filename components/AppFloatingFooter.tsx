/**
 * Floating glass-style footer for New Order flow.
 * Premium CTA layout: subtle Back (left) + dominant primary button (right).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';

const FOOTER_PADDING_H = 20;
const FOOTER_PADDING_V = 16;
const CTA_HEIGHT = 52;
const CTA_BORDER_RADIUS = 26;
const CTA_PADDING_H = 28;

/** Content height of the footer (no safe area). Use with bottomOffset: FOOTER_CONTENT_HEIGHT + insets.bottom */
export const FOOTER_CONTENT_HEIGHT = CTA_HEIGHT + FOOTER_PADDING_V * 2;

const springConfig = { damping: 15, stiffness: 400 };

export interface AppFloatingFooterProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryDisabled?: boolean;
  /** When provided, shown instead of the default back (chevron) icon. Use e.g. Share icon for share actions. */
  secondaryIcon?: React.ReactNode;
  /** When true, the secondary button gets a border (e.g. for Share-style actions). */
  secondaryBordered?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AppFloatingFooter({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondaryPress,
  secondaryDisabled = false,
  secondaryIcon,
  secondaryBordered = false,
}: AppFloatingFooterProps) {
  const backScale = useSharedValue(1);
  const ctaScale = useSharedValue(1);

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
  }));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const glassBackground =
    Platform.OS === 'web' ? (
      <View style={styles.glassFill} />
    ) : (
      <>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.glassOverlay} />
      </>
    );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.footer}>
        {glassBackground}
        <View style={styles.row}>
          {onSecondaryPress && (
            <AnimatedTouchable
              style={[
                styles.backButton,
                secondaryBordered && styles.secondaryButtonBordered,
                backAnimatedStyle,
                secondaryDisabled && styles.backButtonDisabled,
              ]}
              onPress={onSecondaryPress}
              onPressIn={() => {
                if (!secondaryDisabled) backScale.value = withSpring(0.98, springConfig);
              }}
              onPressOut={() => {
                backScale.value = withSpring(1, springConfig);
              }}
              disabled={secondaryDisabled}
              activeOpacity={1}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
              accessibilityState={{ disabled: secondaryDisabled }}
            >
              {secondaryIcon ?? <ChevronLeft size={20} color={Colors.textSecondary} strokeWidth={2.5} />}
              <Text
                style={[
                  secondaryBordered ? styles.secondaryButtonPillLabel : styles.backLabel,
                  secondaryDisabled && (secondaryBordered ? styles.secondaryButtonPillLabelDisabled : styles.backLabelDisabled),
                ]}
              >
                {secondaryLabel}
              </Text>
            </AnimatedTouchable>
          )}
          {!onSecondaryPress && <View style={styles.backPlaceholder} />}
          <AnimatedTouchable
            style={[
              styles.ctaButton,
              primaryDisabled && styles.ctaButtonDisabled,
              ctaAnimatedStyle,
            ]}
            onPress={onPrimaryPress}
            onPressIn={() => {
              if (!primaryDisabled && !primaryLoading) {
                ctaScale.value = withSpring(0.97, springConfig);
              }
            }}
            onPressOut={() => {
              ctaScale.value = withSpring(1, springConfig);
            }}
            disabled={primaryDisabled || primaryLoading}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            accessibilityState={{ disabled: primaryDisabled || primaryLoading }}
          >
            {primaryLoading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text
                style={[
                  styles.ctaLabel,
                  primaryDisabled && styles.ctaLabelDisabled,
                ]}
              >
                {primaryLabel}
              </Text>
            )}
          </AnimatedTouchable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
  },
  footer: {
    paddingHorizontal: FOOTER_PADDING_H,
    paddingTop: FOOTER_PADDING_V,
    paddingBottom: FOOTER_PADDING_V,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    ...Shadows.floatingFooter,
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: Spacing.xxs,
    flex: 1,
  },
  backPlaceholder: {
    minWidth: 1,
  },
  backButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButtonBordered: {
    height: CTA_HEIGHT,
    borderRadius: CTA_BORDER_RADIUS,
    paddingHorizontal: CTA_PADDING_H,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    flex: 1,
    ...Shadows.sm,
  },
  backLabel: {
    ...Typography.bodyBold,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  backLabelDisabled: {
    color: Colors.textTertiary,
  },
  secondaryButtonPillLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  secondaryButtonPillLabelDisabled: {
    color: Colors.textTertiary,
  },
  ctaButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_BORDER_RADIUS,
    paddingHorizontal: CTA_PADDING_H,
    backgroundColor: Colors.ctaGold,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    ...Shadows.ctaPill,
  },
  ctaButtonDisabled: {
    backgroundColor: Colors.ctaGoldDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  ctaLabelDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
});
