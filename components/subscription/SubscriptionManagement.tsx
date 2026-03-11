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
import { useSubscription, usePremium } from '@/contexts/SubscriptionContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing, BorderRadius } from '@/constants/design';
import { CheckCircle, RefreshCw, ExternalLink } from 'lucide-react-native';
import { showManageSubscriptionsIOS } from '@/lib/services/iapService';

/**
 * Pro subscription management: status, Restore, and Manage (store).
 * Premium state from backend only (usePremium → GET /entitlements/me).
 */
export function SubscriptionManagement({ onCancel }: { onCancel?: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const typography = getTypography(colors);
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
        <Text style={[typography.h3, { fontSize: 18, color: colors.textPrimary }, styles.sectionTitle]}>
          {t('subscriptionManagement.subscriptionStatus')}
        </Text>
        <View style={styles.statusBlock}>
          <View style={styles.statusRow}>
            <Text style={[typography.h3, { fontSize: 20 }]}>
              {isPro ? t('subscriptionManagement.planPro') : t('subscriptionManagement.planFree')}
            </Text>
            {isPro && (
              <View style={[styles.activeBadge, { backgroundColor: colors.successBg }]}>
                <CheckCircle size={14} color={colors.success} />
                <Text style={[typography.small, { color: colors.successText, fontWeight: '600' }]}>
                  {t('subscriptionManagement.active')}
                </Text>
              </View>
            )}
          </View>
          {isPro && (
            <Text style={[typography.caption, { color: colors.textSecondary }, styles.proHint]}>
              {t('subscriptionManagement.proHint')}
            </Text>
          )}
        </View>
      </View>

      {isIAPSupported && (
        <>
          {!isPro && (
            <TouchableOpacity
              style={[
                styles.button, 
                { backgroundColor: colors.surface, borderColor: colors.primary },
                isRestoring && styles.buttonDisabled
              ]}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <RefreshCw size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={[typography.bodyBold, { color: colors.primary, fontSize: 16 }]}>
                    {t('subscriptionManagement.restorePurchases')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isPro && (
            <TouchableOpacity 
              style={[styles.buttonSecondary, { backgroundColor: colors.background, borderColor: colors.border }]} 
              onPress={handleManageSubscription}
            >
              <ExternalLink size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.body, { color: colors.primary, fontSize: 15 }]}>
                {t('subscriptionManagement.manageInStore')}
              </Text>
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
    marginBottom: Spacing.md,
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
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  proHint: {
    marginTop: Spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
  },
});
