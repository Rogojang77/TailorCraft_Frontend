import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, apiFetch, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, refreshToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      try {
        const response = await apiFetch<{ message: string }>(
          api.auth.verifyEmail(verificationToken),
          {
            method: 'GET',
            skipAuth: true,
          }
        );

        setStatus('success');
        setMessage(response.message || t('verifyEmail.successMessage'));

        // Always refresh AuthContext so tabs receive updated verification state before redirect
        const refreshed = await refreshToken();
        // Allow context update to propagate before navigating
        await new Promise((r) => setTimeout(r, 50));
        setTimeout(() => {
          router.replace(refreshed ? '/(tabs)' : '/login');
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage(getErrorMessage(error, t('verifyEmail.failedMessage')));
      }
    },
    [refreshToken, router, t]
  );

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage(t('verifyEmail.noToken'));
    }
  }, [token, verifyEmail]);

  const handleResendEmail = async () => {
    const email = user?.email ?? resendEmail.trim();
    if (!email) {
      Alert.alert(t('common.error'), t('verifyEmail.enterEmailToResend'));
      return;
    }

    setIsResending(true);
    try {
      await apiFetch<{ message: string }>(
        api.auth.resendEmailVerification,
        {
          method: 'POST',
          body: JSON.stringify({ email }),
          skipAuth: true,
        }
      );

      Alert.alert(t('common.success'), t('verifyEmail.resendSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error, t('verifyEmail.resendError')));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScreenContainer noPadding>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={AtelierSpacing.xl}
      >
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.textPrimary} />
            <Text style={[styles.message, { color: colors.textSecondary }]}>{t('verifyEmail.verifying')}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} color={colors.success} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('verifyEmail.emailVerified')}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            <Text style={[styles.subMessage, { color: colors.textSecondary }]}>{t('verifyEmail.redirecting')}</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} color={colors.error} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('verifyEmail.verificationFailed')}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            {!user && (
              <View style={styles.resendForm}>
                <Text style={[styles.resendHint, { color: colors.textSecondary }]}>{t('verifyEmail.resendHint')}</Text>
                <Input
                  label={t('verifyEmail.emailLabel')}
                  placeholder={t('verifyEmail.emailPlaceholder')}
                  value={resendEmail}
                  onChangeText={setResendEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isResending}
                  style={styles.emailInput}
                />
              </View>
            )}
            <Button
              variant="primary"
              onPress={handleResendEmail}
              disabled={isResending || (!user && !resendEmail.trim())}
              loading={isResending}
              leftIcon={<Mail size={20} color={colors.textInverse} />}
              style={styles.primaryButton}
            >
              {t('verifyEmail.resendVerificationEmail')}
            </Button>
            <Button
              variant="secondary"
              onPress={() => router.replace('/(tabs)')}
              style={styles.secondaryButton}
            >
              {t('verifyEmail.goToApp')}
            </Button>
          </>
        )}
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.xxl,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    marginTop: AtelierSpacing.xl,
    marginBottom: AtelierSpacing.md,
    textAlign: 'center',
  },
  message: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  subMessage: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: AtelierSpacing.md,
  },
  resendForm: {
    width: '100%',
    marginTop: AtelierSpacing.xl,
  },
  resendHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  emailInput: {
    marginBottom: AtelierSpacing.sm,
  },
  primaryButton: {
    marginTop: AtelierSpacing.xl,
    minWidth: 200,
  },
  secondaryButton: {
    marginTop: AtelierSpacing.md,
  },
});
