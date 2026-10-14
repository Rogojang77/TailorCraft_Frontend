import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getLocalizedApiMessage } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import type { BiometricAvailability } from '@/lib/biometric';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  FontFamily,
  AtelierSpacing,
  AtelierRadius,
  AtelierShadow,
} from '@/constants/atelierDesign';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

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

  const [, googleResult, promptGoogleAsync] = useAuthRequest(
    hasGoogleConfig ? googleClientIds : { clientId: 'placeholder-no-google-config' }
  );

  useEffect(() => {
    if (!isBiometricEnabled) return;
    getBiometricAvailability().then(setBiometricAvailability);
  }, [isBiometricEnabled, getBiometricAvailability]);

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
      .finally(() => setGoogleLoading(false));
  }, [googleResult, hasGoogleConfig, loginWithSocial, router, t]);

  const clearError = () => { if (errorMessage) setErrorMessage(''); };

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
      const result = await loginWithBiometric({ promptMessage: t('auth.biometric.promptMessage') });
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
      if (result.type === 'error') setErrorMessage(t('auth.social.error'));
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
        await loginWithSocial('apple', { identityToken: credential.identityToken });
        router.replace('/(tabs)');
      } else {
        setErrorMessage(t('auth.social.error'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCancel = msg.includes('cancel') || msg.includes('Cancel') ||
        msg.includes('ERR_REQUEST_CANCELED') || msg.includes('1000') || msg.includes('-7026');
      if (!isCancel) {
        if (msg.includes('No active account') || msg.includes('AuthorizationError') || msg.includes('AKAuthenticationError')) {
          setErrorMessage(t('auth.social.appleUnavailable'));
        } else {
          setErrorMessage(getLocalizedApiMessage(err, t, t('auth.social.error')));
        }
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const isSocialLoading = googleLoading || appleLoading;
  const anyLoading = isLoading || isSocialLoading || biometricLoading;

  const bg = colors.paper;
  const inkColor = colors.textPrimary;
  const ink3 = colors.ink3 ?? colors.textSecondary;
  const ink4 = colors.ink4 ?? colors.textTertiary;
  const brassColor = colors.brass;
  const ruleColor = colors.rule ?? colors.border;
  const cardBg = colors.card;

  return (
    <KeyboardAwareScrollView
      bottomOffset={AtelierSpacing.xl}
      style={[styles.scroll, { backgroundColor: bg }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + AtelierSpacing.sm, paddingBottom: insets.bottom + AtelierSpacing.xxl },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Nameplate */}
      <View style={styles.nameplate}>
        <Text style={[styles.nameplateTitle, { color: inkColor }]}>
          TailorCraft
        </Text>
        <View style={[styles.nameplateRule, { backgroundColor: brassColor }]} />
        <Text style={[styles.nameplateTagline, { color: ink3 }]}>
          {t('auth.login.tagline')}
        </Text>
      </View>

      {/* Sign-in card */}
      <View style={[styles.card, { backgroundColor: cardBg }, AtelierShadow.card]}>
        {/* Social buttons */}
        {hasGoogleConfig ? (
          <TouchableOpacity
            style={[styles.socialBtn, { borderColor: ruleColor, backgroundColor: bg }]}
            onPress={handleGooglePress}
            disabled={anyLoading}
            activeOpacity={0.7}
          >
            <Text style={[styles.socialBtnText, { color: inkColor }]}>
              {t('auth.social.continueGoogle')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {Platform.OS === 'ios' ? (
          <View style={[styles.appleWrap, anyLoading && styles.disabled]}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={AtelierRadius.sm}
              style={styles.appleBtn}
              onPress={handleApplePress}
            />
          </View>
        ) : null}

        {(hasGoogleConfig || Platform.OS === 'ios') ? (
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: ruleColor }]} />
            <Text style={[styles.dividerText, { color: ink4 }]}>{t('common.or').toLowerCase()}</Text>
            <View style={[styles.dividerLine, { backgroundColor: ruleColor }]} />
          </View>
        ) : null}

        {/* Email + password */}
        <Input
          label={t('auth.login.email')}
          placeholder={t('auth.login.emailPlaceholder')}
          value={email}
          onChangeText={(v) => { setEmail(v); clearError(); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!anyLoading}
        />

        <Input
          label={t('auth.login.password')}
          placeholder={t('auth.login.passwordPlaceholder')}
          value={password}
          onChangeText={(v) => { setPassword(v); clearError(); }}
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
              {showPassword
                ? <EyeOff size={18} color={ink3} />
                : <Eye size={18} color={ink3} />
              }
            </Button>
          }
        />

        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => router.push('/forgot-password')}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Text style={[styles.forgotText, { color: ink3 }]}>
            {t('auth.login.forgotPassword')}
          </Text>
        </TouchableOpacity>

        {errorMessage ? (
          <View style={[styles.errorBox, { borderColor: colors.ember, backgroundColor: `${colors.ember}12` }]}>
            <Text style={[styles.errorText, { color: colors.ember }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {isBiometricEnabled && biometricAvailability?.available ? (
          <Button
            variant="secondary"
            fullWidth
            onPress={handleBiometricLogin}
            disabled={anyLoading}
            loading={biometricLoading}
            style={styles.biometricBtn}
          >
            {t('auth.biometric.loginWith', { method: biometricAvailability.buttonLabel })}
          </Button>
        ) : null}

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: brassColor }, anyLoading && styles.disabled]}
          onPress={handleLogin}
          disabled={anyLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" accessibilityLabel={t('auth.login.signIn')} />
          ) : (
            <Text style={styles.primaryBtnText}>{t('auth.login.signIn')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <TouchableOpacity style={styles.signupRow} onPress={() => router.push('/signup')}>
        <Text style={[styles.signupText, { color: ink3 }]}>
          {t('auth.login.noAccount')}{' '}
          <Text style={[styles.signupLink, { color: brassColor }]}>
            {t('auth.login.signUp')}
          </Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: AtelierSpacing.pagePad,
  },

  // Swatch grid

  // Nameplate
  nameplate: {
    alignItems: 'center',
    marginBottom: AtelierSpacing.xl,
    gap: 6,
  },
  nameplateTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
  },
  nameplateRule: {
    width: 48,
    height: 1,
    marginVertical: 4,
  },
  nameplateTagline: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Card
  card: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.lg,
  },
  cardTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: AtelierSpacing.md,
  },

  // Social
  socialBtn: {
    height: 44,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  socialBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  appleWrap: {
    marginBottom: AtelierSpacing.sm,
  },
  appleBtn: {
    width: '100%',
    height: 44,
  },
  disabled: {
    opacity: 0.5,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AtelierSpacing.sm,
    gap: AtelierSpacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    letterSpacing: 0.4,
  },

  // Forgot password
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: AtelierSpacing.md,
  },
  forgotText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
  },

  // Error
  errorBox: {
    borderWidth: 1,
    borderRadius: AtelierRadius.xs,
    padding: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.md,
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },

  // Biometric
  biometricBtn: {
    marginBottom: AtelierSpacing.sm,
  },

  // Primary CTA
  primaryBtn: {
    height: 48,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: AtelierSpacing.xs,
  },
  primaryBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Footer
  signupRow: {
    alignItems: 'center',
    paddingVertical: AtelierSpacing.sm,
  },
  signupText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  signupLink: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
});
