import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n';
import { ChevronLeft, Crown, User, ShoppingBag, RefreshCw } from 'lucide-react-native';
import { useSubscription, usePremium, SubscriptionPlanType } from '@/contexts/SubscriptionContext';
import { PaywallModal, SubscriptionManagement } from '@/components/subscription';
import { Button } from '@/components/ui/Button';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { 
    subscription, 
    subscriptionState,
    prices, 
    isLoading, 
    refreshSubscription, 
    upgradeToPro, 
    getUsageForDisplay, 
    getLimitMessages, 
    purchasing,
    restorePurchases,
    isIAPSupported,
  } = useSubscription();
  const { isPremium: isPro, refreshEntitlements, inGracePeriod, billingIssue } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('monthly');
  const [isRestoring, setIsRestoring] = useState(false);

  // Defense-in-depth: never show upgrade/plan UI when backend says PRO (avoids confusion)
  const isProFromBackend = subscription?.plan === 'PRO' || subscriptionState === 'active';
  const showUpgradeUI = !isProFromBackend;

  const handleUpgrade = async (plan: SubscriptionPlanType) => {
    try {
      const result = await upgradeToPro(plan);
      if (result.success) {
        await refreshEntitlements();
        setShowPaywall(false);
        Alert.alert(
          t('alerts.subscriptionSuccessTitle'),
          t('alerts.subscriptionSuccessMessage'),
          [{ text: t('common.ok') }]
        );
      } else if (result.errorMessage) {
        Alert.alert(t('common.error'), result.errorMessage);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('subscription.checkoutError'));
    }
  };

  const handleRestorePurchases = async () => {
    if (!isIAPSupported) return;
    
    setIsRestoring(true);
    try {
      await restorePurchases();
      await refreshEntitlements();
      await refreshSubscription(true);
    } finally {
      setIsRestoring(false);
    }
  };

  const purchaseButtonDisabled = purchasing;

  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer noPadding>
      {isLoading ? (
        <View style={styles.checkingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.checkingText, { color: colors.textSecondary }]}>{t('subscription.verifying')}</Text>
        </View>
      ) : (
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isLoading && !subscription && (
            <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{t('subscription.loadError')}</Text>
            </View>
          )}

          {!isLoading && subscription && (
            <>
            {showUpgradeUI && (() => {
              const usage = getUsageForDisplay();
              const maxC = usage.clients.max || 1;
              const maxO = usage.orders.max || 1;
              const clientsPercent = (usage.clients.current / maxC) * 100;
              const ordersPercent = (usage.orders.current / maxO) * 100;
              const clientsNearLimit = clientsPercent >= 80;
              const ordersNearLimit = ordersPercent >= 80;
              const nextBlockingLimit = clientsPercent > ordersPercent ? 'clients' : 'orders';
              
              return (
                <View style={[styles.usageSection, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('subscription.usage')}</Text>
                  <View style={[styles.usageItem, { borderBottomColor: colors.borderLight }]}>
                    <View style={styles.usageHeader}>
                      <View style={styles.usageIconLabel}>
                        <User size={18} color={colors.textSecondary} strokeWidth={2} />
                        <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>{t('subscription.clients')}</Text>
                      </View>
                      {clientsNearLimit && nextBlockingLimit === 'clients' && (
                        <View style={[styles.limitWarningBadge, { backgroundColor: colors.warning }]}>
                          <Text style={[styles.limitWarningText, { color: colors.textInverse }]}>{t('subscription.limitNear')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.progressBarContainer,
                      { backgroundColor: colors.borderLight },
                      clientsNearLimit && { backgroundColor: `${colors.brassDeep ?? colors.brass ?? colors.warning}20` }
                    ]}>
                      <View
                        style={[
                          styles.progressBar,
                          { backgroundColor: colors.primary },
                          clientsNearLimit && { backgroundColor: colors.brassDeep ?? colors.brass ?? colors.warning },
                          { width: `${clientsPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.usageCountSecondary, { color: colors.textTertiary }]}>
                      {t('subscription.usageCount', { current: usage.clients.current, max: usage.clients.max })}
                    </Text>
                  </View>
                  <View style={[styles.usageItem, styles.usageItemLast]}>
                    <View style={styles.usageHeader}>
                      <View style={styles.usageIconLabel}>
                        <ShoppingBag size={18} color={colors.textSecondary} strokeWidth={2} />
                        <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>{t('subscription.orders')}</Text>
                      </View>
                      {ordersNearLimit && nextBlockingLimit === 'orders' && (
                        <View style={[styles.limitWarningBadge, { backgroundColor: colors.warning }]}>
                          <Text style={[styles.limitWarningText, { color: colors.textInverse }]}>{t('subscription.limitNear')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.progressBarContainer,
                      { backgroundColor: colors.borderLight },
                      ordersNearLimit && { backgroundColor: `${colors.brassDeep ?? colors.brass ?? colors.warning}20` }
                    ]}>
                      <View
                        style={[
                          styles.progressBar,
                          { backgroundColor: colors.primary },
                          ordersNearLimit && { backgroundColor: colors.brassDeep ?? colors.brass ?? colors.warning },
                          { width: `${ordersPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.usageCountSecondary, { color: colors.textTertiary }]}>
                      {t('subscription.usageCount', { current: usage.orders.current, max: usage.orders.max })}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Actions Section */}
            <View style={[styles.actionsSection, { backgroundColor: colors.card }]}>
              {showUpgradeUI ? (
                <>
                  <Text style={[styles.upgradeHint, { color: colors.textSecondary }]}>
                    {getLimitMessages().upgradeHint}
                  </Text>
                  
                  {/* Plan Selection */}
                  <View style={styles.planSelectionContainer}>
                    <Text style={[styles.planSelectionLabel, { color: colors.textPrimary }]}>{t('subscription.selectPlan')}</Text>
                    <View style={styles.planOptions}>
                      <TouchableOpacity
                        style={[
                          styles.planOption,
                          { backgroundColor: colors.paper ?? colors.background, borderColor: colors.rule ?? colors.border },
                          selectedPlan === 'monthly' && { borderColor: colors.brass ?? colors.primary, backgroundColor: `${colors.brass ?? colors.primary}10` },
                        ]}
                        onPress={() => setSelectedPlan('monthly')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.planOptionContent}>
                          <Text
                            style={[
                              styles.planOptionText,
                              { color: colors.textSecondary },
                              selectedPlan === 'monthly' && { color: colors.brass ?? colors.primary, fontWeight: '700' },
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
                            <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>{t('subscription.priceLoading')}</Text>
                          )}
                        </View>
                        {selectedPlan === 'monthly' && (
                          <View style={[styles.planOptionCheck, { backgroundColor: colors.brass ?? colors.primary }]}>
                            <View style={[styles.planOptionCheckInner, { backgroundColor: colors.paper ?? '#EFE9DC' }]} />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.planOption,
                          { backgroundColor: colors.paper ?? colors.background, borderColor: colors.rule ?? colors.border },
                          selectedPlan === 'yearly' && { borderColor: colors.brass ?? colors.primary, backgroundColor: `${colors.brass ?? colors.primary}10` },
                        ]}
                        onPress={() => setSelectedPlan('yearly')}
                        activeOpacity={0.7}
                      >
                        {prices.monthly && prices.yearly && (
                          <View style={[styles.planOptionBadge, { backgroundColor: colors.success }]}>
                            <Text style={[styles.planOptionBadgeText, { color: colors.textInverse }]}>{t('subscription.save')}</Text>
                          </View>
                        )}
                        <View style={styles.planOptionContent}>
                          <Text
                            style={[
                              styles.planOptionText,
                              { color: colors.textSecondary },
                              selectedPlan === 'yearly' && { color: colors.brass ?? colors.primary, fontWeight: '700' },
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
                                  {t('subscription.savingsAmount', { amount: (prices.monthly.amount * 12 - prices.yearly.amount).toFixed(2), currency: prices.monthly.currency })}
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>{t('subscription.priceLoading')}</Text>
                          )}
                        </View>
                        {selectedPlan === 'yearly' && (
                          <View style={[styles.planOptionCheck, { backgroundColor: colors.brass ?? colors.primary }]}>
                            <View style={[styles.planOptionCheckInner, { backgroundColor: colors.paper ?? '#EFE9DC' }]} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.upgradeValueStatement, { color: colors.textSecondary }]}>
                    {t('subscription.unlimitedAccess')}
                  </Text>

                  {/* Restore Purchases Button for Free Users */}
                  {isIAPSupported && (
                    <TouchableOpacity
                      style={[
                        styles.restoreButton,
                        { borderColor: colors.border },
                        isRestoring && styles.restoreButtonDisabled,
                      ]}
                      onPress={handleRestorePurchases}
                      disabled={isRestoring}
                      activeOpacity={0.7}
                    >
                      {isRestoring ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
                          <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                            {t('subscription.restorePurchases')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <SubscriptionManagement />
              )}
            </View>
          </>
          )}
        </ScrollView>

        {(!subscription || showUpgradeUI) && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, AtelierSpacing.md), backgroundColor: colors.paper ?? colors.background, borderTopColor: colors.rule ?? colors.border }]}>
            {!subscription ? (
              <Button variant="primary" fullWidth onPress={() => refreshSubscription(true)} style={styles.footerButton}>
                {t('common.retry')}
              </Button>
            ) : showUpgradeUI ? (
              <Button
                variant="primary"
                fullWidth
                onPress={() => setShowPaywall(true)}
                leftIcon={<Crown size={18} color={colors.textInverse} strokeWidth={2.5} />}
                style={styles.footerButton}
              >
                {t('subscription.upgradeToPro')}
              </Button>
            ) : null}
          </View>
        )}
      </View>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={(plan) => handleUpgrade(plan)}
        loading={purchaseButtonDisabled}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: AtelierSpacing.md,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
  },
  footerButton: {
    width: '100%',
  },

  // Loading & Error States
  checkingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AtelierSpacing.xl,
  },
  checkingText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.md,
  },
  loadingContainer: {
    paddingVertical: AtelierSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.md,
  },
  errorContainer: {
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.lg,
    alignItems: 'center',
    ...AtelierShadow.elevated,
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Plan Card
  planCard: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    borderWidth: 2,
    ...AtelierShadow.elevated,
  },
  planCardPro: {},
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  crownIcon: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  planTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  planDescription: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.sm,
  },
  proConfirmationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.xs,
    borderRadius: AtelierRadius.full,
    marginTop: AtelierSpacing.sm,
  },
  proConfirmationText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Usage Section
  usageSection: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    ...AtelierShadow.elevated,
  },
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.md,
  },
  usageItem: {
    marginBottom: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  usageItemLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.xs,
  },
  usageIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  usageLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  usageCount: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 18,
    lineHeight: 22,
  },
  usageCountSecondary: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    marginTop: AtelierSpacing.sm,
    textAlign: 'right',
  },
  limitWarningBadge: {
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 2,
    borderRadius: AtelierRadius.sm,
  },
  limitWarningText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: AtelierRadius.full,
    overflow: 'hidden',
    marginTop: AtelierSpacing.sm,
  },
  progressBarContainerWarning: {},
  progressBar: {
    height: '100%',
    borderRadius: AtelierRadius.full,
  },
  progressBarWarning: {},

  // Actions Section
  actionsSection: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    ...AtelierShadow.elevated,
  },
  upgradeHint: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.md,
  },
  upgradeValueStatement: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: AtelierSpacing.sm,
  },
  proConfirmation: {
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.md,
    borderLeftWidth: 4,
  },
  proConfirmationLargeText: {
    fontFamily: FontFamily.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  planSelectionContainer: {
    marginBottom: AtelierSpacing.md,
  },
  planSelectionLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: AtelierSpacing.xs,
  },
  planOptions: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
  },
  planOption: {
    flex: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 90,
  },
  planOptionSelected: {},
  planOptionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  planOptionTextSelected: {
    fontWeight: '700',
  },
  planOptionPrice: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  planOptionPeriod: {
    fontSize: 12,
    marginBottom: 4,
  },
  planOptionSavings: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  planOptionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: AtelierRadius.sm,
  },
  planOptionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planOptionCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionCheckInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    marginTop: AtelierSpacing.md,
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
  },
  restoreButtonDisabled: {
    opacity: 0.7,
  },
  restoreButtonText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
});
