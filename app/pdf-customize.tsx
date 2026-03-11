/**
 * PDF Customization (Pro only). One screen: appearance (logo, colors, font, layout)
 * and PDF content (which sections appear and in what order). Replaces separate pdf-build.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSubscription, usePremium } from '@/contexts/SubscriptionContext';
import { useI18n } from '@/lib/i18n';
import type { TemplateSection, TemplateSectionFields, TemplateSectionContract } from '@/lib/services/pdfService';
import { Spacing, Typography } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { ColorPickerModal } from '@/components/ColorPickerModal';
import { Check } from 'lucide-react-native';
import { usePdfTemplate, usePdfSections } from '@/hooks';
import { getSectionLabel } from '@/lib/pdfCustomizeConstants';
import { LivePreview } from '@/components/pdf-customize/LivePreview';
import { AppearanceSection } from '@/components/pdf-customize/AppearanceSection';
import { SectionsEditor } from '@/components/pdf-customize/SectionsEditor';
import { FontPickerModal } from '@/components/pdf-customize/FontPickerModal';
import { TemplatePickerModal } from '@/components/pdf-customize/TemplatePickerModal';
import { AddSectionModal } from '@/components/pdf-customize/AddSectionModal';
import { FieldSelectorModal } from '@/components/pdf-customize/FieldSelectorModal';
import { ContractEditorModal } from '@/components/pdf-customize/ContractEditorModal';

export default function PdfCustomizeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { colors } = useTheme();
  const { refreshSubscription } = useSubscription();
  const { isPremium: isPro } = usePremium();

  const [appearanceExpanded, setAppearanceExpanded] = useState(true);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const templateApi = usePdfTemplate({
    isPro,
    t,
    router: { push: (href: string) => router.push(href as Parameters<typeof router.push>[0]) },
  });
  const sectionsApi = usePdfSections({
    isPro,
    t,
    onSaveSuccess: () => setShowSaveToast(true),
  });

  useFocusEffect(
    useCallback(() => {
      refreshSubscription();
    }, [refreshSubscription])
  );

  const handleSaveAll = async () => {
    const ok1 = await templateApi.handleSave();
    const ok2 = await sectionsApi.handleSaveDocument();
    if (ok1 && ok2) setShowSaveToast(true);
  };

  useEffect(() => {
    if (!showSaveToast) return;
    const id = setTimeout(() => setShowSaveToast(false), 2500);
    return () => clearTimeout(id);
  }, [showSaveToast]);

  if (!isPro && !templateApi.loading) {
    return (
      <ScreenContainer>
        <View style={styles.upgradeBlock}>
          <Text style={[styles.upgradeTitle, { color: colors.textPrimary }]}>{t('pdf.customPdfProTitle')}</Text>
          <Text style={[styles.upgradeMessage, { color: colors.textSecondary }]}>{t('pdf.customPdfProMessage')}</Text>
          <Button variant="primary" fullWidth onPress={() => router.push('/subscription')} style={styles.upgradeButton}>
            <Text style={[styles.upgradeButtonText, { color: colors.textInverse }]}>{t('pdf.upgradeToPro')}</Text>
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  if (templateApi.loading && !templateApi.template) {
    return (
      <ScreenContainer>
        <ListSkeletonLoader variant="card" count={4} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      {showSaveToast && (
        <View style={[styles.toast, { backgroundColor: colors.success }]} pointerEvents="none">
          <Check size={20} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={[styles.toastText, { color: colors.textInverse }]}>{t('pdf.templateSaved')}</Text>
        </View>
      )}
      <GestureHandlerRootView style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Live preview */}
          <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>{t('pdf.previewLabel')}</Text>
          <LivePreview
            draft={templateApi.draft}
            sections={sectionsApi.sections}
            company={templateApi.companyData}
            getSectionLabel={(type) => getSectionLabel(type, t)}
            colors={colors}
          />

          {/* Appearance – collapsible */}
          <AppearanceSection
            draft={templateApi.draft}
            onDraftChange={templateApi.setDraft}
            onPickLogo={templateApi.handlePickLogo}
            onReset={templateApi.handleResetAppearance}
            expanded={appearanceExpanded}
            onToggleExpand={() => setAppearanceExpanded((e) => !e)}
            onColorPickerOpen={templateApi.setColorPickerFor}
            onFontPickerOpen={() => templateApi.setFontPickerVisible(true)}
            colors={colors}
            t={t}
          />

          {/* PDF content */}
          <SectionsEditor
            contentTitle={t('pdf.contentTitle')}
            contentHint={t('pdf.contentHint')}
            onQuickTemplate={sectionsApi.handleQuickTemplate}
            docTemplates={sectionsApi.docTemplates}
            currentDoc={sectionsApi.currentDoc}
            onOpenTemplatePicker={() => sectionsApi.setTemplatePickerVisible(true)}
            onSetAsDefault={sectionsApi.handleSetAsDefault}
            onDeleteTemplate={sectionsApi.handleDeleteTemplate}
            docName={sectionsApi.docName}
            onDocNameChange={sectionsApi.setDocName}
            sections={sectionsApi.sections}
            onAddSection={() => sectionsApi.setAddSectionModalVisible(true)}
            onRemoveSection={sectionsApi.handleRemoveSection}
            onMoveUp={sectionsApi.moveSectionUp}
            onMoveDown={sectionsApi.moveSectionDown}
            onToggleEnabled={sectionsApi.setSectionEnabled}
            onOpenFieldSelector={sectionsApi.openFieldSelector}
            onOpenContractEdit={sectionsApi.setContractEditIndex}
            getSectionLabel={(type) => getSectionLabel(type, t)}
            colors={colors}
            t={t}
          />

        <Button
          variant="primary"
          fullWidth
          onPress={handleSaveAll}
          loading={templateApi.saving || sectionsApi.docSaving}
          disabled={templateApi.saving || sectionsApi.docSaving}
          style={styles.saveButton}
        >
          {t('common.save')}
        </Button>
        {sectionsApi.currentDoc && (
          <Button
            variant="secondary"
            fullWidth
            onPress={sectionsApi.handleSaveAsNew}
            loading={sectionsApi.docSaving}
            disabled={templateApi.saving || sectionsApi.docSaving}
            style={styles.saveAsNewButton}
          >
            {t('pdf.saveAsNew')}
          </Button>
        )}
        </ScrollView>
      </GestureHandlerRootView>

      <ColorPickerModal
        visible={templateApi.colorPickerFor !== null}
        initialColor={templateApi.colorPickerFor === 'primary' ? templateApi.draft.primaryColor : templateApi.colorPickerFor === 'secondary' ? templateApi.draft.secondaryColor : '#000000'}
        title={templateApi.colorPickerFor === 'primary' ? t('pdf.primaryColor') : t('pdf.secondaryColor')}
        onClose={() => templateApi.setColorPickerFor(null)}
        onSelect={(hex) => {
          if (templateApi.colorPickerFor === 'primary') {
            templateApi.setDraft((p) => ({ ...p, primaryColor: hex }));
          } else if (templateApi.colorPickerFor === 'secondary') {
            templateApi.setDraft((p) => ({ ...p, secondaryColor: hex }));
          }
          templateApi.setColorPickerFor(null);
        }}
      />

      <FontPickerModal
        visible={templateApi.fontPickerVisible}
        selectedFont={templateApi.draft.fontFamily}
        onSelect={(fontValue) => templateApi.setDraft((p) => ({ ...p, fontFamily: fontValue }))}
        onClose={() => templateApi.setFontPickerVisible(false)}
        colors={colors}
        t={t}
      />

      <TemplatePickerModal
        visible={sectionsApi.templatePickerVisible}
        templates={sectionsApi.docTemplates}
        onSelect={(id) => sectionsApi.selectDocumentTemplate(id)}
        onClose={() => sectionsApi.setTemplatePickerVisible(false)}
        colors={colors}
        t={t}
      />

      <AddSectionModal
        visible={sectionsApi.addSectionModalVisible}
        onAddSection={sectionsApi.handleAddSection}
        onClose={() => sectionsApi.setAddSectionModalVisible(false)}
        colors={colors}
        t={t}
      />

      <FieldSelectorModal
        visible={sectionsApi.fieldSelectorSectionIndex !== null}
        sectionIndex={sectionsApi.fieldSelectorSectionIndex}
        currentFields={
          sectionsApi.fieldSelectorSectionIndex !== null
            ? ((sectionsApi.sections[sectionsApi.fieldSelectorSectionIndex] as TemplateSectionFields)?.fields ?? [])
            : []
        }
        allFieldsOrdered={
          sectionsApi.fieldSelectorSectionIndex !== null
            ? (() => {
                const sec = sectionsApi.sections[sectionsApi.fieldSelectorSectionIndex!] as TemplateSectionFields | undefined;
                const currentFields = sec?.fields ?? [];
                const currentKeys = new Set(currentFields.map((f) => f.key));
                return [
                  ...currentFields,
                  ...sectionsApi.fields
                    .filter((f) => !currentKeys.has(f.key))
                    .map((f) => ({ key: f.key, label: f.label, enabled: false })),
                ];
              })()
            : []
        }
        onUpdateFields={(fields) =>
          sectionsApi.fieldSelectorSectionIndex !== null &&
          sectionsApi.updateFieldsInSection(sectionsApi.fieldSelectorSectionIndex, fields)
        }
        onClose={() => sectionsApi.setFieldSelectorSectionIndex(null)}
        colors={colors}
        t={t}
      />

      <ContractEditorModal
        visible={sectionsApi.contractEditIndex !== null}
        content={
          sectionsApi.contractEditIndex !== null
            ? ((sectionsApi.sections[sectionsApi.contractEditIndex] as TemplateSectionContract)?.content ?? '')
            : ''
        }
        variableKeys={sectionsApi.variableKeys}
        onChangeContent={(text) =>
          sectionsApi.contractEditIndex !== null && sectionsApi.setSectionContent(sectionsApi.contractEditIndex, text)
        }
        onInsertVariable={(key) =>
          sectionsApi.contractEditIndex !== null && sectionsApi.insertVariable(sectionsApi.contractEditIndex, key)
        }
        onClose={() => sectionsApi.setContractEditIndex(null)}
        colors={colors}
        t={t}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    zIndex: 1000,
  },
  toastText: { ...Typography.bodyBold, fontSize: 14 },
  previewLabel: { ...Typography.caption, marginBottom: Spacing.xs },
  saveButton: { marginTop: Spacing.lg },
  saveAsNewButton: { marginTop: Spacing.sm },
  upgradeBlock: { padding: Spacing.lg },
  upgradeTitle: { ...Typography.h3, marginBottom: Spacing.sm },
  upgradeMessage: { ...Typography.body, marginBottom: Spacing.lg },
  upgradeButton: {},
  upgradeButtonText: { fontWeight: '600' },
});
