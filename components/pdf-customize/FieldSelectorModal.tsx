/**
 * Modal to select which fields appear in a PDF 'fields' section.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Switch } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { TemplateSectionFields } from '@/lib/services/pdfService';
import type { TemplateFieldItem } from '@/lib/services/pdfService';
import { ModalStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface FieldSelectorModalProps {
  visible: boolean;
  sectionIndex: number | null;
  currentFields: TemplateFieldItem[];
  allFieldsOrdered: TemplateFieldItem[];
  onUpdateFields: (fields: TemplateFieldItem[]) => void;
  onClose: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function FieldSelectorModal({
  visible,
  currentFields,
  allFieldsOrdered,
  onUpdateFields,
  onClose,
  colors,
  t,
}: FieldSelectorModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: colors.overlayModal }]}>
        <View style={[styles.content, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pdf.fieldSelector')}</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {allFieldsOrdered.map((f) => (
              <View key={f.key} style={styles.fieldRow}>
                <Switch
                  value={currentFields.find((x) => x.key === f.key)?.enabled ?? f.enabled}
                  onValueChange={(v) => {
                    const next = currentFields.some((x) => x.key === f.key)
                      ? currentFields.map((x) => (x.key === f.key ? { ...x, enabled: v } : x))
                      : [...currentFields, { ...f, enabled: v }];
                    onUpdateFields(next);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{f.label}</Text>
              </View>
            ))}
          </ScrollView>
          <Button fullWidth onPress={onClose}>
            {t('common.close')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...ModalStyles.overlay },
  content: { ...ModalStyles.content, maxHeight: '80%' },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  list: { maxHeight: 280, marginBottom: Spacing.md },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  fieldLabel: { ...Typography.body },
});
