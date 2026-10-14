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
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';
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
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.iconWrap}>
            <AlertCircle size={48} color={colors.brass ?? colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('legal.updateModal.title')}</Text>
          <Text style={[styles.bodyText, { color: colors.ink3 }, styles.summary]}>{info.summary}</Text>

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
            style={[styles.primaryBtn, { backgroundColor: colors.brass ?? colors.primary }, (!canAccept || isSubmitting) && { opacity: 0.5 }]}
            onPress={handleAccept}
            disabled={!canAccept || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.paper ?? '#EFE9DC'} />
            ) : (
              <Text style={[styles.bodyBoldText, { color: colors.paper ?? '#EFE9DC' }]}>{t('legal.updateModal.accept')}</Text>
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
    padding: AtelierSpacing.lg,
  },
  container: {
    borderRadius: 16,
    padding: AtelierSpacing.xl,
    maxWidth: 400,
    width: '100%',
    maxHeight: '85%',
  },
  iconWrap: {
    alignSelf: 'center',
    marginBottom: AtelierSpacing.md,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  summary: {
    textAlign: 'center',
    marginBottom: AtelierSpacing.lg,
  },
  scroll: {
    maxHeight: 200,
    marginBottom: AtelierSpacing.lg,
  },
  bodyText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBoldText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
