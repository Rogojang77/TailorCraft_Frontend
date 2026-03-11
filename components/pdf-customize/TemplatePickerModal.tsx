/**
 * Modal to choose a document template or create new.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { PdfDocumentTemplateRecord } from '@/lib/services/pdfService';
import { ModalStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface TemplatePickerModalProps {
  visible: boolean;
  templates: PdfDocumentTemplateRecord[];
  onSelect: (id: string | null) => void;
  onClose: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function TemplatePickerModal({
  visible,
  templates,
  onSelect,
  onClose,
  colors,
  t,
}: TemplatePickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.overlayModal }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.content, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pdf.chooseTemplate')}</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {templates.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.option, { borderBottomColor: colors.borderLight }]}
                onPress={() => onSelect(doc.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>{doc.name}</Text>
                {doc.isDefault && (
                  <Text style={[Typography.caption, { color: colors.primary }]}> ({t('pdf.defaultTemplate')})</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.option, { borderBottomColor: colors.borderLight }]}
              onPress={() => onSelect(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, { color: colors.primary }]}>+ {t('pdf.newTemplate')}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  list: { maxHeight: 280, marginBottom: Spacing.md },
  option: { paddingVertical: Spacing.md, borderBottomWidth: 1 },
  optionText: { ...Typography.body },
});
