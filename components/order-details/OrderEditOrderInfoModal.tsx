import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { KeyboardAwareScrollView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Save, X } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

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
  const { preferredCurrency } = useSettings();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.editModalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.editModalOverlay, { backgroundColor: 'rgba(27,22,17,0.5)' }]} />
        </TouchableWithoutFeedback>
        <View style={styles.editModalCentered} pointerEvents="box-none">
          <View style={[styles.editModalCard, { maxWidth: EDIT_MODAL_MAX_WIDTH, backgroundColor: colors.card }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>{t('orderDetails.paymentInfo')}</Text>
              <TouchableOpacity style={styles.editModalCloseBtn} onPress={onClose} disabled={loading} activeOpacity={0.7}>
                <X size={22} color={colors.ink3} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.editModalSection}>
                <Input
                  label={`${t('newOrder.summary.totalAmount')} (${preferredCurrency})`}
                  value={total}
                  onChangeText={onTotalChange}
                  placeholder={t('newOrder.summary.amountPlaceholder')}
                  keyboardType="numeric"
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={`${t('newOrder.summary.paidAmount')} (${preferredCurrency})`}
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
                  placeholderTextColor={colors.ink4}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  optional
                  containerStyle={styles.editModalInput}
                />
              </View>
            </KeyboardAwareScrollView>
            <View style={[styles.editModalActions, { borderTopColor: colors.rule ?? colors.border }]}>
              <Button variant="secondary" onPress={onClose} disabled={loading} style={styles.editModalCancelBtn}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={onSave}
                disabled={loading}
                loading={loading}
                leftIcon={loading ? undefined : <Save size={18} color={colors.paper ?? '#EFE9DC'} strokeWidth={2.5} />}
                style={styles.editModalSaveBtn}
              >
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: AtelierSpacing.md,
  },
  editModalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: AtelierRadius.lg,
    ...AtelierShadow.elevated,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  editModalTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 26,
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
    paddingHorizontal: AtelierSpacing.lg,
  },
  editModalSection: {
    marginBottom: AtelierSpacing.md,
  },
  editModalInput: {
    marginBottom: AtelierSpacing.md,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: AtelierSpacing.md,
    padding: AtelierSpacing.lg,
    borderTopWidth: 1,
  },
  editModalCancelBtn: {
    flex: 1,
  },
  editModalSaveBtn: {
    flex: 1,
  },
});
