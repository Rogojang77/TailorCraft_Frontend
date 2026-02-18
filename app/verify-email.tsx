import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, apiFetch, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Colors, Spacing, Typography } from '@/constants/design';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, refreshToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

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
    if (!user) {
      Alert.alert(t('common.error'), t('verifyEmail.pleaseLogin'));
      router.replace('/login');
      return;
    }

    setIsResending(true);
    try {
      await apiFetch<{ message: string }>(
        api.auth.resendEmailVerification,
        {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
          skipAuth: false,
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
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
            <Text style={styles.message}>{t('verifyEmail.verifying')}</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} color={Colors.success || '#10b981'} />
            <Text style={styles.title}>{t('verifyEmail.emailVerified')}</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>{t('verifyEmail.redirecting')}</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} color={Colors.error} />
            <Text style={styles.title}>{t('verifyEmail.verificationFailed')}</Text>
            <Text style={styles.message}>{message}</Text>
            {user && (
              <Button
                variant="primary"
                onPress={handleResendEmail}
                disabled={isResending}
                loading={isResending}
                leftIcon={<Mail size={20} color={Colors.textInverse} />}
                style={styles.primaryButton}
              >
                {t('verifyEmail.resendVerificationEmail')}
              </Button>
            )}
            <Button
              variant="secondary"
              onPress={() => router.replace('/(tabs)')}
              style={styles.secondaryButton}
            >
              {t('verifyEmail.goToApp')}
            </Button>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    ...Typography.h2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  subMessage: {
    ...Typography.small,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  primaryButton: {
    marginTop: Spacing.xl,
    minWidth: 200,
  },
  secondaryButton: {
    marginTop: Spacing.md,
  },
});
