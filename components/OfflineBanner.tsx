/**
 * Global banner shown when the device has no internet connection.
 * Renders below the header so tailors in low-connectivity environments see a clear
 * "No connection" message and can tap Retry to re-check connectivity.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing } from '@/constants/design';
import { InlineSpinner } from '@/components/InlineSpinner';

export function OfflineBanner() {
  const { isConnected, retry } = useNetwork();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);

  if (isConnected !== false) {
    return null;
  }

  const handleRetry = async () => {
    setRetrying(true);
    try {
      retry();
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      setRetrying(false);
    }
  };

  const typography = getTypography(colors);
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.errorBg ?? colors.error + '18',
          borderBottomColor: colors.errorBorder ?? colors.error + '40',
        },
      ]}
    >
      <Text
        style={[typography.caption, { color: colors.textSecondary }, styles.message]}
        numberOfLines={2}
      >
        {t('offline.message')}
      </Text>
      <TouchableOpacity
        style={[styles.retryButton, retrying && styles.retryButtonDisabled]}
        onPress={handleRetry}
        disabled={retrying}
        activeOpacity={0.7}
      >
        {retrying ? (
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
