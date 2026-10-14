import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ScreenLayout } from '@/components/layout/ScreenLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { resetPassword } from '@/lib/services/authService';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getLocalizedApiMessage } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const hasToken = typeof token === 'string' && token.length > 0;

  const handleSubmit = async () => {
    if (!hasToken) {
      setErrorMessage(t('auth.resetPassword.noToken'));
      return;
    }
    if (!password.trim()) {
      Alert.alert(t('common.error'), t('auth.signup.enterPassword'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.signup.passwordLength'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.signup.passwordsMatch'));
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await resetPassword(token, password.trim());
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (error: unknown) {
      const msg = getLocalizedApiMessage(error, t, t('auth.resetPassword.resetFailed'));
      setErrorMessage(msg);
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasToken) {
    return (
      <ScreenLayout scrollable contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.resetPassword.invalidLink')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.resetPassword.invalidLinkDescription')}
          </Text>
          <Button variant="primary" fullWidth onPress={() => router.replace('/login')} style={styles.backButton}>
            {t('auth.forgotPassword.backToLogin')}
          </Button>
        </View>
      </ScreenLayout>
    );
  }

  if (success) {
    return (
      <ScreenLayout scrollable contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.resetPassword.successTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.resetPassword.successDescription')}
          </Text>
          <Button variant="primary" fullWidth onPress={() => router.replace('/login')} style={styles.backButton}>
            {t('auth.forgotPassword.backToLogin')}
          </Button>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.resetPassword.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.resetPassword.subtitle')}
        </Text>

        <Input
          label={t('auth.signup.password')}
          placeholder={t('auth.signup.passwordPlaceholder')}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          rightElement={
            <Button
              variant="ghost"
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </Button>
          }
          style={styles.input}
        />

        <Input
          label={t('auth.signup.confirmPassword')}
          placeholder={t('auth.signup.confirmPlaceholder')}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          rightElement={
            <Button
              variant="ghost"
              onPress={() => setShowConfirmPassword((v) => !v)}
              accessibilityLabel={showConfirmPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </Button>
          }
          style={styles.input}
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
          {t('auth.resetPassword.submit')}
        </Button>

        <Button variant="ghost" onPress={() => router.replace('/login')} style={styles.backLink}>
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
