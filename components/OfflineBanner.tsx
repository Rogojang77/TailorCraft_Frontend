/**
 * Global banner shown when the device has no internet connection.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';
import { InlineSpinner } from '@/components/InlineSpinner';

export function OfflineBanner() {
  const { isConnected, retry } = useNetwork();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);

  if (isConnected !== false) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      retry();
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      setRetrying(false);
    }
  };

  const emberColor = colors.ember ?? colors.error;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: emberColor + '18',
          borderBottomColor: emberColor + '40',
        },
      ]}
    >
      <Text style={[styles.message, { color: colors.ink3 }]} numberOfLines={2}>
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
            <RefreshCw size={14} color={colors.brass ?? colors.primary} style={styles.retryIcon} />
            <Text style={[styles.retryLabel, { color: colors.brass ?? colors.primary }]}>
              {t('common.retry')}
            </Text>
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
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  message: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.sm,
    marginLeft: AtelierSpacing.sm,
  },
  retryButtonDisabled: { opacity: 0.6 },
  retryIcon: { marginRight: AtelierSpacing.xs },
  retryLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
});
