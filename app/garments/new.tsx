import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { api, apiFetch, ApiError, ApiErrorCode } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { invalidateGarmentTypesCache, getGarmentTypeIdFromPostResponse } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PaywallModal } from '@/components/subscription';
import { Spacing, Typography, Shadows } from '@/constants/design';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function NewGarmentScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { checkCanCreateTemplate, getLimitMessages, upgradeToPro } = useSubscription();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const canCreateTemplate = checkCanCreateTemplate();
  const limitMsgs = getLimitMessages();

  const handleSubmit = async () => {
    if (!canCreateTemplate) {
      setShowPaywall(true);
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('garments.requiredName'), t('garments.enterName'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<unknown>(api.garmentTypes(), {
        method: 'POST',
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
        }),
      });
      invalidateGarmentTypesCache();
      const id = getGarmentTypeIdFromPostResponse(res);
      if (id) {
        router.replace(`/garments/${id}`);
      } else {
        Alert.alert(t('garments.created'), t('garments.createdMessage'));
        router.replace('/garments');
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const msg = String(err?.message ?? '');
      if (
        (err instanceof ApiError && err.code === ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED) ||
        msg.includes('Free plan allows only') ||
        (msg.includes('template') && msg.toLowerCase().includes('limit'))
      ) {
        setShowPaywall(true);
      } else {
        Alert.alert(
          t('common.error'),
          e instanceof Error ? e.message : t('garments.createError')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    try {
      const result = await upgradeToPro(plan);
      if (result.success) setShowPaywall(false);
      else if (result.errorMessage) Alert.alert(t('common.error'), result.errorMessage);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('subscription.paywallCta'));
    } finally {
      setIsUpgrading(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer noPadding>

      <View style={styles.flex}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            <View style={styles.field}>
              <Input
                label={`${t('garments.namePlaceholderEdit')} *`}
                value={name}
                onChangeText={setName}
                placeholder={t('garments.namePlaceholder')}
                editable={!submitting}
                autoCapitalize="words"
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                This name will appear in orders when selecting garments.
              </Text>
            </View>
            <View style={styles.field}>
              <Input
                label={`${t('common.optional')} - ${t('garments.descriptionPlaceholder')}`}
                value={description}
                onChangeText={setDescription}
                placeholder={t('garments.descriptionPlaceholder')}
                editable={!submitting}
                multiline
                numberOfLines={2}
                optional
              />
            </View>
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg), backgroundColor: colors.background, borderTopColor: colors.borderLight }]}>
            {!canCreateTemplate && (
              <Text style={[styles.limitMessage, { color: colors.textSecondary }]}>{limitMsgs.templateLimitReached}</Text>
            )}
            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting || !name.trim() || !canCreateTemplate}
              loading={submitting}
              style={styles.submit}
            >
              Create garment
            </Button>
        </View>
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 20,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  helperText: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    ...Shadows.md,
  },
  submit: {
    width: '100%',
  },
  limitMessage: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
});
