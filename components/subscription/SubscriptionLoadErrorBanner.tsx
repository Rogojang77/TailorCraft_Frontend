import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { InlineSpinner } from '@/components/InlineSpinner';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing } from '@/constants/design';

/**
 * Non-blocking banner shown when subscription status is unknown (backend/network
 * unavailable). Limits are not enforced; banner explains degraded mode and offers retry.
 */
export function SubscriptionLoadErrorBanner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const { subscriptionState, refreshSubscription, isLoading } = useSubscription();
  const [retrying, setRetrying] = useState(false);

  if (subscriptionState !== 'unknown') {
    return null;
  }

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refreshSubscription(true);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={[styles.banner, { 
      backgroundColor: colors.warning + '18',
      borderBottomColor: colors.warning + '40',
    }]}>
      <Text style={[typography.caption, { color: colors.textSecondary }, styles.message]} numberOfLines={2}>
        {t('subscription.statusUnavailableDegradedMode')}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, (retrying || isLoading) && styles.retryButtonDisabled]}
        onPress={handleRetry}
        disabled={retrying || isLoading}
        activeOpacity={0.7}
      >
        {retrying || isLoading ? (
          <InlineSpinner />
        ) : (
          <>
            <RefreshCw size={14} color={colors.primary} style={styles.retryIcon} />
            <Text style={[typography.captionBold, { color: colors.primary }]}>{t('common.retry')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  message: {
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryIcon: {
    marginRight: Spacing.xs,
  },
});
