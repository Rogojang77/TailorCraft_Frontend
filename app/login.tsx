import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { ScreenLayout } from '@/components/layout/ScreenLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getLocalizedApiMessage } from '@/lib/api';
import { Colors, Spacing, Typography, BorderRadius, StatusStyles } from '@/constants/design';
import type { BiometricAvailability } from '@/lib/biometric';

export default function LoginScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricAvailability, setBiometricAvailability] = useState<BiometricAvailability | null>(null);
  const {
    user,
    login,
    isBiometricEnabled,
    enableBiometricLogin,
    loginWithBiometric,
    getBiometricAvailability,
  } = useAuth();
  const router = useRouter();

  // When biometric login is enabled, check if device supports it so we can show the biometric button.
  useEffect(() => {
    if (!isBiometricEnabled) return;
    getBiometricAvailability().then(setBiometricAvailability);
  }, [isBiometricEnabled, getBiometricAvailability]);

  // Redirect to app when auth state becomes set (e.g. after successful Face ID / Touch ID).
  // This is more reliable than relying on the root layout redirect, which can miss due to segment timing.
  useEffect(() => {
    if (user != null) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const clearError = () => {
    if (errorMessage) setErrorMessage('');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.login.enterBoth'));
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      const availability = await getBiometricAvailability();
      if (availability.available) {
        Alert.alert(
          t('auth.biometric.enableTitle'),
          t('auth.biometric.enableMessage'),
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => router.replace('/(tabs)') },
            {
              text: t('common.ok'),
              onPress: async () => {
                await enableBiometricLogin();
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: unknown) {
      const msg = getLocalizedApiMessage(error, t, t('auth.login.invalidCredentials'));
      setErrorMessage(msg);
      Alert.alert(t('auth.login.loginFailed'), msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setErrorMessage('');
    try {
      const result = await loginWithBiometric({
        promptMessage: t('auth.biometric.promptMessage'),
      });
      if (result.success) {
        // Navigation is handled by the useEffect above when user becomes non-null.
      } else if (result.reason === 'session_expired') {
        Alert.alert(t('common.error'), t('auth.biometric.sessionExpired'));
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <ScreenLayout
      scrollable
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>{t('auth.login.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('auth.login.email')}
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError();
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />

            <Input
              label={t('auth.login.password')}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError();
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              onSubmitEditing={handleLogin}
              rightElement={
                <Button
                  variant="ghost"
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={Colors.textSecondary} />
                  )}
                </Button>
              }
            />

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {isBiometricEnabled && biometricAvailability?.available ? (
              <Button
                variant="secondary"
                fullWidth
                onPress={handleBiometricLogin}
                disabled={isLoading || biometricLoading}
                loading={biometricLoading}
                style={styles.biometricButton}
              >
                {t('auth.biometric.loginWith', { method: biometricAvailability.buttonLabel })}
              </Button>
            ) : null}

            <View style={styles.divider}>
              {isBiometricEnabled && biometricAvailability?.available ? (
                <Text style={styles.dividerText}>{t('common.or').toLowerCase()}</Text>
              ) : null}
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={handleLogin}
              disabled={isLoading}
              loading={isLoading}
              style={styles.submitButton}
            >
              {t('auth.login.signIn')}
            </Button>
          </View>

          <View style={styles.footer}>
            <Button
              variant="ghost"
              onPress={() => router.push('/signup')}
              style={styles.signupLink}
            >
              <Text style={styles.signupLinkText}>
                {t('auth.login.noAccount')} <Text style={styles.signupLinkBold}>{t('auth.login.signUp')}</Text>
              </Text>
            </Button>
          </View>
        </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.md, // 16px screen horizontal padding
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    ...StatusStyles.error,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    lineHeight: 21, // 14px * 1.5
  },
  biometricButton: {
    marginBottom: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.sm,
    alignItems: 'center',
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    marginTop: Spacing.xxxl,
    alignItems: 'center',
  },
  signupLink: {
    marginBottom: Spacing.lg,
  },
  signupLinkText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  signupLinkBold: {
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  footerText: {
    ...Typography.small,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
