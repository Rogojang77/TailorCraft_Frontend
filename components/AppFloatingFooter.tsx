/**
 * Floating footer for New Order flow.
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
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierShadow } from '@/constants/atelierDesign';

const FOOTER_PADDING_H = 20;
const FOOTER_PADDING_V = 16;
const CTA_HEIGHT = 52;
const CTA_BORDER_RADIUS = 26;
const CTA_PADDING_H = 28;

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
  secondaryIcon?: React.ReactNode;
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
  const { colors } = useTheme();
  const backScale = useSharedValue(1);
  const ctaScale = useSharedValue(1);

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
  }));

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const paperBg = colors.paper ?? colors.background;

  const glassBackground =
    Platform.OS === 'web' ? (
      <View style={[styles.glassFill, { backgroundColor: paperBg }]} />
    ) : (
      <>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.glassOverlay, { backgroundColor: paperBg }]} />
      </>
    );

  const ctaShadow = Platform.select({
    android: {},
    default: {
      shadowColor: colors.ctaGold,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: paperBg }]} edges={['bottom']}>
      <View style={styles.footer}>
        {glassBackground}
        <View style={styles.row}>
          {onSecondaryPress && (
            <AnimatedTouchable
              style={[
                styles.backButton,
                secondaryBordered && [
                  styles.secondaryButtonBordered,
                  { backgroundColor: paperBg, borderColor: colors.rule ?? colors.border },
                ],
                backAnimatedStyle,
                secondaryDisabled && styles.backButtonDisabled,
              ]}
              onPress={onSecondaryPress}
              onPressIn={() => { if (!secondaryDisabled) backScale.value = withSpring(0.98, springConfig); }}
              onPressOut={() => { backScale.value = withSpring(1, springConfig); }}
              disabled={secondaryDisabled}
              activeOpacity={1}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
              accessibilityState={{ disabled: secondaryDisabled }}
            >
              {secondaryIcon ?? <ChevronLeft size={20} color={colors.ink3} strokeWidth={2.5} />}
              <Text
                style={[
                  secondaryBordered
                    ? { fontFamily: FontFamily.sansSemiBold, fontSize: 15, lineHeight: 22, color: colors.textPrimary }
                    : { fontFamily: FontFamily.sansMedium, fontSize: 15, lineHeight: 22, color: colors.ink3 },
                  secondaryDisabled && { color: colors.ink4 ?? colors.textTertiary },
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
              { backgroundColor: colors.ctaGold },
              ctaShadow,
              primaryDisabled && [styles.ctaButtonDisabled, { backgroundColor: colors.ctaGoldDisabled }],
              ctaAnimatedStyle,
            ]}
            onPress={onPrimaryPress}
            onPressIn={() => {
              if (!primaryDisabled && !primaryLoading) ctaScale.value = withSpring(0.97, springConfig);
            }}
            onPressOut={() => { ctaScale.value = withSpring(1, springConfig); }}
            disabled={primaryDisabled || primaryLoading}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            accessibilityState={{ disabled: primaryDisabled || primaryLoading }}
          >
            {primaryLoading ? (
              <ActivityIndicator size="small" color={colors.paper ?? '#EFE9DC'} />
            ) : (
              <Text
                style={[
                  styles.ctaLabel,
                  { color: colors.paper ?? '#EFE9DC' },
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
  },
  footer: {
    paddingHorizontal: FOOTER_PADDING_H,
    paddingTop: FOOTER_PADDING_V,
    paddingBottom: FOOTER_PADDING_V,
    borderTopWidth: 1,
    borderTopColor: 'rgba(27,22,17,0.08)',
    overflow: 'hidden',
    ...Platform.select({
      android: {},
      default: {
        shadowColor: '#1B1611',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  glassFill: { ...StyleSheet.absoluteFillObject },
  glassOverlay: { ...StyleSheet.absoluteFillObject },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AtelierSpacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
    flex: 1,
  },
  backPlaceholder: { minWidth: 1 },
  backButtonDisabled: { opacity: 0.5 },
  secondaryButtonBordered: {
    height: CTA_HEIGHT,
    borderRadius: CTA_BORDER_RADIUS,
    paddingHorizontal: CTA_PADDING_H,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    flex: 1,
  },
  ctaButton: {
    height: CTA_HEIGHT,
    borderRadius: CTA_BORDER_RADIUS,
    paddingHorizontal: CTA_PADDING_H,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  ctaButtonDisabled: { shadowOpacity: 0, elevation: 0 },
  ctaLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  ctaLabelDisabled: { opacity: 0.7 },
});
