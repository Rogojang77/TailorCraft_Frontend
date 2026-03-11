import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Save, X } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';

const EDIT_MODAL_MAX_WIDTH = 400;

export interface OrderEditOrderInfoModalProps {
  visible: boolean;
  total: string;
  advance: string;
  notes: string;
  loading: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onTotalChange: (value: string) => void;
  onAdvanceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function OrderEditOrderInfoModal({
  visible,
  total,
  advance,
  notes,
  loading,
  onClose,
  onSave,
  onTotalChange,
  onAdvanceChange,
  onNotesChange,
}: OrderEditOrderInfoModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.editModalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.editModalOverlay, { backgroundColor: colors.overlayModal }]} />
        </TouchableWithoutFeedback>
        <View style={styles.editModalCentered} pointerEvents="box-none">
          <View style={[styles.editModalCard, { maxWidth: EDIT_MODAL_MAX_WIDTH, backgroundColor: colors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>{t('orderDetails.paymentInfo')}</Text>
              <TouchableOpacity style={styles.editModalCloseBtn} onPress={onClose} disabled={loading} activeOpacity={0.7}>
                <X size={22} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.editModalSection}>
                <Input
                  label={t('newOrder.summary.totalLabelRon')}
                  value={total}
                  onChangeText={onTotalChange}
                  placeholder={t('newOrder.summary.amountPlaceholder')}
                  keyboardType="numeric"
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('newOrder.summary.paidAmount') + ' (RON)'}
                  value={advance}
                  onChangeText={onAdvanceChange}
                  placeholder={t('newOrder.summary.amountPlaceholder')}
                  keyboardType="numeric"
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('orderDetails.notesLabel')}
                  value={notes}
                  onChangeText={onNotesChange}
                  placeholder={t('orderDetails.notesPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  optional
                  containerStyle={styles.editModalInput}
                />
              </View>
            </KeyboardAwareScrollView>
            <View style={[styles.editModalActions, { borderTopColor: colors.border }]}>
              <Button variant="secondary" onPress={onClose} disabled={loading} style={styles.editModalCancelBtn}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={onSave}
                disabled={loading}
                loading={loading}
                leftIcon={loading ? undefined : <Save size={18} color={colors.textInverse} strokeWidth={2.5} />}
                style={styles.editModalSaveBtn}
              >
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  editModalRoot: {
    flex: 1,
  },
  editModalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  editModalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  editModalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: BorderRadius.lg,
    ...Shadows.xl,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  editModalTitle: {
    ...Typography.h3,
    flex: 0,
    maxWidth: '80%',
  },
  editModalCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    flex: 1,
  },
  editModalScroll: {
    maxHeight: 500,
    paddingHorizontal: Spacing.lg,
  },
  editModalSection: {
    marginBottom: Spacing.md,
  },
  editModalInput: {
    marginBottom: Spacing.md,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  editModalCancelBtn: {
    flex: 1,
  },
  editModalSaveBtn: {
    flex: 1,
  },
});
