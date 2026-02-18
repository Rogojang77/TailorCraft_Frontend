import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenLayout } from '@/components/layout/ScreenLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getErrorMessage, uploadImage } from '@/lib/api';
import { ChevronLeft, ChevronRight, Camera, X, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Spacing, Typography, BorderRadius, StatusStyles } from '@/constants/design';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { TERMS_URL, PRIVACY_POLICY_URL, LEGAL_LAST_UPDATED } from '@/constants/legal';

type SignupStep = 'personal' | 'company';

export default function SignupScreen() {
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
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // Consent (required for signup; never pre-checked)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(t('auth.signup.permissionRequired'), t('auth.signup.permissionMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.signup.selectImageError'));
    }
  };

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
      // Upload logo if it's a local file
      let logoUrl: string | undefined = undefined;
      if (logoUri) {
        if (logoUri.startsWith('http')) {
          logoUrl = logoUri;
        } else {
          try {
            logoUrl = await uploadImage(logoUri);
          } catch (uploadError) {
            Alert.alert(t('common.error'), t('auth.signup.uploadError'));
            setIsLoading(false);
            return;
          }
        }
      }

      const response = await signup({
        email: email.trim(),
        password: password.trim(),
        companyData: {
          name: companyName.trim(),
          owner: ownerName.trim(),
          phone: phone.trim(),
          email: companyEmail.trim(),
          address: address.trim() || undefined,
          logoUrl,
        },
        termsAccepted,
        privacyAccepted,
        marketingOptIn,
      });

      Alert.alert(
        t('auth.signup.accountCreated'),
        t('auth.signup.verifyMessage'),
        [{ text: t('common.ok'), onPress: () => router.replace('/(tabs)') }]
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
              <EyeOff size={20} color={Colors.textSecondary} />
            ) : (
              <Eye size={20} color={Colors.textSecondary} />
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
              <EyeOff size={20} color={Colors.textSecondary} />
            ) : (
              <Eye size={20} color={Colors.textSecondary} />
            )}
          </Button>
        }
      />
    </View>
  );

  const renderCompanyStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t('auth.signup.companyLogoOptional')}</Text>
        <Button
          variant="ghost"
          style={styles.logoContainer}
          onPress={handleImagePicker}
          disabled={isLoading}
        >
          {logoUri ? (
            <View style={styles.logoImageContainer}>
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
              <Button
                variant="dangerIcon"
                onPress={() => setLogoUri(null)}
                style={styles.removeLogoButton}
                accessibilityLabel={t('common.remove')}
              >
                <X size={16} color={Colors.textInverse} />
              </Button>
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Camera size={32} color={Colors.textPrimary} />
              <Text style={styles.logoText}>{t('auth.signup.addLogo')}</Text>
            </View>
          )}
        </Button>
      </View>

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
      <View style={styles.consentSection}>
        <Text style={styles.consentTitle}>{t('auth.signup.consentTitle')}</Text>
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
          <Text style={styles.errorText}>{errorMessage}</Text>
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
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </Button>
          <Text style={styles.headerTitle}>
            {step === 'personal' ? t('auth.signup.personalInfo') : t('auth.signup.companyDetails')}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, step === 'personal' && styles.progressStepActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressStep, step === 'company' && styles.progressStepActive]} />
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

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            {step === 'personal' ? (
              <Button
                variant="primary"
                fullWidth
                onPress={handleNext}
                disabled={isLoading}
                rightIcon={<ChevronRight size={20} color={Colors.textInverse} />}
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
    paddingHorizontal: Spacing.md, // 16px screen horizontal padding
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44, // Minimum 44x44px for accessibility
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  progressStepActive: {
    backgroundColor: Colors.textPrimary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  content: {
    paddingHorizontal: Spacing.md, // 16px screen horizontal padding
    paddingTop: Spacing.lg, // 24px vertical section spacing
  },
  stepContent: {
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
  fieldContainer: {
    marginBottom: 14,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoImageContainer: {
    position: 'relative',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    minWidth: 24,
    minHeight: 24,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    ...Typography.small,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  stepButton: {
    marginTop: 0,
  },
  consentSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  consentTitle: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
});
