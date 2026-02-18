import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n';
import { ChevronLeft, Crown, User, ShoppingBag } from 'lucide-react-native';
import { useSubscription, SubscriptionPlanType } from '@/contexts/SubscriptionContext';
import { usePremium } from '@/contexts/PremiumContext';
import { ProBadge } from '@/components/ProBadge';
import { PaywallModal } from '@/components/PaywallModal';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, HeaderStyles, Shadows, BorderRadius, StatusStyles } from '@/constants/design';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { subscription, prices, isLoading, refreshSubscription, upgradeToPro, getUsageForDisplay, getLimitMessages, purchasing } = useSubscription();
  const { isPremium: isPro, refreshEntitlements, inGracePeriod, billingIssue } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('monthly');

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

  const purchaseButtonDisabled = purchasing;

  const isFree = !isPro;
  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <Button variant="back" onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Button>
        <Text style={styles.title}>{t('subscription.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <FullScreenLoader message={t('subscription.loading')} />
      ) : (
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isLoading && !subscription && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{t('subscription.loadError')}</Text>
            </View>
          )}

          {!isLoading && subscription && (
            <>
            {isFree && (() => {
              const usage = getUsageForDisplay();
              const maxC = usage.clients.max || 1;
              const maxO = usage.orders.max || 1;
              const clientsPercent = (usage.clients.current / maxC) * 100;
              const ordersPercent = (usage.orders.current / maxO) * 100;
              const clientsNearLimit = clientsPercent >= 80;
              const ordersNearLimit = ordersPercent >= 80;
              const nextBlockingLimit = clientsPercent > ordersPercent ? 'clients' : 'orders';
              
              return (
                <View style={styles.usageSection}>
                  <Text style={styles.sectionTitle}>{t('subscription.usage')}</Text>
                  <View style={styles.usageItem}>
                    <View style={styles.usageHeader}>
                      <View style={styles.usageIconLabel}>
                        <User size={18} color={Colors.textSecondary} strokeWidth={2} />
                        <Text style={styles.usageLabel}>{t('subscription.clients')}</Text>
                      </View>
                      {clientsNearLimit && nextBlockingLimit === 'clients' && (
                        <View style={styles.limitWarningBadge}>
                          <Text style={styles.limitWarningText}>{t('subscription.limitNear')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.progressBarContainer,
                      clientsNearLimit && styles.progressBarContainerWarning
                    ]}>
                      <View
                        style={[
                          styles.progressBar,
                          clientsNearLimit && styles.progressBarWarning,
                          { width: `${clientsPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.usageCountSecondary}>
                      {t('subscription.usageCount', { current: usage.clients.current, max: usage.clients.max })}
                    </Text>
                  </View>
                  <View style={[styles.usageItem, styles.usageItemLast]}>
                    <View style={styles.usageHeader}>
                      <View style={styles.usageIconLabel}>
                        <ShoppingBag size={18} color={Colors.textSecondary} strokeWidth={2} />
                        <Text style={styles.usageLabel}>{t('subscription.orders')}</Text>
                      </View>
                      {ordersNearLimit && nextBlockingLimit === 'orders' && (
                        <View style={styles.limitWarningBadge}>
                          <Text style={styles.limitWarningText}>{t('subscription.limitNear')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.progressBarContainer,
                      ordersNearLimit && styles.progressBarContainerWarning
                    ]}>
                      <View
                        style={[
                          styles.progressBar,
                          ordersNearLimit && styles.progressBarWarning,
                          { width: `${ordersPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.usageCountSecondary}>
                      {t('subscription.usageCount', { current: usage.orders.current, max: usage.orders.max })}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Actions Section */}
            <View style={styles.actionsSection}>
              {isFree ? (
                <>
                  <Text style={styles.upgradeHint}>
                    {getLimitMessages().upgradeHint}
                  </Text>
                  
                  {/* Plan Selection */}
                  <View style={styles.planSelectionContainer}>
                    <Text style={styles.planSelectionLabel}>{t('subscription.selectPlan')}</Text>
                    <View style={styles.planOptions}>
                      <TouchableOpacity
                        style={[
                          styles.planOption,
                          selectedPlan === 'monthly' && styles.planOptionSelected,
                        ]}
                        onPress={() => setSelectedPlan('monthly')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.planOptionContent}>
                          <Text
                            style={[
                              styles.planOptionText,
                              selectedPlan === 'monthly' && styles.planOptionTextSelected,
                            ]}
                          >
                            {t('subscription.monthly')}
                          </Text>
                          {prices.monthly ? (
                            <>
                              <Text style={styles.planOptionPrice}>
                                {prices.monthly.amount} {prices.monthly.currency}
                              </Text>
                              <Text style={styles.planOptionPeriod}>
                                / {prices.monthly.period}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.planOptionPrice}>{t('subscription.priceLoading')}</Text>
                          )}
                        </View>
                        {selectedPlan === 'monthly' && (
                          <View style={styles.planOptionCheck}>
                            <View style={styles.planOptionCheckInner} />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.planOption,
                          selectedPlan === 'yearly' && styles.planOptionSelected,
                        ]}
                        onPress={() => setSelectedPlan('yearly')}
                        activeOpacity={0.7}
                      >
                        {selectedPlan === 'yearly' && (
                          <View style={styles.planOptionBadge}>
                            <Text style={styles.planOptionBadgeText}>{t('subscription.save')}</Text>
                          </View>
                        )}
                        <View style={styles.planOptionContent}>
                          <Text
                            style={[
                              styles.planOptionText,
                              selectedPlan === 'yearly' && styles.planOptionTextSelected,
                            ]}
                          >
                            {t('subscription.yearly')}
                          </Text>
                          {prices.yearly ? (
                            <>
                              <Text style={styles.planOptionPrice}>
                                {prices.yearly.amount} {prices.yearly.currency}
                              </Text>
                              <Text style={styles.planOptionPeriod}>
                                / {prices.yearly.period}
                              </Text>
                              {prices.monthly && (
                                <Text style={styles.planOptionSavings}>
                                  {t('subscription.savingsAmount', { amount: (prices.monthly.amount * 12 - prices.yearly.amount).toFixed(2), currency: prices.monthly.currency })}
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={styles.planOptionPrice}>{t('subscription.priceLoading')}</Text>
                          )}
                        </View>
                        {selectedPlan === 'yearly' && (
                          <View style={styles.planOptionCheck}>
                            <View style={styles.planOptionCheckInner} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.upgradeValueStatement}>
                    {t('subscription.unlimitedAccess')}
                  </Text>
                </>
              ) : (
                <SubscriptionManagement />
              )}
            </View>
          </>
          )}
        </ScrollView>

        {(!subscription || isFree) && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            {!subscription ? (
              <Button variant="primary" fullWidth onPress={() => refreshSubscription(true)} style={styles.footerButton}>
                {t('common.retry')}
              </Button>
            ) : isFree ? (
              <Button
                variant="primary"
                fullWidth
                onPress={() => setShowPaywall(true)}
                leftIcon={<Crown size={18} color={Colors.textInverse} strokeWidth={2.5} />}
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
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButton: {
    width: '100%',
  },

  // Loading & Error States
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },

  // Plan Card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  planCardPro: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.primary,
  },
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
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  planTitle: {
    ...Typography.h3,
    fontSize: 22,
  },
  planDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  proConfirmationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  proConfirmationText: {
    ...Typography.small,
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Usage Section
  usageSection: {
    backgroundColor: Colors.surface,
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
    borderBottomColor: Colors.borderLight,
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
    color: Colors.textSecondary,
  },
  usageCount: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  usageCountSecondary: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  limitWarningBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  limitWarningText: {
    ...Typography.small,
    fontSize: 10,
    color: Colors.textInverse,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressBarContainerWarning: {
    backgroundColor: `${Colors.warning}20`,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressBarWarning: {
    backgroundColor: Colors.warning,
  },

  // Actions Section
  actionsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
  },
  upgradeHint: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  upgradeValueStatement: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  proConfirmation: {
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  proConfirmationLargeText: {
    ...Typography.body,
    color: '#065F46',
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
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  planOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  planOption: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 90,
  },
  planOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  planOptionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  planOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  planOptionPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  planOptionPeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  planOptionSavings: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 2,
  },
  planOptionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  planOptionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textInverse,
    textTransform: 'uppercase',
  },
  planOptionCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planOptionCheckInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textInverse,
  },
});
