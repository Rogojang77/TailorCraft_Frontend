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
import { Crown, X, Users, ShoppingBag } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/design';
import { SubscriptionPlanType, useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 420);

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
  const { prices, getLimitMessages } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('monthly');
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

  if (!visible) return null;

  const msgs = getLimitMessages();
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
          <View style={styles.overlay}>
            {Platform.OS !== 'web' && (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.centered} pointerEvents="box-none">
          <Animated.View
            style={styles.card}
            entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
            exiting={modalExiting}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconRing}>
                <Crown size={32} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <Button
                variant="ghost"
                style={styles.closeBtn}
                onPress={onClose}
                disabled={loading}
                accessibilityLabel="Close"
              >
                <X size={22} color={Colors.textTertiary} />
              </Button>
              
              <Text style={styles.title}>{msgs.paywallTitle}</Text>
              <Text style={styles.subtitle}>{msgs.paywallSubtitle}</Text>

              <View style={styles.plansContainer}>
                {/* Free Plan */}
                <View style={styles.planCard}>
                  <Text style={styles.planBadge}>Plan Gratuit</Text>
                  <View style={styles.planFeature}>
                    <Users size={16} color={Colors.textSecondary} strokeWidth={2} />
                    <Text style={styles.planFeatureText}>{msgs.freePlanClients}</Text>
                  </View>
                  <View style={styles.planFeature}>
                    <ShoppingBag size={16} color={Colors.textSecondary} strokeWidth={2} />
                    <Text style={styles.planFeatureText}>{msgs.freePlanOrders}</Text>
                  </View>
                </View>

                {/* Pro Plan */}
                <View style={[styles.planCard, styles.planCardPro]}>
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.planBadgeGradient}
                  >
                    <Crown size={14} color={Colors.textInverse} strokeWidth={2.5} />
                    <Text style={styles.planBadgePro}>Plan Pro</Text>
                  </LinearGradient>
                  <View style={styles.planFeature}>
                    <Users size={16} color={Colors.primary} strokeWidth={2.5} />
                    <Text style={styles.planFeatureTextPro}>Clienți nelimitați</Text>
                  </View>
                  <View style={styles.planFeature}>
                    <ShoppingBag size={16} color={Colors.primary} strokeWidth={2.5} />
                    <Text style={styles.planFeatureTextPro}>Comenzi nelimitate</Text>
                  </View>
                </View>
              </View>

              {/* Plan Selection */}
              <View style={styles.planSelectionContainer}>
                <Text style={styles.planSelectionTitle}>Selectează planul</Text>
                <View style={styles.planOptions}>
                  <TouchableOpacity
                    style={[
                      styles.planOption,
                      selectedPlan === 'monthly' && styles.planOptionSelected,
                    ]}
                    onPress={() => handlePlanSelect('monthly')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.planOptionContent}>
                      <Text
                        style={[
                          styles.planOptionText,
                          selectedPlan === 'monthly' && styles.planOptionTextSelected,
                        ]}
                      >
                        Lunar
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
                        <Text style={styles.planOptionPrice}>...</Text>
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
                    onPress={() => handlePlanSelect('yearly')}
                    activeOpacity={0.7}
                  >
                    {selectedPlan === 'yearly' && (
                      <View style={styles.planOptionBadge}>
                        <Text style={styles.planOptionBadgeText}>Economie</Text>
                      </View>
                    )}
                    <View style={styles.planOptionContent}>
                      <Text
                        style={[
                          styles.planOptionText,
                          selectedPlan === 'yearly' && styles.planOptionTextSelected,
                        ]}
                      >
                        Anual
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
                              {(prices.monthly.amount * 12 - prices.yearly.amount).toFixed(2)} {prices.monthly.currency} economisiți
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.planOptionPrice}>...</Text>
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

              <Text style={styles.message}>{msgs.paywallUpgradeCta}</Text>

              <View style={styles.actions}>
                <Button
                  variant="secondary"
                  onPress={onClose}
                  disabled={loading}
                  style={styles.cancelBtn}
                >
                  Nu acum
                </Button>
                <Button
                  variant="primary"
                  onPress={handleUpgrade}
                  disabled={loading}
                  loading={loading}
                  leftIcon={<Crown size={18} color={Colors.textInverse} strokeWidth={2.5} />}
                  style={styles.upgradeBtn}
                >
                  Upgrade la Pro
                </Button>
              </View>
            </View>
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
    backgroundColor: Platform.OS === 'web' ? Colors.overlayModal : 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    ...Shadows.xl,
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 24,
  },
  cardInner: {
    padding: 28,
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  planCardPro: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  planBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  planBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  planBadgePro: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  planFeatureText: {
    ...Typography.caption,
    fontSize: 13,
  },
  planFeatureTextPro: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
  },
  upgradeBtn: {
    flex: 1,
  },
  planSelectionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  planSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  planOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
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
    fontSize: 18,
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
