import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, User, ShoppingBag, Settings, X } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProBadge } from '@/components/ProBadge';
import { PaywallModal } from '@/components/PaywallModal';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { subscription, isLoading, refreshSubscription, upgradeToPro, cancelSubscription } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const success = await upgradeToPro();
      if (success) {
        await refreshSubscription(true); // Force refresh to get latest data
        setShowPaywall(false);
        Alert.alert(
          'Success!',
          'Your account has been upgraded to Pro. You can now manage unlimited clients and orders.'
        );
      } else {
        Alert.alert('Error', 'Could not complete the upgrade. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not complete the upgrade');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your Pro subscription? You will be downgraded to the Free plan and limited to 5 clients and 5 orders.',
      [
        {
          text: 'Keep Pro',
          style: 'cancel',
        },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setIsCanceling(true);
            try {
              const success = await cancelSubscription();
              if (success) {
                await refreshSubscription(true); // Force refresh to get latest data
                Alert.alert(
                  'Subscription Canceled',
                  'Your Pro subscription has been canceled. You are now on the Free plan.'
                );
              } else {
                Alert.alert('Error', 'Could not cancel subscription. Please try again.');
              }
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Could not cancel subscription');
            } finally {
              setIsCanceling(false);
            }
          },
        },
      ]
    );
  };

  const isPro = subscription?.plan === 'PRO';
  const isFree = subscription?.plan === 'FREE';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={ButtonStyles.back} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Subscription</Text>
        <View style={ButtonStyles.back} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading subscription...</Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && !subscription && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Could not load subscription information</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refreshSubscription(true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Content */}
        {!isLoading && subscription && (
          <>
            {/* Current Plan Card */}
            <View style={[styles.planCard, isPro && styles.planCardPro]}>
              <View style={styles.planHeader}>
                <View style={styles.planTitleContainer}>
                  {isPro && (
                    <View style={styles.crownIcon}>
                      <Crown size={20} color={Colors.primary} strokeWidth={2.5} />
                    </View>
                  )}
                  <Text style={styles.planTitle}>
                    {isPro ? 'Pro Plan' : 'Free Plan'}
                  </Text>
                </View>
                {isPro && <ProBadge size="sm" />}
              </View>

              <Text style={styles.planDescription}>
                {isFree
                  ? 'Up to 5 clients and 5 orders'
                  : 'Unlimited clients and orders'}
              </Text>

              {isPro && (
                <View style={styles.proConfirmationBadge}>
                  <Text style={styles.proConfirmationText}>Full access</Text>
                </View>
              )}
            </View>

            {/* Usage Section (FREE plan only) */}
            {isFree && (
              <View style={styles.usageSection}>
                <Text style={styles.sectionTitle}>Usage</Text>

                {/* Clients Usage */}
                <View style={styles.usageItem}>
                  <View style={styles.usageHeader}>
                    <View style={styles.usageIconLabel}>
                      <User size={20} color={Colors.textSecondary} strokeWidth={2} />
                      <Text style={styles.usageLabel}>Clients</Text>
                    </View>
                    <Text style={styles.usageCount}>
                      {subscription.usage.currentClients} / {subscription.limits.maxClients}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${
                            (subscription.usage.currentClients / subscription.limits.maxClients) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Orders Usage */}
                <View style={[styles.usageItem, styles.usageItemLast]}>
                  <View style={styles.usageHeader}>
                    <View style={styles.usageIconLabel}>
                      <ShoppingBag size={20} color={Colors.textSecondary} strokeWidth={2} />
                      <Text style={styles.usageLabel}>Orders</Text>
                    </View>
                    <Text style={styles.usageCount}>
                      {subscription.usage.currentOrders} / {subscription.limits.maxOrders}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${
                            (subscription.usage.currentOrders / subscription.limits.maxOrders) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Actions Section */}
            <View style={styles.actionsSection}>
              {isFree ? (
                <>
                  <Text style={styles.upgradeHint}>
                    Upgrade to Pro to unlock unlimited clients and orders
                  </Text>
                  <TouchableOpacity
                    style={styles.upgradeButton}
                    onPress={() => setShowPaywall(true)}
                    activeOpacity={0.8}
                  >
                    <Crown size={20} color={Colors.textInverse} strokeWidth={2.5} />
                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.proConfirmation}>
                    <Text style={styles.proConfirmationLargeText}>
                      You're on the Pro plan
                    </Text>
                  </View>
                  
                  {/* Subscription Management Section */}
                  <View style={styles.managementSection}>
                    <Text style={styles.managementTitle}>Subscription Management</Text>
                    
                    <View style={styles.infoBox}>
                      <Text style={styles.infoBoxTitle}>Benefits</Text>
                      <View style={styles.benefitItem}>
                        <Text style={styles.benefitBullet}>•</Text>
                        <Text style={styles.benefitText}>Unlimited clients</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <Text style={styles.benefitBullet}>•</Text>
                        <Text style={styles.benefitText}>Unlimited orders</Text>
                      </View>
                      <View style={styles.benefitItem}>
                        <Text style={styles.benefitBullet}>•</Text>
                        <Text style={styles.benefitText}>Full access to all features</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.cancelButton, isCanceling && styles.cancelButtonDisabled]}
                      onPress={handleCancelSubscription}
                      disabled={isCanceling}
                      activeOpacity={0.7}
                    >
                      {isCanceling ? (
                        <ActivityIndicator size="small" color={Colors.error} />
                      ) : (
                        <>
                          <X size={18} color={Colors.error} strokeWidth={2} />
                          <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <Text style={styles.cancelHint}>
                      Canceling will downgrade you to the Free plan
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    ...HeaderStyles.container,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
  },

  // Loading & Error States
  loadingContainer: {
    paddingVertical: Spacing.xxxl * 2,
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
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  retryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 14,
  },

  // Plan Card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  planCardPro: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFBEB',
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
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: Spacing.lg,
  },
  usageItem: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
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
    marginBottom: Spacing.sm,
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
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },

  // Actions Section
  actionsSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    ...Shadows.md,
  },
  upgradeHint: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  upgradeButton: {
    ...ButtonStyles.primary,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  upgradeButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
    fontSize: 16,
  },
  proConfirmation: {
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
  manageButton: {
    ...ButtonStyles.secondary,
    flexDirection: 'row',
    gap: Spacing.sm,
    opacity: 0.6,
  },
  manageButtonText: {
    ...Typography.body,
    color: Colors.textTertiary,
    fontWeight: '600',
  },

  // Subscription Management
  managementSection: {
    marginTop: Spacing.lg,
  },
  managementTitle: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: Spacing.lg,
    color: Colors.textPrimary,
  },
  infoBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  infoBoxTitle: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  benefitBullet: {
    ...Typography.body,
    color: Colors.primary,
    marginRight: Spacing.sm,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
  },
  benefitText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  cancelButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    ...Typography.bodyBold,
    color: Colors.error,
    fontSize: 16,
  },
  cancelHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});
