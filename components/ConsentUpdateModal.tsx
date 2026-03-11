import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { AlertCircle } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, getButtonStyles, Spacing } from '@/constants/design';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import type { ConsentUpdateInfo } from '@/contexts/ConsentContext';

interface ConsentUpdateModalProps {
  visible: boolean;
  info: ConsentUpdateInfo;
  onAccept: () => void;
}

/**
 * Blocking modal shown when backend requires new consent.
 * User must check both boxes and tap Accept to continue.
 */
export function ConsentUpdateModal({ visible, info, onAccept }: ConsentUpdateModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const buttonStyles = getButtonStyles(colors);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAccept = termsAccepted && privacyAccepted;

  const openDocument = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(t('common.error'), t('legal.openError'));
    }
  };

  const handleAccept = async () => {
    if (!canAccept || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAccept();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlayDark }]}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.iconWrap}>
            <AlertCircle size={48} color={colors.primary} />
          </View>
          <Text style={[typography.h3, styles.title]}>{t('legal.updateModal.title')}</Text>
          <Text style={[typography.body, { color: colors.textSecondary }, styles.summary]}>{info.summary}</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <ConsentCheckbox
              checked={termsAccepted}
              onToggle={() => setTermsAccepted((v) => !v)}
              label={t('legal.updateModal.termsLabel')}
              documentUrl={info.termsUrl}
              onOpenDocument={() => openDocument(info.termsUrl)}
              optional={false}
            />
            <ConsentCheckbox
              checked={privacyAccepted}
              onToggle={() => setPrivacyAccepted((v) => !v)}
              label={t('legal.updateModal.privacyLabel')}
              documentUrl={info.privacyUrl}
              onOpenDocument={() => openDocument(info.privacyUrl)}
              optional={false}
            />
          </ScrollView>

          <TouchableOpacity
            style={[buttonStyles.primary, (!canAccept || isSubmitting) && { opacity: 0.5 }]}
            onPress={handleAccept}
            disabled={!canAccept || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[typography.bodyBold, { color: colors.textInverse }]}>{t('legal.updateModal.accept')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    borderRadius: 16,
    padding: Spacing.xl,
    maxWidth: 400,
    width: '100%',
    maxHeight: '85%',
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  summary: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  scroll: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
});
