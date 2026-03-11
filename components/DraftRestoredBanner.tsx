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
import { getTypography, Spacing, BorderRadius, Shadows } from '@/constants/design';

/**
 * Modal shown when a draft was restored from storage. User must choose:
 * Continuă (acknowledge and keep draft) or Șterge draft (clear). Draft never restores silently.
 */
export function DraftRestoredBanner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const router = useRouter();
  const { draftStatus, acknowledgeRestoredDraft, clearDraft } = useOrderDraft();

  const visible = draftStatus === 'restored';

  const handleContinue = () => {
    acknowledgeRestoredDraft();
  };

  const handleDeleteDraft = () => {
    clearDraft();
    router.replace('/new-order/client-data');
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
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[typography.h3, styles.title]}>{t('orderDraft.restoredTitle')}</Text>
              <Text style={[typography.body, { color: colors.textSecondary }, styles.message]}>
                {t('orderDraft.restoredMessage')}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleDeleteDraft}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.bodyBold, { color: colors.textSecondary }]}>
                    {t('orderDraft.deleteDraft')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleContinue}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.bodyBold, { color: colors.textInverse }]}>
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
    padding: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    ...Shadows.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  message: {
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
  primaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
});
