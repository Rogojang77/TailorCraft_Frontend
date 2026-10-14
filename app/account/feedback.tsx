import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useDynamicTitle, useCustomBack } from '@/contexts/PageTitleContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch, getErrorMessage, ApiError, HttpStatus } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierShadow } from '@/constants/atelierDesign';

const MAX_MESSAGE_LENGTH = 5000;

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [message, setMessage] = useState('');

  useDynamicTitle(t('feedback.menuItem'));
  useCustomBack(() => router.back(), t('common.back'));
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setError(t('feedback.messageTooShort'));
      return;
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(t('feedback.messageTooLong'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<{ success: boolean }>(api.feedback, {
        method: 'POST',
        body: JSON.stringify({ message: trimmed }),
      });
      setSuccess(true);
      setMessage('');
    } catch (err) {
      const msg = err instanceof ApiError && err.status === HttpStatus.TooManyRequests
        ? t('feedback.tooManyRequests')
        : getErrorMessage(err, t('feedback.sendError'));
      setError(msg);
      if (!(err instanceof ApiError) || err.status >= 500) {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <ScreenContainer noPadding>
        <View style={[styles.content, styles.centered]}>
          <Text style={[styles.successTitle, { color: colors.primary }]}>{t('feedback.thankYou')}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            {t('feedback.successMessage')}
          </Text>
          <Button
            variant="primary"
            onPress={() => setSuccess(false)}
            style={styles.successButton}
          >
            {t('feedback.sendMore')}
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            {t('feedback.intro')}
          </Text>
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Input
              label={t('feedback.messageLabel')}
              placeholder={t('feedback.messagePlaceholder')}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                setError(null);
              }}
              multiline
              numberOfLines={6}
              maxLength={MAX_MESSAGE_LENGTH}
              editable={!submitting}
              error={error || false}
              containerStyle={styles.inputContainer}
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {t('feedback.messageHint', { count: message.length, max: MAX_MESSAGE_LENGTH })}
            </Text>
            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting || message.trim().length < 10}
              loading={submitting}
            >
              {t('feedback.submit')}
            </Button>
          </View>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xxl,
  },
  content: {
    flex: 1,
    padding: AtelierSpacing.md,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  intro: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.lg,
  },
  section: {
    borderRadius: 12,
    padding: AtelierSpacing.md,
    ...AtelierShadow.elevated,
  },
  inputContainer: {
    marginBottom: AtelierSpacing.sm,
  },
  hint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.md,
  },
  successTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.xl,
  },
  successButton: {
    minWidth: 160,
  },
});
