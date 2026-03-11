import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import {
  modalEntering,
  modalEnteringReducedMotion,
  modalExiting,
} from '@/constants/modalAnimation';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Crown, X, Check, Users, ShoppingBag, FileText, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing, BorderRadius, Shadows } from '@/constants/design';
import { SubscriptionPlanType, useSubscription, usePremium } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { PRIVACY_POLICY_URL } from '@/constants/legal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 440);

const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: (plan: SubscriptionPlanType) => void | Promise<void>;
  loading?: boolean;
}

export function PaywallModal({
  visible,
  onClose,
  onUpgrade,
  loading = false,
}: PaywallModalProps) {
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const { t } = useI18n();
  const { 
    prices, 
    isLoading: subscriptionLoading, 
    restorePurchases,
    isIAPSupported,
  } = useSubscription();
  const { isPremium } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('monthly');
  const [isRestoring, setIsRestoring] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const handleUpgrade = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await onUpgrade(selectedPlan);
  };

  const handlePlanSelect = (plan: SubscriptionPlanType) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPlan(plan);
  };

  const handleRestorePurchases = async () => {
    if (!isIAPSupported) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setIsRestoring(true);
    try {
      await restorePurchases();
    } finally {
      setIsRestoring(false);
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_POLICY_URL);
  };

  const openTermsOfUse = () => {
    Linking.openURL(TERMS_OF_USE_URL);
  };

  const getSelectedPrice = () => {
    if (selectedPlan === 'monthly') {
      return prices.monthly;
    }
    return prices.yearly;
  };

  const getSelectedPeriodLabel = () => {
    if (selectedPlan === 'monthly') {
      return t('subscription.perMonth');
    }
    return t('subscription.perYear');
  };

  if (!visible) return null;

  if (subscriptionLoading) {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <View style={styles.root}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={[styles.overlay, { backgroundColor: Platform.OS === 'web' ? colors.overlayModal : 'transparent' }]}>
              {Platform.OS !== 'web' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.centered} pointerEvents="box-none">
            <Animated.View 
              style={[styles.card, { backgroundColor: colors.surface }]} 
              entering={reduceMotion ? modalEnteringReducedMotion : modalEntering} 
              exiting={modalExiting}
            >
              <View style={styles.cardInner}>
                <View style={[styles.iconRing, { backgroundColor: `${colors.primary}20` }]}>
                  <Crown size={32} color={colors.primary} strokeWidth={2.5} />
                </View>
                <Button variant="ghost" style={styles.closeBtn} onPress={onClose} disabled={loading} accessibilityLabel="Close">
                  <X size={22} color={colors.textTertiary} />
                </Button>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('subscription.tailorCraftPro')}</Text>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('subscription.verifying')}</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    );
  }

  if (isPremium) {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <View style={styles.root}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={[styles.overlay, { backgroundColor: Platform.OS === 'web' ? colors.overlayModal : 'transparent' }]}>
              {Platform.OS !== 'web' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.centered} pointerEvents="box-none">
            <Animated.View 
              style={[styles.card, { backgroundColor: colors.surface }]} 
              entering={reduceMotion ? modalEnteringReducedMotion : modalEntering} 
              exiting={modalExiting}
            >
              <View style={styles.cardInner}>
                <View style={[styles.iconRing, { backgroundColor: `${colors.primary}20` }]}>
                  <Crown size={32} color={colors.primary} strokeWidth={2.5} />
                </View>
                <Button variant="ghost" style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
                  <X size={22} color={colors.textTertiary} />
                </Button>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('subscription.tailorCraftPro')}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('subscription.unlimitedAccess')}</Text>
                <Button variant="primary" onPress={onClose} style={styles.fullWidthBtn}>{t('common.close')}</Button>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    );
  }

  const selectedPrice = getSelectedPrice();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.overlay, { backgroundColor: Platform.OS === 'web' ? colors.overlayModal : 'transparent' }]}>
            {Platform.OS !== 'web' && (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.centered} pointerEvents="box-none">
          <Animated.View
            style={[styles.card, { backgroundColor: colors.surface, maxHeight: SCREEN_HEIGHT * 0.9 }]}
            entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
            exiting={modalExiting}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Button
                variant="ghost"
                style={styles.closeBtn}
                onPress={onClose}
                disabled={loading}
                accessibilityLabel="Close"
              >
                <X size={22} color={colors.textTertiary} />
              </Button>

              {/* Header with Crown Icon */}
              <View style={[styles.iconRing, { backgroundColor: `${colors.primary}20` }]}>
                <Crown size={36} color={colors.primary} strokeWidth={2.5} />
              </View>
              
              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('subscription.tailorCraftPro')}
              </Text>

              {/* Price Display */}
              {selectedPrice && (
                <View style={styles.priceContainer}>
                  <Text style={[styles.priceText, { color: colors.textPrimary }]}>
                    {selectedPrice.formatted || `${selectedPrice.amount} ${selectedPrice.currency}`}
                  </Text>
                  <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                    {getSelectedPeriodLabel()}
                  </Text>
                </View>
              )}

              {/* Feature List */}
              <View style={styles.featuresContainer}>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Users size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                    {t('subscription.proFeatures.unlimitedClients')}
                  </Text>
                  <Check size={18} color={colors.success} strokeWidth={2.5} />
                </View>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <ShoppingBag size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                    {t('subscription.proFeatures.unlimitedOrders')}
                  </Text>
                  <Check size={18} color={colors.success} strokeWidth={2.5} />
                </View>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <FileText size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                    {t('subscription.proFeatures.pdfGeneration')}
                  </Text>
                  <Check size={18} color={colors.success} strokeWidth={2.5} />
                </View>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Sparkles size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                    {t('subscription.proFeatures.aiPreview')}
                  </Text>
                  <Check size={18} color={colors.success} strokeWidth={2.5} />
                </View>
              </View>

              {/* Plan Selection */}
              <View style={styles.planSelectionContainer}>
                <Text style={[styles.planSelectionTitle, { color: colors.textPrimary }]}>
                  {t('subscription.selectPlan')}
                </Text>
                <View style={styles.planOptions}>
                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedPlan === 'monthly' && { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
                    ]}
                    onPress={() => handlePlanSelect('monthly')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.planOptionContent}>
                      <Text
                        style={[
                          styles.planOptionText,
                          { color: colors.textSecondary },
                          selectedPlan === 'monthly' && { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {t('subscription.monthly')}
                      </Text>
                      {prices.monthly ? (
                        <>
                          <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>
                            {prices.monthly.formatted || `${prices.monthly.amount} ${prices.monthly.currency}`}
                          </Text>
                          <Text style={[styles.planOptionPeriod, { color: colors.textSecondary }]}>
                            {t('subscription.perMonth')}
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>
                          {t('subscription.priceLoading')}
                        </Text>
                      )}
                    </View>
                    {selectedPlan === 'monthly' && (
                      <View style={[styles.planOptionCheck, { backgroundColor: colors.primary }]}>
                        <Check size={12} color={colors.textInverse} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedPlan === 'yearly' && { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
                    ]}
                    onPress={() => handlePlanSelect('yearly')}
                    activeOpacity={0.7}
                  >
                    {prices.monthly && prices.yearly && (
                      <View style={[styles.planOptionBadge, { backgroundColor: colors.success }]}>
                        <Text style={[styles.planOptionBadgeText, { color: colors.textInverse }]}>
                          {t('subscription.save')}
                        </Text>
                      </View>
                    )}
                    <View style={styles.planOptionContent}>
                      <Text
                        style={[
                          styles.planOptionText,
                          { color: colors.textSecondary },
                          selectedPlan === 'yearly' && { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        {t('subscription.yearly')}
                      </Text>
                      {prices.yearly ? (
                        <>
                          <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>
                            {prices.yearly.formatted || `${prices.yearly.amount} ${prices.yearly.currency}`}
                          </Text>
                          <Text style={[styles.planOptionPeriod, { color: colors.textSecondary }]}>
                            {t('subscription.perYear')}
                          </Text>
                          {prices.monthly && (
                            <Text style={[styles.planOptionSavings, { color: colors.success }]}>
                              {t('subscription.savingsAmount', {
                                amount: (prices.monthly.amount * 12 - prices.yearly.amount).toFixed(2),
                                currency: prices.monthly.currency,
                              })}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>
                          {t('subscription.priceLoading')}
                        </Text>
                      )}
                    </View>
                    {selectedPlan === 'yearly' && (
                      <View style={[styles.planOptionCheck, { backgroundColor: colors.primary }]}>
                        <Check size={12} color={colors.textInverse} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subscribe Button */}
              <Button
                variant="primary"
                onPress={handleUpgrade}
                disabled={loading || !selectedPrice}
                loading={loading}
                style={styles.fullWidthBtn}
              >
                {t('subscription.subscribe')}
              </Button>

              {/* Restore Purchases Button */}
              {isIAPSupported && (
                <TouchableOpacity 
                  style={styles.restoreBtn} 
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                  activeOpacity={0.7}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.restoreText, { color: colors.primary }]}>
                      {t('subscription.restorePurchases')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Auto-Renewal Disclosure (Apple Required) */}
              <View style={styles.legalContainer}>
                <Text style={[styles.legalText, { color: colors.textTertiary }]}>
                  {t('subscription.autoRenewal.chargeDisclosure')}
                </Text>
                <Text style={[styles.legalText, { color: colors.textTertiary }]}>
                  {t('subscription.autoRenewal.renewalDisclosure')}
                </Text>
                <Text style={[styles.legalText, { color: colors.textTertiary }]}>
                  {t('subscription.autoRenewal.renewalCharge')}
                </Text>
                <Text style={[styles.legalText, { color: colors.textTertiary }]}>
                  {t('subscription.autoRenewal.manageDisclosure')}
                </Text>
              </View>

              {/* Legal Links (Apple Required) */}
              <View style={styles.legalLinksContainer}>
                <TouchableOpacity onPress={openPrivacyPolicy} activeOpacity={0.7}>
                  <Text style={[styles.legalLink, { color: colors.primary }]}>
                    {t('subscription.legal.privacyPolicy')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.legalSeparator, { color: colors.textTertiary }]}>|</Text>
                <TouchableOpacity onPress={openTermsOfUse} activeOpacity={0.7}>
                  <Text style={[styles.legalLink, { color: colors.primary }]}>
                    {t('subscription.legal.termsOfUse')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Not Now Button */}
              <TouchableOpacity 
                style={styles.notNowBtn} 
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.notNowText, { color: colors.textSecondary }]}>
                  {t('subscription.notNow')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: BorderRadius.xxl,
    ...Shadows.xl,
    ...(Platform.OS === 'ios' && {
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 24,
    }),
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  cardInner: {
    padding: 28,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 16,
    marginBottom: 24,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 14,
    marginTop: 2,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  planSelectionContainer: {
    width: '100%',
    marginBottom: 16,
  },
  planSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  planOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  planOption: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 100,
  },
  planOptionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planOptionPrice: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  planOptionPeriod: {
    fontSize: 11,
    marginBottom: 4,
  },
  planOptionSavings: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  planOptionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  planOptionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  planOptionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthBtn: {
    width: '100%',
    marginBottom: 12,
  },
  restoreBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legalContainer: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  legalText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 13,
  },
  notNowBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  notNowText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
