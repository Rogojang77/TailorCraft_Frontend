import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Crown, X, Users, ShoppingBag } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 420);

export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void | Promise<void>;
  loading?: boolean;
}

export function PaywallModal({
  visible,
  onClose,
  onUpgrade,
  loading = false,
}: PaywallModalProps) {
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const handleUpgrade = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await onUpgrade();
  };

  if (!visible) return null;

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
            entering={ZoomIn.duration(280).springify().damping(18)}
            exiting={FadeOut.duration(180)}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconRing}>
                <Crown size={32} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <TouchableOpacity
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
                onPress={onClose}
                disabled={loading}
              >
                <X size={22} color="#94A3B8" />
              </TouchableOpacity>
              
              <Text style={styles.title}>Limită Atinsă</Text>
              <Text style={styles.subtitle}>
                Ai atins limita planului gratuit
              </Text>

              <View style={styles.plansContainer}>
                {/* Free Plan */}
                <View style={styles.planCard}>
                  <Text style={styles.planBadge}>Plan Gratuit</Text>
                  <View style={styles.planFeature}>
                    <Users size={16} color={Colors.textSecondary} strokeWidth={2} />
                    <Text style={styles.planFeatureText}>5 clienți</Text>
                  </View>
                  <View style={styles.planFeature}>
                    <ShoppingBag size={16} color={Colors.textSecondary} strokeWidth={2} />
                    <Text style={styles.planFeatureText}>5 comenzi</Text>
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

              <Text style={styles.message}>
                Fă upgrade la Pro pentru a gestiona clienți și comenzi nelimitate.
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelText}>Nu acum</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.upgradeBtnWrap}
                  onPress={handleUpgrade}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.upgradeBtn, loading && styles.upgradeBtnDisabled]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <>
                        <Crown size={18} color={Colors.textInverse} strokeWidth={2.5} />
                        <Text style={styles.upgradeText}>Upgrade la Pro</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(15,23,42,0.72)' : 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 20 },
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
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  upgradeBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  upgradeBtnDisabled: {
    opacity: 0.8,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
