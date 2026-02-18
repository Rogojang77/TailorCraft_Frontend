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
import { Colors, Spacing, Typography, ButtonStyles } from '@/constants/design';
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <AlertCircle size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{t('legal.updateModal.title')}</Text>
          <Text style={styles.summary}>{info.summary}</Text>

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
            style={[styles.button, (!canAccept || isSubmitting) && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={!canAccept || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>{t('legal.updateModal.accept')}</Text>
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
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.surface,
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
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  summary: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  scroll: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  button: {
    ...ButtonStyles.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
});
