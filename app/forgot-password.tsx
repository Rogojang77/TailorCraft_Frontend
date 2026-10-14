import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ScreenLayout } from '@/components/layout/ScreenLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { requestPasswordReset } from '@/lib/services/authService';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getLocalizedApiMessage } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.forgotPassword.enterEmail'));
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await requestPasswordReset(trimmed);
      setSubmitted(true);
    } catch (error: unknown) {
      const msg = getLocalizedApiMessage(error, t, t('auth.forgotPassword.requestFailed'));
      setErrorMessage(msg);
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <ScreenLayout scrollable contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.forgotPassword.checkEmail')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.forgotPassword.checkEmailDescription')}
          </Text>
          <Button
            variant="primary"
            fullWidth
            onPress={() => router.replace('/login')}
            style={styles.backButton}
          >
            {t('auth.forgotPassword.backToLogin')}
          </Button>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.forgotPassword.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.forgotPassword.subtitle')}
        </Text>

        <Input
          label={t('auth.login.email')}
          placeholder={t('auth.login.emailPlaceholder')}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errorMessage) setErrorMessage('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!isLoading}
          containerStyle={styles.input}
        />

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <Button
          variant="primary"
          fullWidth
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={styles.submitButton}
        >
          {t('auth.forgotPassword.sendResetLink')}
        </Button>

        <Button variant="ghost" onPress={() => router.back()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>
            {t('auth.forgotPassword.backToLogin')}
          </Text>
        </Button>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: AtelierSpacing.xl,
  },
  content: {
    paddingHorizontal: AtelierSpacing.md,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: AtelierSpacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xl,
  },
  input: {
    marginBottom: AtelierSpacing.md,
  },
  errorContainer: {
    marginBottom: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 21,
  },
  submitButton: {
    marginBottom: AtelierSpacing.md,
  },
  backButton: {
    marginTop: AtelierSpacing.lg,
  },
  backLink: {
    marginTop: AtelierSpacing.sm,
  },
  backLinkText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
