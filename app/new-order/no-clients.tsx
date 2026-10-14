import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useCustomBack } from '@/contexts/PageTitleContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';

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
      <View style={[styles.content, { backgroundColor: colors.paper ?? colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('newOrder.clientRequired')}
        </Text>
        <Text style={[styles.message, { color: colors.ink3 }]}>
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
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.xl,
    paddingBottom: AtelierSpacing.lg,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 28,
    lineHeight: 36,
    marginBottom: AtelierSpacing.md,
  },
  message: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xl,
  },
  actions: {
    marginTop: AtelierSpacing.lg,
  },
});
