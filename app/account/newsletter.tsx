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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDynamicTitle(t('newsletter.title'));
  useCustomBack(() => router.back(), t('common.back'));

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('newsletter.enterEmail'));
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t('newsletter.validEmail'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ success: boolean; alreadySubscribed?: boolean }>(api.newsletterSubscribe, {
        method: 'POST',
        body: JSON.stringify({ email: trimmed, source: 'app' }),
        skipAuth: true,
      });
      if (data?.alreadySubscribed) {
        setAlreadySubscribed(true);
      } else {
        setSuccess(true);
        setEmail('');
      }
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === HttpStatus.TooManyRequests
          ? t('newsletter.tooManyRequests')
          : getErrorMessage(err, t('newsletter.sendError'));
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
          <Text style={[styles.successTitle, { color: colors.primary }]}>{t('newsletter.thankYou')}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>{t('newsletter.successMessage')}</Text>
          <Button variant="primary" onPress={() => setSuccess(false)} style={styles.successButton}>
            {t('newsletter.subscribeAgain')}
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  if (alreadySubscribed) {
    return (
      <ScreenContainer noPadding>
        <View style={[styles.content, styles.centered]}>
          <Text style={[styles.successTitle, { color: colors.primary }]}>{t('newsletter.alreadySubscribedTitle')}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>{t('newsletter.alreadySubscribedMessage')}</Text>
          <Button variant="primary" onPress={() => setAlreadySubscribed(false)} style={styles.successButton}>
            {t('newsletter.tryAnotherEmail')}
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
          <Text style={[styles.intro, { color: colors.textSecondary }]}>{t('newsletter.description')}</Text>
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Input
              label={t('newsletter.emailLabel')}
              placeholder={t('newsletter.emailPlaceholder')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              error={error || false}
              containerStyle={styles.inputContainer}
            />
            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting || !email.trim()}
              loading={submitting}
            >
              {t('newsletter.button')}
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
