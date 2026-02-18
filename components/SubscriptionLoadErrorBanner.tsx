import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { InlineSpinner } from '@/components/InlineSpinner';
import { useI18n } from '@/lib/i18n';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/design';

/**
 * Non-blocking banner shown when subscription status is unknown (backend/network
 * unavailable). Limits are not enforced; banner explains degraded mode and offers retry.
 */
export function SubscriptionLoadErrorBanner() {
  const { t } = useI18n();
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
    <View style={styles.banner}>
      <Text style={styles.message} numberOfLines={2}>
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
            <RefreshCw size={14} color={Colors.primary} style={styles.retryIcon} />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
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
    backgroundColor: Colors.warning + '18',
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning + '40',
  },
  message: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  retryText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
});
