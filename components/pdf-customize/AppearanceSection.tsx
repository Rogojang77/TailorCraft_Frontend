/**
 * Collapsible appearance section: logo, colors, font, header/footer, layout.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import {
  LAYOUT_OPTIONS,
  LOGO_POSITION_OPTIONS,
  PRESET_FONTS,
  type AppearanceDraft,
} from '@/lib/pdfCustomizeConstants';
import { BorderRadius, LayoutStyles, Spacing, Typography } from '@/constants/design';
import type { ThemeColors } from '@/contexts/ThemeContext';

export interface AppearanceSectionProps {
  draft: AppearanceDraft;
  onDraftChange: React.Dispatch<React.SetStateAction<AppearanceDraft>>;
  onPickLogo: () => void;
  onReset: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onColorPickerOpen: (which: 'primary' | 'secondary') => void;
  onFontPickerOpen: () => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export function AppearanceSection({
  draft,
  onDraftChange,
  onPickLogo,
  onReset,
  expanded,
  onToggleExpand,
  onColorPickerOpen,
  onFontPickerOpen,
  colors,
  t,
}: AppearanceSectionProps) {
  return (
    <>
      <TouchableOpacity style={styles.collapseHeader} onPress={onToggleExpand} activeOpacity={0.8}>
        <Text style={[styles.collapseTitle, { color: colors.textPrimary }]}>{t('pdf.appearanceTitle')}</Text>
        {expanded ? (
          <ChevronUp size={22} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={22} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
      {expanded && (
        <>
          <Text style={[styles.blockHint, { color: colors.textSecondary }]}>{t('pdf.appearanceHint')}</Text>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.logo')}</Text>
            <TouchableOpacity style={[styles.logoBox, { backgroundColor: colors.surface }]} onPress={onPickLogo} activeOpacity={0.8}>
              {draft.logoUrl ? (
                <Image source={{ uri: draft.logoUrl }} style={styles.logoImage} resizeMode="contain" />
              ) : (
                <Text style={[styles.logoPlaceholder, { color: colors.textSecondary }]}>{t('pdf.uploadLogo')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.logoPosition')}</Text>
            <View style={styles.layoutOptions}>
              {LOGO_POSITION_OPTIONS.map((opt) => {
                const selected = draft.logoPosition === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.layoutCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight + '20' },
                    ]}
                    onPress={() => onDraftChange((p) => ({ ...p, logoPosition: opt.value }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.layoutCardText,
                        { color: colors.textPrimary },
                        selected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.primaryColor')}</Text>
            <TouchableOpacity
              style={[styles.colorRow, { backgroundColor: colors.surface }]}
              onPress={() => onColorPickerOpen('primary')}
              activeOpacity={0.8}
            >
              <View style={[styles.colorSwatch, { backgroundColor: draft.primaryColor, borderColor: colors.border }]} />
              <Text style={[styles.colorHex, { color: colors.textPrimary }]}>{draft.primaryColor}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.secondaryColor')}</Text>
            <TouchableOpacity
              style={[styles.colorRow, { backgroundColor: colors.surface }]}
              onPress={() => onColorPickerOpen('secondary')}
              activeOpacity={0.8}
            >
              <View style={[styles.colorSwatch, { backgroundColor: draft.secondaryColor, borderColor: colors.border }]} />
              <Text style={[styles.colorHex, { color: colors.textPrimary }]}>{draft.secondaryColor}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.fontFamily')}</Text>
            <TouchableOpacity
              style={[styles.fontRow, { backgroundColor: colors.surface }]}
              onPress={onFontPickerOpen}
              activeOpacity={0.8}
            >
              <Text style={[styles.fontRowLabel, { fontFamily: draft.fontFamily, color: colors.textPrimary }]} numberOfLines={1}>
                {PRESET_FONTS.find((f) => f.value === draft.fontFamily)?.label ?? draft.fontFamily}
              </Text>
              <Text style={[styles.fontRowChevron, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.showHeader')}</Text>
              <Switch value={draft.showHeader} onValueChange={(v) => onDraftChange((p) => ({ ...p, showHeader: v }))} />
            </View>
          </View>
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.showFooter')}</Text>
              <Switch value={draft.showFooter} onValueChange={(v) => onDraftChange((p) => ({ ...p, showFooter: v }))} />
            </View>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.customFooterText')}</Text>
            <Input
              value={draft.customFooterText}
              onChangeText={(v) => onDraftChange((p) => ({ ...p, customFooterText: v }))}
              placeholder={t('pdf.customFooterPlaceholder')}
              multiline
              containerStyle={styles.input}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('pdf.layoutType')}</Text>
            <View style={styles.layoutOptions}>
              {LAYOUT_OPTIONS.map((opt) => {
                const selected = draft.layoutType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.layoutCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight + '20' },
                    ]}
                    onPress={() => onDraftChange((p) => ({ ...p, layoutType: opt.value }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.layoutCardText,
                        { color: colors.textPrimary },
                        selected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.7}>
            <RotateCcw size={18} color={colors.textSecondary} />
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>{t('pdf.resetToDefault')}</Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  collapseTitle: { ...Typography.h3 },
  blockHint: { ...Typography.caption, marginBottom: Spacing.md },
  section: { ...LayoutStyles.section },
  sectionTitle: { ...Typography.h3, fontSize: 16, marginBottom: Spacing.sm },
  input: { marginTop: 0 },
  logoBox: {
    height: 100,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: { width: '100%', height: '100%', borderRadius: BorderRadius.md },
  logoPlaceholder: { ...Typography.small },
  layoutOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  layoutCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    borderWidth: 1,
  },
  layoutCardText: { ...Typography.caption, fontWeight: '600' },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  colorHex: { ...Typography.body, fontWeight: '500' },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fontRowLabel: { ...Typography.body, flex: 1 },
  fontRowChevron: { fontSize: 20, fontWeight: '300' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  resetBtnText: { ...Typography.caption },
});
