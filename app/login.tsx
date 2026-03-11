import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { ScreenLayout } from '@/components/layout/ScreenLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getLocalizedApiMessage } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius, StatusStyles } from '@/constants/design';
import type { BiometricAvailability } from '@/lib/biometric';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricAvailability, setBiometricAvailability] = useState<BiometricAvailability | null>(null);
  const {
    user,
    login,
    loginWithSocial,
    isBiometricEnabled,
    enableBiometricLogin,
    loginWithBiometric,
    getBiometricAvailability,
  } = useAuth();
  const router = useRouter();

  const googleClientIds = {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };
  const hasGoogleConfig =
    !!googleClientIds.iosClientId || !!googleClientIds.androidClientId || !!googleClientIds.webClientId;

  const [request, googleResult, promptGoogleAsync] = useAuthRequest(
    hasGoogleConfig ? googleClientIds : { clientId: 'placeholder-no-google-config' }
  );

  // When biometric login is enabled, check if device supports it so we can show the biometric button.
  useEffect(() => {
    if (!isBiometricEnabled) return;
    getBiometricAvailability().then(setBiometricAvailability);
  }, [isBiometricEnabled, getBiometricAvailability]);

  // When Google OAuth returns successfully, send id_token to backend.
  useEffect(() => {
    if (!googleResult || googleResult.type !== 'success' || !hasGoogleConfig) return;
    const idToken =
      googleResult.params.id_token ?? (googleResult as { authentication?: { idToken?: string } }).authentication?.idToken;
    if (!idToken) return;
    setGoogleLoading(true);
    setErrorMessage('');
    loginWithSocial('google', { idToken })
      .then((result) => {
        router.replace(result.needsCompanyDetails ? '/(tabs)/profile?completeCompany=1' : '/(tabs)');
      })
      .catch((err: unknown) => {
        const msg = getLocalizedApiMessage(err, t, t('auth.social.error'));
        setErrorMessage(msg);
        Alert.alert(t('auth.login.loginFailed'), msg);
      })
      .finally(() => {
        setGoogleLoading(false);
      });
  }, [googleResult, hasGoogleConfig, loginWithSocial, router, t]);

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
        router.replace('/(tabs)');
      } else if (result.reason === 'session_expired') {
        Alert.alert(t('common.error'), t('auth.biometric.sessionExpired'));
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (!hasGoogleConfig) {
      Alert.alert(t('common.error'), t('auth.social.providerUnavailable'));
      return;
    }
    setErrorMessage('');
    setGoogleLoading(true);
    try {
      const result = await promptGoogleAsync();
      if (result.type === 'dismiss' || result.type === 'cancel') {
        // User cancelled; don't show error.
      } else if (result.type === 'error') {
        setErrorMessage(t('auth.social.error'));
      }
      // Success is handled in useEffect when googleResult updates.
    } catch (err) {
      setErrorMessage(getLocalizedApiMessage(err, t, t('auth.social.error')));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApplePress = async () => {
    setErrorMessage('');
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const result = await loginWithSocial('apple', { identityToken: credential.identityToken });
        // If needsCompanyDetails, we still go to (tabs); CompanyDetailsRequiredModal will block until they complete the form.
        router.replace('/(tabs)');
      } else {
        setErrorMessage(t('auth.social.error'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // 1000 = ASAuthorizationError.canceled, -7026 = AuthKit user denied; treat as user cancelled.
      const isUserCancel =
        msg.includes('cancel') ||
        msg.includes('Cancel') ||
        msg.includes('ERR_REQUEST_CANCELED') ||
        msg.includes('1000') ||
        msg.includes('-7026');
      if (isUserCancel) {
        // User cancelled or dismissed; no message.
      } else if (msg.includes('No active account')) {
        // No Apple ID signed in on device – show helpful message.
        setErrorMessage(t('auth.social.appleUnavailable'));
      } else if (
        msg.includes('AuthorizationError') ||
        msg.includes('AKAuthenticationError')
      ) {
        // Other Apple auth errors (e.g. capability not ready, simulator) – show helpful message.
        setErrorMessage(t('auth.social.appleUnavailable'));
      } else {
        setErrorMessage(getLocalizedApiMessage(err, t, t('auth.social.error')));
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const isSocialLoading = googleLoading || appleLoading;
  const anyLoading = isLoading || isSocialLoading;

  return (
    <ScreenLayout
      scrollable
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={isDark 
                ? require('@/assets/images/Logo_white.png')
                : require('@/assets/images/Logo_black.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.login.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.login.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            {hasGoogleConfig ? (
              <Button
                variant="secondary"
                fullWidth
                onPress={handleGooglePress}
                disabled={anyLoading}
                loading={googleLoading}
                style={styles.socialButton}
              >
                <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>{t('auth.social.continueGoogle')}</Text>
              </Button>
            ) : null}
            {Platform.OS === 'ios' ? (
              <View
                style={[styles.appleButtonWrap, anyLoading && styles.appleButtonWrapDisabled]}
                pointerEvents={anyLoading ? 'none' : 'auto'}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={BorderRadius.md}
                  style={styles.appleButton}
                  onPress={handleApplePress}
                />
              </View>
            ) : null}
            {(hasGoogleConfig || Platform.OS === 'ios') ? (
              <View style={styles.divider}>
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('common.or').toLowerCase()}</Text>
              </View>
            ) : null}

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
              editable={!anyLoading}
            />

            <Input
              label={t('auth.login.password')}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError();
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!anyLoading}
              onSubmitEditing={handleLogin}
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
            />

            <Button
              variant="ghost"
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotPasswordLink}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.textSecondary }]}>
                {t('auth.login.forgotPassword')}
              </Text>
            </Button>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {isBiometricEnabled && biometricAvailability?.available ? (
              <Button
                variant="secondary"
                fullWidth
                onPress={handleBiometricLogin}
                disabled={anyLoading || biometricLoading}
                loading={biometricLoading}
                style={styles.biometricButton}
              >
                {t('auth.biometric.loginWith', { method: biometricAvailability.buttonLabel })}
              </Button>
            ) : null}

            <View style={styles.divider}>
              {isBiometricEnabled && biometricAvailability?.available ? (
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('common.or').toLowerCase()}</Text>
              ) : null}
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={handleLogin}
              disabled={anyLoading}
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
              <Text style={[styles.signupLinkText, { color: colors.textSecondary }]}>
                {t('auth.login.noAccount')} <Text style={[styles.signupLinkBold, { color: colors.textPrimary }]}>{t('auth.login.signUp')}</Text>
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
    paddingHorizontal: Spacing.md,
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
  },
  form: {
    width: '100%',
  },
  socialButton: {
    marginBottom: Spacing.sm,
  },
  socialButtonText: {
    ...Typography.body,
  },
  appleButtonWrap: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  appleButtonWrapDisabled: {
    opacity: 0.6,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
  },
  forgotPasswordText: {
    ...Typography.caption,
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
    lineHeight: 21,
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
    textAlign: 'center',
  },
  signupLinkBold: {
    fontWeight: '600',
  },
  footerText: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 18,
  },
});
