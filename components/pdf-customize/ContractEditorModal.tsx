/**
 * Modal to edit contract section content with variable chips.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Button } from '@/components/ui/Button';
import { ModalStyles, BorderRadius, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface ContractEditorModalProps {
  visible: boolean;
  content: string;
  variableKeys: string[];
  onChangeContent: (text: string) => void;
  onInsertVariable: (key: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function ContractEditorModal({
  visible,
  content,
  variableKeys,
  onChangeContent,
  onInsertVariable,
  onClose,
  colors,
  t,
}: ContractEditorModalProps) {
  const variableRegex = /\{\{[^}]+\}\}/g;
  const parts = content ? content.split(variableRegex) : [];
  const matches = content ? content.match(variableRegex) ?? [] : [];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior="padding" style={[styles.overlay, { backgroundColor: colors.overlayModal }]}>
        <View style={[styles.content, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pdf.sectionContractText')}</Text>
          <Text style={[styles.variableHint, { color: colors.textSecondary }]}>{t('pdf.availableVariables')}</Text>
          <View style={styles.variableChips}>
            {variableKeys.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={() => onInsertVariable(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: colors.primaryDark }]}>{'{{' + key + '}}'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            multiline
            placeholder={t('pdf.contractPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={onChangeContent}
          />
          {content.length > 0 && (
            <View style={[styles.preview, { backgroundColor: colors.borderLight }]}>
              <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>{t('pdf.previewLabel')}</Text>
              <Text style={[styles.previewText, { color: colors.textSecondary }]}>
                {parts.map((p, i) => (
                  <Text key={i}>
                    {p}
                    {matches[i] ? (
                      <Text style={[styles.previewVar, { color: colors.primary }]}>{matches[i]}</Text>
                    ) : null}
                  </Text>
                ))}
              </Text>
            </View>
          )}
          <Button fullWidth onPress={onClose} style={styles.closeBtn}>
            {t('common.close')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...ModalStyles.overlay },
  content: { ...ModalStyles.content, maxHeight: '80%' },
  title: { ...Typography.h3, marginBottom: Spacing.md },
  variableHint: { ...Typography.small, marginBottom: Spacing.sm },
  variableChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: { ...Typography.small, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    ...Typography.body,
    marginBottom: Spacing.sm,
  },
  preview: { borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  previewLabel: { ...Typography.small, marginBottom: 4 },
  previewText: { ...Typography.small },
  previewVar: { fontWeight: '700' },
  closeBtn: { marginTop: Spacing.sm },
});
