/**
 * PDF content block: quick templates, template selector, section list, add section.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, Trash2 } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import type { TemplateSection } from '@/lib/services/pdfService';
import type { PdfDocumentTemplateRecord } from '@/lib/services/pdfService';
import { QUICK_TEMPLATES } from '@/lib/pdfCustomizeConstants';
import { BorderRadius, LayoutStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';
import { SectionRow } from './SectionRow';

export interface SectionsEditorProps {
  contentTitle: string;
  contentHint: string;
  onQuickTemplate: (id: 'invoice' | 'contract' | 'minimal') => void;
  docTemplates: PdfDocumentTemplateRecord[];
  currentDoc: PdfDocumentTemplateRecord | null;
  onOpenTemplatePicker: () => void;
  onSetAsDefault: () => void;
  onDeleteTemplate: () => void;
  docName: string;
  onDocNameChange: (value: string) => void;
  sections: TemplateSection[];
  onAddSection: () => void;
  onRemoveSection: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onToggleEnabled: (index: number, enabled: boolean) => void;
  onOpenFieldSelector: (index: number) => void;
  onOpenContractEdit: (index: number) => void;
  getSectionLabel: (type: TemplateSection['type']) => string;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function SectionsEditor({
  contentTitle,
  contentHint,
  onQuickTemplate,
  docTemplates,
  currentDoc,
  onOpenTemplatePicker,
  onSetAsDefault,
  onDeleteTemplate,
  docName,
  onDocNameChange,
  sections,
  onAddSection,
  onRemoveSection,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onOpenFieldSelector,
  onOpenContractEdit,
  getSectionLabel,
  colors,
  t,
}: SectionsEditorProps) {
  return (
    <>
      <Text style={[styles.blockTitle, styles.blockTitleSpaced, { color: colors.textPrimary }]}>{contentTitle}</Text>
      <Text style={[styles.blockHint, { color: colors.textSecondary }]}>{contentHint}</Text>
      <View style={styles.quickTemplatesRow}>
        {QUICK_TEMPLATES.map((q) => (
          <TouchableOpacity
            key={q.id}
            style={[styles.quickTemplateBtn, { borderColor: colors.border }]}
            onPress={() => onQuickTemplate(q.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.quickTemplateBtnText, { color: colors.textPrimary }]}>{t(`pdf.quickTemplate.${q.id}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {docTemplates.length >= 1 && (
        <View style={[styles.section, styles.templateSelectorRow]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.chooseTemplate')}</Text>
          <View style={styles.templateSelectorActions}>
            <TouchableOpacity
              style={[styles.templateSelectorBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={onOpenTemplatePicker}
              activeOpacity={0.7}
            >
              <Text style={[styles.templateSelectorBtnText, { color: colors.textPrimary }]} numberOfLines={1}>
                {currentDoc ? currentDoc.name : t('pdf.newTemplate')}
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {currentDoc && (
              <>
                {!currentDoc.isDefault && (
                  <TouchableOpacity
                    style={[styles.templateActionIcon, { backgroundColor: colors.surface }]}
                    onPress={onSetAsDefault}
                    accessibilityLabel={t('pdf.setAsDefault')}
                  >
                    <Text style={[Typography.caption, { color: colors.primary }]}>{t('pdf.setAsDefault')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.templateActionIcon, { backgroundColor: colors.surface }]}
                  onPress={onDeleteTemplate}
                  accessibilityLabel={t('pdf.deleteTemplate')}
                >
                  <Trash2 size={20} color={colors.error ?? colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.templateName')}</Text>
        <Input
          value={docName}
          onChangeText={onDocNameChange}
          placeholder={t('pdf.templateName')}
          containerStyle={styles.input}
        />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.reorderSections')}</Text>
      <Text style={[styles.dragHint, { color: colors.textSecondary }]}>{t('pdf.tapArrowsToReorder')}</Text>
      <View style={styles.draggableList}>
        {sections.map((item, index) => (
          <SectionRow
            key={index}
            item={item}
            index={index}
            totalCount={sections.length}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            onToggleEnabled={(enabled) => onToggleEnabled(index, enabled)}
            onRemove={() => onRemoveSection(index)}
            onOpenFieldSelector={item.type === 'fields' ? () => onOpenFieldSelector(index) : undefined}
            onOpenContractEdit={item.type === 'contract' ? () => onOpenContractEdit(index) : undefined}
            getSectionLabel={getSectionLabel}
            colors={colors}
            t={t}
          />
        ))}
      </View>
      <TouchableOpacity style={[styles.addSectionBtn, { borderColor: colors.border }]} onPress={onAddSection} activeOpacity={0.7}>
        <Text style={[styles.addSectionBtnText, { color: colors.textSecondary }]}>+ {t('pdf.addSection')}</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  blockTitle: { ...Typography.h3, marginBottom: Spacing.xs },
  blockTitleSpaced: { marginTop: Spacing.xl },
  blockHint: { ...Typography.caption, marginBottom: Spacing.md },
  quickTemplatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickTemplateBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  quickTemplateBtnText: { ...Typography.caption, fontWeight: '600' },
  section: { ...LayoutStyles.section },
  sectionTitle: { ...Typography.h3, fontSize: 16, marginBottom: Spacing.sm },
  input: { marginTop: 0 },
  templateSelectorRow: { marginBottom: Spacing.md },
  templateSelectorActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  templateSelectorBtn: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  templateSelectorBtnText: { ...Typography.body, flex: 1 },
  templateActionIcon: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dragHint: { ...Typography.caption, marginBottom: Spacing.sm },
  draggableList: { marginBottom: Spacing.md },
  addSectionBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addSectionBtnText: { ...Typography.body },
});
