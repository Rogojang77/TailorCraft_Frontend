/**
 * Modal to add a section type to the PDF template.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DOC_SECTION_TYPES } from '@/lib/pdfCustomizeConstants';
import type { TemplateSection } from '@/lib/services/pdfService';
import { ModalStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface AddSectionModalProps {
  visible: boolean;
  onAddSection: (type: TemplateSection['type']) => void;
  onClose: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function AddSectionModal({
  visible,
  onAddSection,
  onClose,
  colors,
  t,
}: AddSectionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.overlayModal }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.content, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pdf.addSection')}</Text>
          {DOC_SECTION_TYPES.map(({ type, labelKey }) => (
            <TouchableOpacity
              key={type}
              style={[styles.option, { borderBottomColor: colors.borderLight }]}
              onPress={() => onAddSection(type)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>{t(labelKey)}</Text>
            </TouchableOpacity>
          ))}
          <Button variant="secondary" fullWidth onPress={onClose}>
            {t('common.cancel')}
          </Button>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...ModalStyles.overlay },
  content: { ...ModalStyles.content, maxHeight: '80%' },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  option: { paddingVertical: Spacing.md, borderBottomWidth: 1 },
  optionText: { ...Typography.body },
});
