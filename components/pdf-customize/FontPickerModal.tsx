/**
 * Modal to pick font family for PDF appearance.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PRESET_FONTS } from '@/lib/pdfCustomizeConstants';
import { ModalStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface FontPickerModalProps {
  visible: boolean;
  selectedFont: string;
  onSelect: (fontValue: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function FontPickerModal({
  visible,
  selectedFont,
  onSelect,
  onClose,
  colors,
  t,
}: FontPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.overlayModal }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pdf.fontFamily')}</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {PRESET_FONTS.map((font) => (
              <TouchableOpacity
                key={font.value}
                style={[styles.item, selectedFont === font.value && { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  onSelect(font.value);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemText, { fontFamily: font.value, color: colors.textPrimary }]} numberOfLines={1}>
                  {font.label}
                </Text>
                {selectedFont === font.value && (
                  <Text style={[styles.itemCheck, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button variant="secondary" onPress={onClose} style={styles.closeBtn}>
            {t('common.close')}
          </Button>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...ModalStyles.overlay },
  card: {
    ...ModalStyles.content,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  list: { maxHeight: 320, marginBottom: Spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
  },
  itemText: { ...Typography.body, flex: 1 },
  itemCheck: { ...Typography.bodyBold, marginLeft: Spacing.sm },
  closeBtn: {},
});
