import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, apiFetch, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Typography, ButtonStyles, BorderRadius } from '@/constants/design';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, refreshToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await apiFetch<{ message: string }>(
        api.auth.verifyEmail(verificationToken),
        {
          method: 'GET',
          skipAuth: true,
        }
      );

      setStatus('success');
      setMessage(response.message || 'Email verified successfully!');

      // Refresh user data to get updated verification status
      if (user) {
        await refreshToken();
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error, 'Failed to verify email. The link may be invalid or expired.'));
    }
  };

  const handleResendEmail = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to resend verification email.');
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

      Alert.alert('Success', 'Verification email sent! Please check your inbox.');
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to resend verification email.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
            <Text style={styles.message}>Verifying your email...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} color={Colors.success || '#10b981'} />
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.subMessage}>Redirecting you to the app...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} color={Colors.error} />
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.message}>{message}</Text>
            {user && (
              <TouchableOpacity
                style={[styles.button, isResending && styles.buttonDisabled]}
                onPress={handleResendEmail}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Mail size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Resend Verification Email</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Go to App</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  button: {
    ...ButtonStyles.primary,
    backgroundColor: Colors.textPrimary,
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  buttonTextSecondary: {
    color: Colors.textPrimary,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
});
