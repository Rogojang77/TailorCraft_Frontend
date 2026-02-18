import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useI18n } from '@/lib/i18n';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import { CheckCircle, RefreshCw, ExternalLink } from 'lucide-react-native';
import { showManageSubscriptionsIOS } from '@/lib/services/iapService';

/**
 * Pro subscription management: status, Restore, and Manage (store).
 * Premium state from backend only (usePremium → GET /entitlements/me).
 */
export function SubscriptionManagement({ onCancel }: { onCancel?: () => void }) {
  const { t } = useI18n();
  const { restorePurchases, refreshSubscription, isIAPSupported } = useSubscription();
  const { isPremium: isPro, refreshEntitlements } = usePremium();
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!isIAPSupported) {
      Alert.alert(t('common.error'), t('subscriptionManagement.iapNotAvailable'));
      return;
    }
    setIsRestoring(true);
    try {
      await restorePurchases();
      await refreshEntitlements();
      await refreshSubscription(true);
      Alert.alert(
        t('subscriptionManagement.restoredTitle'),
        t('subscriptionManagement.restoredMessage')
      );
      onCancel?.();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('subscriptionManagement.restoreError')
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    if (Platform.OS === 'ios') {
      try {
        await showManageSubscriptionsIOS();
        await refreshSubscription(true);
      } catch (err) {
        Alert.alert(
          t('common.error'),
          err instanceof Error ? err.message : t('subscriptionManagement.manageError')
        );
      }
    } else if (Platform.OS === 'android') {
      try {
        const url = 'https://play.google.com/store/account/subscriptions';
        const can = await Linking.canOpenURL(url);
        if (can) await Linking.openURL(url);
        else Alert.alert(t('common.error'), t('subscriptionManagement.manageError'));
      } catch (err) {
        Alert.alert(t('common.error'), t('subscriptionManagement.manageError'));
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('subscriptionManagement.subscriptionStatus')}</Text>
        <View style={styles.statusBlock}>
          <View style={styles.statusRow}>
            <Text style={styles.planName}>
              {isPro ? t('subscriptionManagement.planPro') : t('subscriptionManagement.planFree')}
            </Text>
            {isPro && (
              <View style={styles.activeBadge}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.activeBadgeText}>{t('subscriptionManagement.active')}</Text>
              </View>
            )}
          </View>
          {isPro && (
            <Text style={styles.proHint}>{t('subscriptionManagement.proHint')}</Text>
          )}
        </View>
      </View>

      {isIAPSupported && (
        <>
          <TouchableOpacity
            style={[styles.button, isRestoring && styles.buttonDisabled]}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <RefreshCw size={18} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.buttonText}>{t('subscriptionManagement.restorePurchases')}</Text>
              </>
            )}
          </TouchableOpacity>

          {isPro && (
            <TouchableOpacity style={styles.buttonSecondary} onPress={handleManageSubscription}>
              <ExternalLink size={18} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.buttonTextSecondary}>{t('subscriptionManagement.manageInStore')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  statusBlock: {
    paddingVertical: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  planName: {
    ...Typography.h3,
    fontSize: 20,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: {
    ...Typography.small,
    color: '#065F46',
    fontWeight: '600',
  },
  proHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 16,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  buttonTextSecondary: {
    ...Typography.body,
    color: Colors.primary,
    fontSize: 15,
  },
});
