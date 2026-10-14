/**
 * Blocking modal shown when user signed up with Apple and must set a password
 * before using the app. Cannot be dismissed until the form is submitted successfully.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Eye, EyeOff, Save } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import * as authService from '@/lib/services/authService';
import { getLocalizedApiMessage } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

interface AddPasswordModalProps {
  visible: boolean;
  onComplete: () => void;
  clearNeedsPassword: () => Promise<void>;
}

export function AddPasswordModal({
  visible,
  onComplete,
  clearNeedsPassword,
}: AddPasswordModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
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

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await authService.setPassword(accessToken, password);
      await clearNeedsPassword();
      onComplete();
    } catch (e) {
      const msg = getLocalizedApiMessage(e, t, t('common.error'));
      Alert.alert(t('common.error'), msg);
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: colors.paper ?? colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('auth.applePasswordRequired.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.ink3 }]}>
              {t('auth.applePasswordRequired.message')}
            </Text>
          </View>
          <View style={styles.form}>
            <Input
              label={t('auth.signup.password')}
              placeholder={t('auth.applePasswordRequired.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="password-new"
              containerStyle={styles.inputGroup}
              rightElement={
                <Button
                  variant="ghost"
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.ink3} />
                  ) : (
                    <Eye size={20} color={colors.ink3} />
                  )}
                </Button>
              }
            />
            <Input
              label={t('auth.signup.confirmPassword')}
              placeholder={t('auth.applePasswordRequired.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="password-new"
              containerStyle={styles.inputGroupLast}
              rightElement={
                <Button
                  variant="ghost"
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  accessibilityLabel={showConfirmPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.ink3} />
                  ) : (
                    <Eye size={20} color={colors.ink3} />
                  )}
                </Button>
              }
            />
          </View>
          <View style={[styles.actions, { borderTopColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.brass ?? colors.primary }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.paper ?? '#EFE9DC'} />
              ) : (
                <>
                  <Save size={18} color={colors.paper ?? '#EFE9DC'} strokeWidth={2.5} />
                  <Text style={[styles.saveButtonText, { color: colors.paper ?? '#EFE9DC' }]}>
                    {t('auth.applePasswordRequired.submit')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  header: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
    marginBottom: AtelierSpacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
  },
  inputGroup: {
    marginBottom: AtelierSpacing.md,
  },
  inputGroupLast: {
    marginBottom: AtelierSpacing.xl,
  },
  actions: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: 14,
    borderRadius: AtelierRadius.md,
  },
  saveButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
});
