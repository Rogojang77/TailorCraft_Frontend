import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useCustomBack } from '@/contexts/PageTitleContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography } from '@/constants/design';

/**
 * Shown when the user tries to start a new order but has no clients.
 * Replaces the previous redirect + alert: one screen with message and primary action.
 */
export default function NoClientsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();

  useCustomBack(() => router.replace('/(tabs)/orders'), t('common.back'));

  const handleAddClient = () => {
    router.replace('/clients/new');
  };

  return (
    <ScreenContainer noPadding contentPadding safeBottom>
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('newOrder.clientRequired')}
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {t('newOrder.clientRequiredAlertMessage')}
        </Text>
        <View style={styles.actions}>
          <Button
            label={t('orders.addClient')}
            onPress={handleAddClient}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  message: {
    ...Typography.body,
    marginBottom: Spacing.xl,
  },
  actions: {
    marginTop: Spacing.lg,
  },
});
