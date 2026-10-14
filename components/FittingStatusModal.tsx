import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import type { FittingStatus } from '@/lib/fittings';
import { Button } from '@/components/ui/Button';

type StatusDisplayConfig = {
  backgroundColor: string;
  textColor: string;
};

interface FittingStatusModalProps {
  visible: boolean;
  onClose: () => void;
  statuses: readonly FittingStatus[];
  selectedStatus?: FittingStatus;
  onSelect: (status: FittingStatus) => void | Promise<void>;
  getStatusLabel: (status: FittingStatus) => string;
  getStatusDisplayConfig: (status: FittingStatus) => StatusDisplayConfig;
}

export function FittingStatusModal({
  visible,
  onClose,
  statuses,
  selectedStatus,
  onSelect,
  getStatusLabel,
  getStatusDisplayConfig,
}: FittingStatusModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [pendingStatus, setPendingStatus] = useState<FittingStatus>(statuses[0]);
  const [saveLoading, setSaveLoading] = useState(false);
  const statusOnOpenRef = useRef<FittingStatus>(statuses[0]);

  useEffect(() => {
    if (!visible) {
      setSaveLoading(false);
      return;
    }
    const initial = selectedStatus ?? statuses[0];
    statusOnOpenRef.current = initial;
    setPendingStatus(initial);
  }, [visible, selectedStatus, statuses]);

  const handleDismiss = () => {
    if (saveLoading) return;
    onClose();
  };

  const handleSave = async () => {
    if (pendingStatus === statusOnOpenRef.current || saveLoading) return;
    setSaveLoading(true);
    try {
      await Promise.resolve(onSelect(pendingStatus));
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={handleDismiss}>
        <Pressable style={[styles.statusPickerCard, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.statusPickerHeader}>
            <Text style={[styles.statusPickerTitle, { color: colors.textPrimary }]}>{t('orderDetails.fittings.changeStatusTitle')}</Text>
            <TouchableOpacity onPress={handleDismiss} activeOpacity={0.7} disabled={saveLoading} style={[styles.statusPickerCloseButton, { borderColor: colors.rule ?? colors.border }]}>
              <Ionicons name="close" size={16} color={colors.ink3} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.statusPickerSubtitle, { color: colors.ink3 }]}>{t('orderDetails.fittings.changeStatusMessage')}</Text>
          <View style={styles.statusPickerOptions}>
            {statuses.map((statusValue) => {
              const display = getStatusDisplayConfig(statusValue);
              const isSelected = pendingStatus === statusValue;
              return (
                <TouchableOpacity
                  key={statusValue}
                  style={[
                    styles.statusOptionButton,
                    { borderColor: isSelected ? display.textColor : colors.rule ?? colors.border, backgroundColor: display.backgroundColor },
                  ]}
                  onPress={() => setPendingStatus(statusValue)}
                  activeOpacity={0.75}
                  disabled={saveLoading}
                >
                  <Text style={[styles.statusOptionText, { color: display.textColor }]}>{getStatusLabel(statusValue)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.actionsRow, { borderTopColor: colors.rule ?? colors.border }]}>
            <Button variant="secondary" size="sm" style={styles.actionButton} onPress={handleDismiss} disabled={saveLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              style={styles.actionButton}
              onPress={handleSave}
              disabled={saveLoading || pendingStatus === statusOnOpenRef.current}
              loading={saveLoading}
            >
              {t('common.save')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: AtelierSpacing.lg,
  },
  statusPickerCard: {
    borderWidth: 1,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
  },
  statusPickerTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  statusPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AtelierSpacing.xs,
    gap: AtelierSpacing.sm,
  },
  statusPickerCloseButton: {
    width: 28,
    height: 28,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPickerSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.sm,
  },
  statusPickerOptions: {
    gap: AtelierSpacing.xs,
  },
  statusOptionButton: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.sm,
  },
  statusOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    marginTop: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
  },
});
