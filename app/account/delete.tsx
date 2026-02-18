import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/api';
import {
  getDeletionStatus,
  requestAccountDeletion,
  AccountDeletionErrorCode,
  isAccountDeletionError,
} from '@/lib/services/authService';
import { Colors, Spacing, Typography, ButtonStyles, BorderRadius, Shadows, StatusStyles } from '@/constants/design';

type Step = 'explanation' | 'reauth' | 'confirm' | 'success';

export default function DeleteAccountScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, accessToken, logout } = useAuth();
  const [step, setStep] = useState<Step>('explanation');
  const [statusLoading, setStatusLoading] = useState(true);
  const [deletionStatus, setDeletionStatus] = useState<'active' | 'pending' | 'deleted' | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkDeletionStatus = useCallback(async () => {
    if (!accessToken) return;
    setStatusLoading(true);
    try {
      const res = await getDeletionStatus(accessToken);
      setDeletionStatus(res.status);
      if (res.status === 'deleted') {
        await logout();
        router.replace('/login');
        return;
      }
      if (res.status === 'pending') {
        setStep('success');
        setErrorMessage(null);
      }
    } catch {
      setDeletionStatus('active');
    } finally {
      setStatusLoading(false);
    }
  }, [accessToken, logout, router]);

  useFocusEffect(
    useCallback(() => {
      checkDeletionStatus();
    }, [checkDeletionStatus])
  );

  useEffect(() => {
    if (step === 'success' && deletionStatus === 'active') {
      setDeletionStatus(null);
      setStep('explanation');
    }
  }, [step, deletionStatus]);

  const handleBack = () => {
    if (step === 'explanation') {
      router.back();
    } else {
      setStep(step === 'reauth' ? 'explanation' : 'reauth');
      setErrorMessage(null);
      if (step === 'confirm') setPassword('');
    }
  };

  const handleContinueFromExplanation = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('reauth');
    setPassword('');
    setErrorMessage(null);
  };

  const handleContinueFromReauth = () => {
    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage(t('account.delete.passwordRequired'));
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('confirm');
    setErrorMessage(null);
  };

  const handleConfirmDeletion = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitLoading(true);
    setErrorMessage(null);
    try {
      const res = await requestAccountDeletion({ password: password.trim(), accessToken });
      if (res.status === 'deleted' || res.status === 'pending') {
        setDeletionStatus(res.status);
        setStep('success');
        if (res.status === 'deleted') {
          await logout();
          setTimeout(() => router.replace('/login'), 1500);
        }
      } else {
        setErrorMessage(t('account.delete.errorGeneric'));
      }
    } catch (err) {
      if (isAccountDeletionError(err)) {
        const code = err.code;
        if (code === AccountDeletionErrorCode.SUBSCRIPTION_ACTIVE) {
          setErrorMessage(t('account.delete.errorSubscriptionActive'));
        } else if (code === AccountDeletionErrorCode.ALREADY_DELETED) {
          setErrorMessage(t('account.delete.errorAlreadyDeleted'));
          setTimeout(() => {
            logout();
            router.replace('/login');
          }, 2000);
        } else if (code === AccountDeletionErrorCode.DELETION_PENDING) {
          setErrorMessage(t('account.delete.errorDeletionPending'));
          setStep('success');
        } else if (code === AccountDeletionErrorCode.INVALID_PASSWORD) {
          setErrorMessage(t('account.delete.errorInvalidPassword'));
        } else {
          setErrorMessage(err.message || t('account.delete.errorGeneric'));
        }
      } else {
        setErrorMessage(getErrorMessage(err, t('account.delete.errorNetwork')));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (statusLoading && !deletionStatus) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (deletionStatus === 'pending' && step === 'success') {
    return (
      <ScreenContainer noPadding>
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={64} color={Colors.success} strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>{t('account.delete.pendingTitle')}</Text>
          <Text style={styles.successMessage}>{t('account.delete.pendingMessage')}</Text>
          <TouchableOpacity
            style={[ButtonStyles.primary, styles.primaryButton]}
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('account.delete.logOut')}</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (step === 'success' && deletionStatus === 'deleted') {
    return (
      <ScreenContainer noPadding>
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={64} color={Colors.success} strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>{t('account.delete.successTitle')}</Text>
          <Text style={styles.successMessage}>{t('account.delete.successMessage')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={ButtonStyles.back}
          activeOpacity={0.7}
          accessibilityLabel={t('common.cancel')}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'explanation' && t('account.delete.title')}
          {step === 'reauth' && t('account.delete.stepReauthTitle')}
          {step === 'confirm' && t('account.delete.stepConfirmTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.flex1}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'explanation' && (
            <>
              <View style={styles.warningBanner}>
                <AlertTriangle size={28} color={Colors.warning} strokeWidth={2} />
                <Text style={styles.warningBannerText}>{t('account.delete.warningBanner')}</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('account.delete.whatHappensTitle')}</Text>
              <Text style={styles.bodyText}>{t('account.delete.whatHappensBody')}</Text>
              <Text style={styles.sectionTitle}>{t('account.delete.dataRemovedTitle')}</Text>
              <Text style={styles.bodyText}>{t('account.delete.dataRemovedBody')}</Text>
              <Text style={styles.sectionTitle}>{t('account.delete.retentionTitle')}</Text>
              <Text style={styles.bodyText}>{t('account.delete.retentionBody')}</Text>
              <Text style={styles.sectionTitle}>{t('account.delete.subscriptionsTitle')}</Text>
              <Text style={styles.bodyText}>{t('account.delete.subscriptionsBody')}</Text>
              <Text style={styles.sectionTitle}>{t('account.delete.lossOfAccessTitle')}</Text>
              <Text style={styles.bodyText}>{t('account.delete.lossOfAccessBody')}</Text>
            </>
          )}

          {step === 'reauth' && (
            <>
              <Text style={styles.bodyText}>{t('account.delete.reauthDescription')}</Text>
              <Input
                label={t('auth.login.email')}
                value={user?.email ?? ''}
                editable={false}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('auth.login.password')}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage(null);
                }}
                placeholder={t('auth.login.passwordPlaceholder')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitLoading}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={Colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                }
                containerStyle={styles.inputGroup}
              />
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
            </>
          )}

          {step === 'confirm' && (
            <>
              <View style={styles.destructiveBanner}>
                <Trash2 size={28} color={Colors.error} strokeWidth={2} />
                <Text style={styles.destructiveBannerText}>{t('account.delete.finalWarning')}</Text>
              </View>
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
            </>
          )}
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          {step === 'explanation' && (
            <Button variant="primary" fullWidth onPress={handleContinueFromExplanation} style={styles.footerButton}>
              {t('account.delete.continueToNextStep')}
            </Button>
          )}
          {step === 'reauth' && (
            <>
              <Button
                variant="primary"
                fullWidth
                onPress={handleContinueFromReauth}
                disabled={submitLoading}
                style={styles.footerButton}
              >
                {t('account.delete.continueToConfirm')}
              </Button>
              <Button variant="secondary" fullWidth onPress={handleBack} style={styles.footerButtonSecondary}>
                {t('common.cancel')}
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <TouchableOpacity
                style={[styles.destructiveButton, submitLoading && styles.buttonDisabled]}
                onPress={handleConfirmDeletion}
                activeOpacity={0.8}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.destructiveButtonText}>{t('account.delete.confirmDeleteButton')}</Text>
                )}
              </TouchableOpacity>
              <Button variant="secondary" fullWidth onPress={handleBack} disabled={submitLoading} style={styles.footerButtonSecondary}>
                {t('common.cancel')}
              </Button>
            </>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontSize: 18,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  flex1: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  footerButton: {
    marginTop: 0,
  },
  footerButtonSecondary: {
    marginTop: Spacing.xs,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    ...StatusStyles.warning,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  warningBannerText: {
    ...Typography.bodyBold,
    color: Colors.warningText,
    marginLeft: Spacing.md,
    flex: 1,
  },
  destructiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    ...StatusStyles.error,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  destructiveBannerText: {
    ...Typography.bodyBold,
    color: Colors.errorTextDark,
    marginLeft: Spacing.md,
    flex: 1,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorBox: {
    ...StatusStyles.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    fontSize: 14,
  },
  destructiveButton: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  destructiveButtonText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textInverse,
  },
  cancelButton: {
    marginTop: Spacing.xs,
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  successContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconWrap: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successMessage: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    minWidth: 200,
    ...Shadows.primary,
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textInverse,
  },
});
