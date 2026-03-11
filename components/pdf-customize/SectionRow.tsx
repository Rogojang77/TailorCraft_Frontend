/**
 * Single section card in the PDF sections list: reorder, toggle, label, remove, optional field/contract action.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react-native';
import type { TemplateSection } from '@/lib/services/pdfService';
import { CardStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface SectionRowProps {
  item: TemplateSection;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onRemove: () => void;
  onOpenFieldSelector?: () => void;
  onOpenContractEdit?: () => void;
  getSectionLabel: (type: TemplateSection['type']) => string;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function SectionRow({
  item,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onRemove,
  onOpenFieldSelector,
  onOpenContractEdit,
  getSectionLabel,
  colors,
  t,
}: SectionRowProps) {
  return (
    <View style={[styles.docSectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.docSectionRow}>
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={index === 0}
            style={styles.reorderBtn}
            accessibilityLabel={t('pdf.moveUp')}
          >
            <ChevronUp size={20} color={index === 0 ? colors.textTertiary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={index === totalCount - 1}
            style={styles.reorderBtn}
            accessibilityLabel={t('pdf.moveDown')}
          >
            <ChevronDown size={20} color={index === totalCount - 1 ? colors.textTertiary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.dragHandle}>
          <GripVertical size={20} color={colors.textTertiary} />
        </View>
        <Switch
          value={item.enabled}
          onValueChange={onToggleEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
        <Text style={[styles.docSectionTitle, { color: colors.textPrimary }, !item.enabled && { color: colors.textTertiary }]}>
          {getSectionLabel(item.type)}
        </Text>
        <TouchableOpacity
          style={styles.removeSectionBtn}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={t('pdf.removeSection')}
        >
          <Trash2 size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>
      {(item.type === 'fields' && onOpenFieldSelector) || (item.type === 'contract' && onOpenContractEdit) ? (
        <TouchableOpacity
          style={styles.docSectionAction}
          onPress={() => (item.type === 'fields' ? onOpenFieldSelector?.() : onOpenContractEdit?.())}
          activeOpacity={0.7}
        >
          <Text style={[styles.docSectionActionText, { color: colors.primary }]}>
            {item.type === 'fields' ? t('pdf.fieldSelector') : t('pdf.sectionContractText')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  docSectionCard: {
    ...CardStyles.card,
    marginBottom: Spacing.sm,
  },
  docSectionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reorderButtons: { flexDirection: 'column', alignItems: 'center', marginRight: Spacing.xs },
  reorderBtn: { padding: 2 },
  dragHandle: { padding: Spacing.xs, marginRight: Spacing.xs },
  docSectionTitle: { ...Typography.bodySemiBold, fontSize: 14, flex: 1 },
  removeSectionBtn: { padding: Spacing.xs },
  docSectionAction: { marginTop: Spacing.sm, paddingVertical: Spacing.xs },
  docSectionActionText: { ...Typography.caption, fontWeight: '600' },
});
