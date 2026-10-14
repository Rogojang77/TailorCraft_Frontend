import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword } from '@/lib/services/authService';
import { useI18n } from '@/lib/i18n';
import { getLocalizedApiMessage } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useDynamicTitle, useCustomBack } from '@/contexts/PageTitleContext';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useDynamicTitle(t('account.changePassword.title'));
  useCustomBack(() => router.back(), t('common.back'));

  const handleSubmit = async () => {
    const cur = currentPassword.trim();
    const newP = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!cur) {
      Alert.alert(t('common.error'), t('account.changePassword.enterCurrent'));
      return;
    }
    if (!newP) {
      Alert.alert(t('common.error'), t('auth.signup.enterPassword'));
      return;
    }
    if (newP.length < 6) {
      Alert.alert(t('common.error'), t('auth.signup.passwordLength'));
      return;
    }
    if (newP !== conf) {
      Alert.alert(t('common.error'), t('auth.signup.passwordsMatch'));
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await changePassword(accessToken, cur, newP);
      setSuccess(true);
    } catch (error: unknown) {
      const msg = getLocalizedApiMessage(error, t, t('account.changePassword.updateFailed'));
      setErrorMessage(msg);
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.successContent}>
          <CheckCircle size={64} color={colors.success} strokeWidth={2} />
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            {t('account.changePassword.successTitle')}
          </Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            {t('account.changePassword.successMessage')}
          </Text>
          <Button variant="primary" onPress={() => router.back()} style={styles.successButton}>
            {t('common.back')}
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('account.changePassword.subtitle')}
        </Text>

        <Input
          label={t('account.changePassword.currentPassword')}
          placeholder={t('auth.login.passwordPlaceholder')}
          value={currentPassword}
          onChangeText={(text) => {
            setCurrentPassword(text);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry={!showCurrent}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          rightElement={
            <Button
              variant="ghost"
              onPress={() => setShowCurrent((v) => !v)}
              accessibilityLabel={showCurrent ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
            >
              {showCurrent ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </Button>
          }
          containerStyle={styles.input}
        />

        <Input
          label={t('account.changePassword.newPassword')}
          placeholder={t('auth.signup.passwordPlaceholder')}
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry={!showNew}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          rightElement={
            <Button
              variant="ghost"
              onPress={() => setShowNew((v) => !v)}
              accessibilityLabel={showNew ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
            >
              {showNew ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </Button>
          }
          containerStyle={styles.input}
        />

        <Input
          label={t('auth.signup.confirmPassword')}
          placeholder={t('auth.signup.confirmPlaceholder')}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (errorMessage) setErrorMessage('');
          }}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          rightElement={
            <Button
              variant="ghost"
              onPress={() => setShowConfirm((v) => !v)}
              accessibilityLabel={showConfirm ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
            >
              {showConfirm ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </Button>
          }
          containerStyle={styles.input}
        />

        {errorMessage ? (
          <View style={[styles.errorContainer, { borderColor: colors.error }]}>
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
          {t('account.changePassword.submit')}
        </Button>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    padding: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.xxl,
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
    marginTop: AtelierSpacing.sm,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.xl,
  },
  successTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    marginTop: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.xl,
  },
  successButton: {
    minWidth: 160,
  },
});
