import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

/**
 * Modal shown when a draft was restored from storage.
 */
export function DraftRestoredBanner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { draftStatus, acknowledgeRestoredDraft, clearDraft } = useOrderDraft();

  const visible = draftStatus === 'restored';

  const handleDeleteDraft = () => {
    clearDraft();
    router.replace('/new-order/client-data');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={acknowledgeRestoredDraft}
    >
      <TouchableWithoutFeedback onPress={acknowledgeRestoredDraft}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(27,22,17,0.5)' }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.card }, AtelierShadow.elevated]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('orderDraft.restoredTitle')}
              </Text>
              <Text style={[styles.message, { color: colors.ink3 }]}>
                {t('orderDraft.restoredMessage')}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleDeleteDraft}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryLabel, { color: colors.ink3 }]}>
                    {t('orderDraft.deleteDraft')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.brass ?? colors.primary }]}
                  onPress={acknowledgeRestoredDraft}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.primaryLabel, { color: colors.paper ?? '#EFE9DC' }]}>
                    {t('orderDraft.continue')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.xl,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.sm,
  },
  message: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: AtelierSpacing.md,
  },
  secondaryButton: {
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: AtelierRadius.md,
  },
  primaryLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
});
