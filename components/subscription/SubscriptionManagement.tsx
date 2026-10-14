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
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { CheckCircle, RefreshCw, ExternalLink } from 'lucide-react-native';
import { showManageSubscriptionsIOS } from '@/lib/services/iapService';

/**
 * Pro subscription management: status, Restore, and Manage (store).
 * Premium state from backend only (usePremium → GET /entitlements/me).
 */
export function SubscriptionManagement({ onCancel }: { onCancel?: () => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('subscriptionManagement.subscriptionStatus')}
        </Text>
        <View style={styles.statusBlock}>
          <View style={styles.statusRow}>
            <Text style={[styles.planName, { color: colors.textPrimary }]}>
              {isPro ? t('subscriptionManagement.planPro') : t('subscriptionManagement.planFree')}
            </Text>
            {isPro && (
              <View style={[styles.activeBadge, { backgroundColor: colors.successBg }]}>
                <CheckCircle size={14} color={colors.pine ?? colors.success} />
                <Text style={[styles.activeBadgeText, { color: colors.successText, fontWeight: '600' }]}>
                  {t('subscriptionManagement.active')}
                </Text>
              </View>
            )}
          </View>
          {isPro && (
            <Text style={[styles.proHint, { color: colors.ink3 }]}>
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
                { backgroundColor: colors.card, borderColor: colors.brass ?? colors.primary },
                isRestoring && styles.buttonDisabled
              ]}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.brass ?? colors.primary} />
              ) : (
                <>
                  <RefreshCw size={18} color={colors.brass ?? colors.primary} strokeWidth={2} />
                  <Text style={[styles.buttonText, { color: colors.brass ?? colors.primary }]}>
                    {t('subscriptionManagement.restorePurchases')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isPro && (
            <TouchableOpacity
              style={[styles.buttonSecondary, { backgroundColor: colors.paper ?? colors.background, borderColor: colors.rule ?? colors.border }]}
              onPress={handleManageSubscription}
            >
              <ExternalLink size={18} color={colors.brass ?? colors.primary} strokeWidth={2} />
              <Text style={[styles.buttonSecondaryText, { color: colors.brass ?? colors.primary }]}>
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
    paddingVertical: AtelierSpacing.sm,
  },
  section: {
    marginBottom: AtelierSpacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.md,
  },
  statusBlock: {
    paddingVertical: AtelierSpacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.xs,
  },
  planName: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.xs,
    borderRadius: AtelierRadius.full,
  },
  activeBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  proHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
    borderWidth: 2,
    borderRadius: AtelierRadius.md,
    marginBottom: AtelierSpacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
    borderWidth: 1.5,
    borderRadius: AtelierRadius.md,
  },
  buttonSecondaryText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
});
