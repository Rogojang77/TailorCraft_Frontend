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
import { Spacing, Typography, HeaderStyles, Shadows, BorderRadius, StatusStyles } from '@/constants/design';
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
                <View style={[styles.usageSection, { backgroundColor: colors.surface }]}>
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
                      clientsNearLimit && { backgroundColor: `${colors.warning}20` }
                    ]}>
                      <View
                        style={[
                          styles.progressBar,
                          { backgroundColor: colors.primary },
                          clientsNearLimit && { backgroundColor: colors.warning },
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
                      ordersNearLimit && { backgroundColor: `${colors.warning}20` }
                    ]}>
                      <View
                        style={[
                          styles.progressBar,
                          { backgroundColor: colors.primary },
                          ordersNearLimit && { backgroundColor: colors.warning },
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
            <View style={[styles.actionsSection, { backgroundColor: colors.surface }]}>
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
                          { backgroundColor: colors.background, borderColor: colors.border },
                          selectedPlan === 'monthly' && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
                        ]}
                        onPress={() => setSelectedPlan('monthly')}
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
                            <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>{t('subscription.priceLoading')}</Text>
                          )}
                        </View>
                        {selectedPlan === 'monthly' && (
                          <View style={[styles.planOptionCheck, { backgroundColor: colors.primary }]}>
                            <View style={[styles.planOptionCheckInner, { backgroundColor: colors.textInverse }]} />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.planOption,
                          { backgroundColor: colors.background, borderColor: colors.border },
                          selectedPlan === 'yearly' && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
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
                                  {t('subscription.savingsAmount', { amount: (prices.monthly.amount * 12 - prices.yearly.amount).toFixed(2), currency: prices.monthly.currency })}
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={[styles.planOptionPrice, { color: colors.textPrimary }]}>{t('subscription.priceLoading')}</Text>
                          )}
                        </View>
                        {selectedPlan === 'yearly' && (
                          <View style={[styles.planOptionCheck, { backgroundColor: colors.primary }]}>
                            <View style={[styles.planOptionCheckInner, { backgroundColor: colors.textInverse }]} />
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
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: colors.background, borderTopColor: colors.border }]}>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h2,
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
    padding: Spacing.md,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
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
    paddingVertical: Spacing.xl,
  },
  checkingText: {
    ...Typography.caption,
    marginTop: Spacing.md,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.caption,
    marginTop: Spacing.md,
  },
  errorContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },

  // Plan Card
  planCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    ...Shadows.md,
  },
  planCardPro: {},
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  crownIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  planTitle: {
    ...Typography.h3,
    fontSize: 22,
  },
  planDescription: {
    ...Typography.body,
    marginBottom: Spacing.sm,
  },
  proConfirmationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  proConfirmationText: {
    ...Typography.small,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Usage Section
  usageSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  usageItem: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
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
      marginBottom: Spacing.xs,
  },
  usageIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  usageLabel: {
    ...Typography.body,
  },
  usageCount: {
    ...Typography.bodyBold,
    fontSize: 18,
  },
  usageCountSecondary: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  limitWarningBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  limitWarningText: {
    ...Typography.small,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressBarContainerWarning: {},
  progressBar: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressBarWarning: {},

  // Actions Section
  actionsSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  upgradeHint: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  upgradeValueStatement: {
    ...Typography.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  proConfirmation: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
  },
  proConfirmationLargeText: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  planSelectionContainer: {
    marginBottom: Spacing.md,
  },
  planSelectionLabel: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  planOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
    minHeight: 90,
  },
  planOptionSelected: {},
  planOptionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionText: {
    ...Typography.body,
    fontSize: 14,
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
    borderRadius: BorderRadius.sm,
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
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  restoreButtonDisabled: {
    opacity: 0.7,
  },
  restoreButtonText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
});
