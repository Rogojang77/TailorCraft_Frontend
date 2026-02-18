import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useI18n } from '@/lib/i18n';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';

/**
 * Modal shown when a draft was restored from storage. User must choose:
 * Continuă (acknowledge and keep draft) or Șterge draft (clear). Draft never restores silently.
 */
export function DraftRestoredBanner() {
  const { t } = useI18n();
  const { draftStatus, acknowledgeRestoredDraft, clearDraft } = useOrderDraft();

  const visible = draftStatus === 'restored';

  const handleContinue = () => {
    acknowledgeRestoredDraft();
  };

  const handleDeleteDraft = () => {
    clearDraft();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleContinue}
    >
      <TouchableWithoutFeedback onPress={handleContinue}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.title}>{t('orderDraft.restoredTitle')}</Text>
              <Text style={styles.message}>{t('orderDraft.restoredMessage')}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleDeleteDraft}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryText}>{t('orderDraft.deleteDraft')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleContinue}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryText}>{t('orderDraft.continue')}</Text>
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
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    ...Shadows.lg,
  },
  title: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  primaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  primaryText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
});
