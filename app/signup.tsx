import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLayout } from '@/components/layout/ScreenLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/api';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { TERMS_URL, PRIVACY_POLICY_URL, LEGAL_LAST_UPDATED } from '@/constants/legal';

type SignupStep = 'personal' | 'company';

export default function SignupScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<SignupStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Personal data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Company data
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [address, setAddress] = useState('');

  // Consent (required for signup; never pre-checked)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const validatePersonalStep = (): boolean => {
    if (!email.trim()) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.enterEmail'));
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.validEmail'));
      return false;
    }

    if (!password.trim()) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.enterPassword'));
      return false;
    }

    if (password.length < 6) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.passwordLength'));
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.passwordsMatch'));
      return false;
    }

    return true;
  };

  const validateCompanyStep = (): boolean => {
    if (!companyName.trim()) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.enterCompanyName'));
      return false;
    }

    if (!ownerName.trim()) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.enterOwnerName'));
      return false;
    }

    if (!phone.trim()) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.enterPhone'));
      return false;
    }

    if (!companyEmail.trim()) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.enterCompanyEmail'));
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.validCompanyEmail'));
      return false;
    }

    if (!termsAccepted || !privacyAccepted) {
      Alert.alert(t('auth.signup.validationError'), t('auth.signup.consentRequired'));
      return false;
    }

    return true;
  };

  const openLegalDocument = async (type: 'terms' | 'privacy') => {
    try {
      const url = type === 'terms' ? TERMS_URL : PRIVACY_POLICY_URL;
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(t('common.error'), t('legal.openError'));
    }
  };

  const handleNext = () => {
    if (step === 'personal') {
      if (validatePersonalStep()) {
        setStep('company');
      }
    }
  };

  const handleBack = () => {
    if (step === 'company') {
      setErrorMessage('');
      setStep('personal');
    } else {
      router.back();
    }
  };

  const handleSignup = async () => {
    if (!validateCompanyStep()) {
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await signup({
        email: email.trim(),
        password: password.trim(),
        companyData: {
          name: companyName.trim(),
          owner: ownerName.trim(),
          phone: phone.trim(),
          email: companyEmail.trim(),
          address: address.trim() || undefined,
        },
        termsAccepted,
        privacyAccepted,
        marketingOptIn,
      });

      Alert.alert(
        t('auth.signup.accountCreated'),
        t('auth.signup.verifyMessage'),
        [{ text: t('common.ok'), onPress: () => router.replace('/login') }]
      );
    } catch (error: unknown) {
      const msg = getErrorMessage(error, t('auth.signup.createAccountError'));
      setErrorMessage(msg);
      Alert.alert(t('auth.signup.signupFailed'), msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPersonalStep = () => (
    <View style={styles.stepContent}>
      <Input
        label={t('auth.signup.emailLabel')}
        placeholder={t('auth.signup.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        editable={!isLoading}
      />

      <Input
        label={t('auth.signup.password')}
        placeholder={t('auth.signup.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        passwordRules="minlength: 6;"
        returnKeyType="next"
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
      />

      <Input
        label={t('auth.signup.confirmPassword')}
        placeholder={t('auth.signup.confirmPlaceholderAlt')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        passwordRules="minlength: 6;"
        returnKeyType="done"
        onSubmitEditing={handleNext}
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
      />
    </View>
  );

  const renderCompanyStep = () => (
    <View style={styles.stepContent}>
      <Input
        label={t('auth.signup.companyNameRequired')}
        placeholder={t('auth.signup.companyPlaceholder')}
        value={companyName}
        onChangeText={setCompanyName}
        editable={!isLoading}
      />

      <Input
        label={t('auth.signup.ownerNameRequired')}
        placeholder={t('auth.signup.enterOwnerNameShort')}
        value={ownerName}
        onChangeText={setOwnerName}
        editable={!isLoading}
      />

      <Input
        label={t('auth.signup.phoneRequired')}
        placeholder={t('auth.signup.phonePlaceholder')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!isLoading}
      />

      <Input
        label={t('auth.signup.companyEmailRequired')}
        placeholder={t('profile.emailPlaceholder')}
        value={companyEmail}
        onChangeText={setCompanyEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isLoading}
      />

      <Input
        label={t('auth.signup.addressOptional')}
        placeholder={t('auth.signup.enterCompanyAddress')}
        value={address}
        onChangeText={setAddress}
        optional
        editable={!isLoading}
      />

      {/* Consent (mandatory; never pre-checked) */}
      <View style={[styles.consentSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.consentTitle, { color: colors.textPrimary }]}>{t('auth.signup.consentTitle')}</Text>
        <ConsentCheckbox
          checked={termsAccepted}
          onToggle={() => setTermsAccepted((v) => !v)}
          label={t('auth.signup.consentTerms')}
          sublabel={t('auth.signup.lastUpdated', { date: LEGAL_LAST_UPDATED.terms })}
          documentUrl={TERMS_URL}
          onOpenDocument={() => openLegalDocument('terms')}
          optional={false}
          disabled={isLoading}
        />
        <ConsentCheckbox
          checked={privacyAccepted}
          onToggle={() => setPrivacyAccepted((v) => !v)}
          label={t('auth.signup.consentPrivacy')}
          sublabel={t('auth.signup.lastUpdated', { date: LEGAL_LAST_UPDATED.privacyPolicy })}
          documentUrl={PRIVACY_POLICY_URL}
          onOpenDocument={() => openLegalDocument('privacy')}
          optional={false}
          disabled={isLoading}
        />
        <ConsentCheckbox
          checked={marketingOptIn}
          onToggle={() => setMarketingOptIn((v) => !v)}
          label={t('auth.signup.consentMarketing')}
          optional
          disabled={isLoading}
        />
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );

  const insets = useSafeAreaInsets();

  return (
    <ScreenLayout scrollable={false}>
      <View style={styles.header}>
          <Button
            variant="back"
            onPress={handleBack}
            disabled={isLoading}
            accessibilityLabel={t('common.back')}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Button>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {step === 'personal' ? t('auth.signup.personalInfo') : t('auth.signup.companyDetails')}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.progressStep, { backgroundColor: colors.border }, step === 'personal' && { backgroundColor: colors.textPrimary }]} />
          <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
          <View style={[styles.progressStep, { backgroundColor: colors.border }, step === 'company' && { backgroundColor: colors.textPrimary }]} />
        </View>

        <View style={styles.flex1}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {step === 'personal' ? renderPersonalStep() : renderCompanyStep()}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, AtelierSpacing.md), backgroundColor: colors.paper ?? colors.background, borderTopColor: colors.rule ?? colors.border }]}>
            {step === 'personal' ? (
              <Button
                variant="primary"
                fullWidth
                onPress={handleNext}
                disabled={isLoading}
                rightIcon={<ChevronRight size={20} color={colors.textInverse} />}
                style={styles.stepButton}
              >
                {t('auth.signup.next')}
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                onPress={handleSignup}
                disabled={isLoading}
                loading={isLoading}
                style={styles.stepButton}
              >
                {t('auth.signup.createAccount')}
              </Button>
            )}
          </View>
        </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.xxl,
    paddingVertical: AtelierSpacing.lg,
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: AtelierSpacing.sm,
  },
  flex1: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
  },
  content: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
  },
  stepContent: {
    width: '100%',
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
  stepButton: {
    marginTop: 0,
  },
  consentSection: {
    marginTop: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.sm,
    paddingTop: AtelierSpacing.lg,
    borderTopWidth: 1,
  },
  consentTitle: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.sm,
  },
});
