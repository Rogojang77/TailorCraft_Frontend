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
import * as Haptics from 'expo-haptics';
import { Crown, X, Check, Users, ShoppingBag, FileText, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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

  const openPrivacyPolicy = () => Linking.openURL(PRIVACY_POLICY_URL);
  const openTermsOfUse = () => Linking.openURL(TERMS_OF_USE_URL);

  const getSelectedPrice = () => selectedPlan === 'monthly' ? prices.monthly : prices.yearly;
  const getSelectedPeriodLabel = () => selectedPlan === 'monthly' ? t('subscription.perMonth') : t('subscription.perYear');

  const brassColor = colors.brass ?? colors.primary;
  const cardBg = colors.card;
  const paperColor = colors.paper ?? '#EFE9DC';

  if (!visible) return null;

  if (subscriptionLoading) {
    return (
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <View style={styles.root}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={[styles.overlay, { backgroundColor: Platform.OS === 'web' ? 'rgba(27,22,17,0.5)' : 'transparent' }]}>
              {Platform.OS !== 'web' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.centered} pointerEvents="box-none">
            <Animated.View
              style={[styles.card, { backgroundColor: cardBg }]}
              entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
              exiting={modalExiting}
            >
              <View style={styles.cardInner}>
                <View style={[styles.iconRing, { backgroundColor: brassColor + '20' }]}>
                  <Crown size={32} color={brassColor} strokeWidth={2.5} />
                </View>
                <Button variant="ghost" style={styles.closeBtn} onPress={onClose} disabled={loading} accessibilityLabel="Close">
                  <X size={22} color={colors.ink4 ?? colors.textTertiary} />
                </Button>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('subscription.tailorCraftPro')}</Text>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={brassColor} />
                  <Text style={[styles.caption, { color: colors.ink3 }]}>{t('subscription.verifying')}</Text>
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
            <View style={[styles.overlay, { backgroundColor: Platform.OS === 'web' ? 'rgba(27,22,17,0.5)' : 'transparent' }]}>
              {Platform.OS !== 'web' && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />}
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.centered} pointerEvents="box-none">
            <Animated.View
              style={[styles.card, { backgroundColor: cardBg }]}
              entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
              exiting={modalExiting}
            >
              <View style={styles.cardInner}>
                <View style={[styles.iconRing, { backgroundColor: brassColor + '20' }]}>
                  <Crown size={32} color={brassColor} strokeWidth={2.5} />
                </View>
                <Button variant="ghost" style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
                  <X size={22} color={colors.ink4 ?? colors.textTertiary} />
                </Button>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('subscription.tailorCraftPro')}</Text>
                <Text style={[styles.subtitle, { color: colors.ink3 }]}>{t('subscription.unlimitedAccess')}</Text>
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
          <View style={[styles.overlay, { backgroundColor: Platform.OS === 'web' ? 'rgba(27,22,17,0.5)' : 'transparent' }]}>
            {Platform.OS !== 'web' && (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.centered} pointerEvents="box-none">
          <Animated.View
            style={[styles.card, { backgroundColor: cardBg, maxHeight: SCREEN_HEIGHT * 0.9 }]}
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
                <X size={22} color={colors.ink4 ?? colors.textTertiary} />
              </Button>

              <View style={[styles.iconRing, { backgroundColor: brassColor + '20' }]}>
                <Crown size={36} color={brassColor} strokeWidth={2.5} />
              </View>

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('subscription.tailorCraftPro')}
              </Text>

              {selectedPrice && (
                <View style={styles.priceContainer}>
                  <Text style={[styles.priceText, { color: colors.textPrimary }]}>
                    {selectedPrice.formatted || `${selectedPrice.amount} ${selectedPrice.currency}`}
                  </Text>
                  <Text style={[styles.pricePeriod, { color: colors.ink3 }]}>
                    {getSelectedPeriodLabel()}
                  </Text>
                </View>
              )}

              <View style={styles.featuresContainer}>
                {[
                  { Icon: Users, key: 'unlimitedClients' },
                  { Icon: ShoppingBag, key: 'unlimitedOrders' },
                  { Icon: FileText, key: 'pdfGeneration' },
                  { Icon: Sparkles, key: 'aiPreview' },
                ].map(({ Icon, key }) => (
                  <View key={key} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: brassColor + '18' }]}>
                      <Icon size={18} color={brassColor} strokeWidth={2} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                      {t(`subscription.proFeatures.${key}`)}
                    </Text>
                    <Check size={18} color={colors.pine ?? colors.success} strokeWidth={2.5} />
                  </View>
                ))}
              </View>

              <View style={styles.planSelectionContainer}>
                <Text style={[styles.planSelectionTitle, { color: colors.textPrimary }]}>
                  {t('subscription.selectPlan')}
                </Text>
                <View style={styles.planOptions}>
                  {(['monthly', 'yearly'] as const).map((plan) => {
                    const isSelected = selectedPlan === plan;
                    const price = plan === 'monthly' ? prices.monthly : prices.yearly;
                    return (
                      <TouchableOpacity
                        key={plan}
                        style={[
                          styles.planOption,
                          { backgroundColor: colors.paper ?? colors.background, borderColor: colors.rule ?? colors.border },
                          isSelected && { borderColor: brassColor, backgroundColor: brassColor + '10' },
                        ]}
                        onPress={() => handlePlanSelect(plan)}
                        activeOpacity={0.7}
                      >
                        {plan === 'yearly' && prices.monthly && prices.yearly && (
                          <View style={[styles.planOptionBadge, { backgroundColor: colors.pine ?? colors.success }]}>
                            <Text style={[styles.planOptionBadgeText, { color: paperColor }]}>
                              {t('subscription.save')}
                            </Text>
                          </View>
                        )}
                        <View style={styles.planOptionContent}>
                          <Text style={[styles.planOptionText, { color: colors.ink3 }, isSelected && { color: brassColor }]}>
                            {t(`subscription.${plan}`)}
                          </Text>
                          {price ? (
                            <>
                              <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>
                                {price.formatted || `${price.amount} ${price.currency}`}
                              </Text>
                              <Text style={[styles.planOptionPeriod, { color: colors.ink3 }]}>
                                {t(`subscription.per${plan === 'monthly' ? 'Month' : 'Year'}`)}
                              </Text>
                              {plan === 'yearly' && prices.monthly && (
                                <Text style={[styles.planOptionSavings, { color: colors.pine ?? colors.success }]}>
                                  {t('subscription.savingsAmount', {
                                    amount: (prices.monthly.amount * 12 - price.amount).toFixed(2),
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
                        {isSelected && (
                          <View style={[styles.planOptionCheck, { backgroundColor: brassColor }]}>
                            <Check size={12} color={paperColor} strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Button
                variant="primary"
                onPress={handleUpgrade}
                disabled={loading || !selectedPrice}
                loading={loading}
                style={styles.fullWidthBtn}
              >
                {t('subscription.subscribe')}
              </Button>

              {isIAPSupported && (
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                  activeOpacity={0.7}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={brassColor} />
                  ) : (
                    <Text style={[styles.restoreText, { color: brassColor }]}>
                      {t('subscription.restorePurchases')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.legalContainer}>
                {[
                  'chargeDisclosure',
                  'renewalDisclosure',
                  'renewalCharge',
                  'manageDisclosure',
                ].map((key) => (
                  <Text key={key} style={[styles.legalText, { color: colors.ink4 ?? colors.textTertiary }]}>
                    {t(`subscription.autoRenewal.${key}`)}
                  </Text>
                ))}
              </View>

              <View style={styles.legalLinksContainer}>
                <TouchableOpacity onPress={openPrivacyPolicy} activeOpacity={0.7}>
                  <Text style={[styles.legalLink, { color: brassColor }]}>
                    {t('subscription.legal.privacyPolicy')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.legalSeparator, { color: colors.ink4 ?? colors.textTertiary }]}>|</Text>
                <TouchableOpacity onPress={openTermsOfUse} activeOpacity={0.7}>
                  <Text style={[styles.legalLink, { color: brassColor }]}>
                    {t('subscription.legal.termsOfUse')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.notNowBtn}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.notNowText, { color: colors.ink3 }]}>
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
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: AtelierRadius.xl,
    ...AtelierShadow.elevated,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: AtelierSpacing.lg,
    alignItems: 'center',
  },
  cardInner: {
    padding: AtelierSpacing.xl,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: AtelierRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
    marginTop: AtelierSpacing.sm,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: AtelierSpacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.lg,
  },
  caption: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    marginTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.lg,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  priceText: {
    fontFamily: FontFamily.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: AtelierSpacing.md,
    gap: AtelierSpacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  planSelectionContainer: {
    width: '100%',
    marginBottom: AtelierSpacing.md,
  },
  planSelectionTitle: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.sm,
    textAlign: 'center',
  },
  planOptions: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    width: '100%',
  },
  planOption: {
    flex: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.sm,
    borderWidth: 1.5,
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
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  planOptionPrice: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 2,
  },
  planOptionPeriod: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  planOptionSavings: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  planOptionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 3,
    borderRadius: AtelierRadius.full,
  },
  planOptionBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  planOptionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: AtelierRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthBtn: {
    width: '100%',
    marginBottom: AtelierSpacing.sm,
  },
  restoreBtn: {
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
  },
  restoreText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  legalContainer: {
    width: '100%',
    paddingHorizontal: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.md,
  },
  legalText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.sm,
  },
  legalLink: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
  },
  notNowBtn: {
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
  },
  notNowText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
});
