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
import { useTheme } from '@/contexts/ThemeContext';
import { useDynamicTitle, useCustomBack } from '@/contexts/PageTitleContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

type Step = 'explanation' | 'reauth' | 'confirm' | 'success';

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
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
      if (res.status === 'deleted' || res.status === 'pending') {
        await logout();
        router.replace('/login');
        return;
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
        await logout();
        setTimeout(() => router.replace('/login'), res.status === 'deleted' ? 1500 : 0);
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
          await logout();
          setTimeout(() => router.replace('/login'), 2000);
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

  const insets = useSafeAreaInsets();
  const getStepTitle = () => {
    if (step === 'explanation') return t('account.delete.title');
    if (step === 'reauth') return t('account.delete.stepReauthTitle');
    return t('account.delete.stepConfirmTitle');
  };
  useDynamicTitle(getStepTitle());
  useCustomBack(handleBack, t('common.cancel'));

  if (statusLoading && !deletionStatus) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (deletionStatus === 'pending' && step === 'success') {
    return (
      <ScreenContainer noPadding>
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={64} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>{t('account.delete.pendingTitle')}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>{t('account.delete.pendingMessage')}</Text>
          <TouchableOpacity
            style={[styles.primaryButtonBase, styles.primaryButton]}
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>{t('account.delete.logOut')}</Text>
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
            <CheckCircle size={64} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>{t('account.delete.successTitle')}</Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>{t('account.delete.successMessage')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <View style={styles.flex1}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'explanation' && (
            <>
              <View style={[styles.warningBanner, { borderLeftColor: colors.warning }]}>
                <AlertTriangle size={28} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.warningBannerText, { color: colors.brassDeep ?? colors.brass }]}>{t('account.delete.warningBanner')}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('account.delete.whatHappensTitle')}</Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{t('account.delete.whatHappensBody')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('account.delete.dataRemovedTitle')}</Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{t('account.delete.dataRemovedBody')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('account.delete.retentionTitle')}</Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{t('account.delete.retentionBody')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('account.delete.subscriptionsTitle')}</Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{t('account.delete.subscriptionsBody')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('account.delete.lossOfAccessTitle')}</Text>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{t('account.delete.lossOfAccessBody')}</Text>
            </>
          )}

          {step === 'reauth' && (
            <>
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{t('account.delete.reauthDescription')}</Text>
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
                      <EyeOff size={20} color={colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                }
                containerStyle={styles.inputGroup}
              />
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                </View>
              ) : null}
            </>
          )}

          {step === 'confirm' && (
            <>
              <View style={[styles.destructiveBanner, { borderLeftColor: colors.error }]}>
                <Trash2 size={28} color={colors.error} strokeWidth={2} />
                <Text style={[styles.destructiveBannerText, { color: colors.ember ?? colors.error }]}>{t('account.delete.finalWarning')}</Text>
              </View>
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                </View>
              ) : null}
            </>
          )}
        </KeyboardAwareScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, AtelierSpacing.md), backgroundColor: colors.paper ?? colors.background, borderTopColor: colors.rule ?? colors.border }]}>
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
                style={[styles.destructiveButton, { backgroundColor: colors.error }, submitLoading && styles.buttonDisabled]}
                onPress={handleConfirmDeletion}
                activeOpacity={0.8}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.destructiveButtonText, { color: colors.textInverse }]}>{t('account.delete.confirmDeleteButton')}</Text>
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
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
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
    padding: AtelierSpacing.lg,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
    gap: AtelierSpacing.sm,
  },
  footerButton: {
    marginTop: 0,
  },
  footerButtonSecondary: {
    marginTop: AtelierSpacing.xs,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: AtelierSpacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (undefined as unknown as string),
    borderLeftWidth: 4,
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
    marginBottom: AtelierSpacing.md,
  },
  warningBannerText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    marginLeft: AtelierSpacing.md,
    flex: 1,
  },
  destructiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (undefined as unknown as string),
    borderLeftWidth: 4,
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
    marginBottom: AtelierSpacing.md,
  },
  destructiveBannerText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    marginLeft: AtelierSpacing.md,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
    marginTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.xs,
  },
  bodyText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.sm,
  },
  inputGroup: {
    marginTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
  },
  errorBox: {
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
    marginTop: AtelierSpacing.md,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 22,
  },
  destructiveButton: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: AtelierRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AtelierSpacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  destructiveButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  cancelButton: {
    marginTop: AtelierSpacing.xs,
  },
  cancelButtonText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  successContent: {
    flex: 1,
    padding: AtelierSpacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconWrap: {
    marginBottom: AtelierSpacing.xl,
  },
  successTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: AtelierSpacing.md,
  },
  successMessage: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: AtelierSpacing.xl,
  },
  primaryButtonBase: {
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: AtelierRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minWidth: 200,
    ...AtelierShadow.elevated,
  },
  primaryButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
});
