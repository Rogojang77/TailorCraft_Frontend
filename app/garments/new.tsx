import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { api, apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { invalidateGarmentTypesCache } from '@/lib/apiCache';
import { getGarmentTypeIdFromPostResponse } from '@/lib/api-mappers';
import type { GarmentTypeRecord } from '@/types/templates';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Colors, Spacing, Typography, HeaderStyles, BorderRadius, Shadows } from '@/constants/design';

export default function NewGarmentScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { templateCreationStatus } = useSubscription();
  const createStatus = templateCreationStatus();

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('garments.requiredName'), t('garments.enterName'));
      return;
    }
    if (!createStatus.allowed) {
      Alert.alert(t('garments.limitReached'), createStatus.message || t('garments.cannotCreateMore'));
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
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('garments.createError')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={HeaderStyles.container}>
        <Button
          variant="back"
          onPress={() => router.back()}
          disabled={submitting}
          accessibilityLabel={t('common.back')}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </Button>
        <Text style={HeaderStyles.title}>{t('garments.new')}</Text>
        <View style={{ width: 44 }} />
      </View>

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
              <Text style={styles.helperText}>
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

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
            {!createStatus.allowed && createStatus.message ? (
              <Text style={styles.limitHint}>{createStatus.message}</Text>
            ) : null}
            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting || !name.trim() || !createStatus.allowed}
              loading={submitting}
              style={styles.submit}
            >
              Create garment
            </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  footer: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadows.md,
  },
  submit: {
    width: '100%',
  },
  limitHint: {
    ...Typography.caption,
    color: Colors.warning,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
});
