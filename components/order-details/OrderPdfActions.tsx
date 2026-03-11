import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, ScrollView, Dimensions } from 'react-native';
import { Share, X } from 'lucide-react-native';
import { AppFloatingFooter } from '@/components/AppFloatingFooter';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import type { PdfDocumentTemplateRecord } from '@/lib/services/pdfService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDIT_MODAL_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export interface OrderPdfActionsProps {
  onExportPDF: () => void | Promise<void>;
  onSharePDF: () => void | Promise<void>;
  isExporting: boolean;
  downloadModeModalVisible: boolean;
  setDownloadModeModalVisible: (v: boolean) => void;
  pdfDownloadMode: 'classic' | 'custom';
  setPdfDownloadMode: (v: 'classic' | 'custom') => void;
  pdfDocumentTemplates: PdfDocumentTemplateRecord[];
  selectedPdfTemplateId: string | null;
  setSelectedPdfTemplateId: (v: string | null) => void;
  onDownload: (mode: 'classic' | 'custom') => void | Promise<void>;
  onSaveToFolder: (mode: 'classic' | 'custom') => void | Promise<void>;
  t: (key: string) => string;
  isAndroid?: boolean;
}

export function OrderPdfActions({
  onExportPDF,
  onSharePDF,
  isExporting,
  downloadModeModalVisible,
  setDownloadModeModalVisible,
  pdfDownloadMode,
  setPdfDownloadMode,
  pdfDocumentTemplates,
  selectedPdfTemplateId,
  setSelectedPdfTemplateId,
  onDownload,
  onSaveToFolder,
  t,
  isAndroid = false,
}: OrderPdfActionsProps) {
  const { colors } = useTheme();

  return (
    <>
      <AppFloatingFooter
        primaryLabel={isExporting ? t('orderDetails.generatingPdf') : t('orderDetails.downloadPdf')}
        onPrimaryPress={onExportPDF}
        primaryDisabled={isExporting}
        primaryLoading={isExporting}
        secondaryLabel={t('orderDetails.share')}
        onSecondaryPress={onSharePDF}
        secondaryDisabled={isExporting}
        secondaryIcon={<Share size={20} color={colors.textSecondary} strokeWidth={2.5} />}
        secondaryBordered
      />

      <Modal
        visible={downloadModeModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDownloadModeModalVisible(false)}
      >
        <View style={styles.editModalRoot}>
          <TouchableWithoutFeedback onPress={() => setDownloadModeModalVisible(false)}>
            <View style={[styles.editModalOverlay, { backgroundColor: colors.overlayModal }]} />
          </TouchableWithoutFeedback>
          <View style={styles.editModalCentered} pointerEvents="box-none">
            <View style={[styles.editModalCard, { maxWidth: EDIT_MODAL_MAX_WIDTH, backgroundColor: colors.surface }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>{t('orderDetails.downloadAs')}</Text>
                <TouchableOpacity
                  style={styles.editModalCloseBtn}
                  onPress={() => setDownloadModeModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <X size={22} color={colors.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={[styles.downloadModeOption, pdfDownloadMode === 'custom' && { backgroundColor: colors.primary + '14' }]}
                  onPress={() => setPdfDownloadMode('custom')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: colors.border }, pdfDownloadMode === 'custom' && { borderColor: colors.primary }]}>
                    {pdfDownloadMode === 'custom' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.downloadModeLabel, { color: colors.textPrimary }]}>{t('orderDetails.downloadCustomTemplate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.downloadModeOption, pdfDownloadMode === 'classic' && { backgroundColor: colors.primary + '14' }]}
                  onPress={() => setPdfDownloadMode('classic')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: colors.border }, pdfDownloadMode === 'classic' && { borderColor: colors.primary }]}>
                    {pdfDownloadMode === 'classic' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.downloadModeLabel, { color: colors.textPrimary }]}>{t('orderDetails.downloadClassicTemplate')}</Text>
                </TouchableOpacity>
                {pdfDownloadMode === 'custom' && pdfDocumentTemplates.length > 0 && (
                  <>
                    <Text style={[styles.downloadModeLabel, styles.templateListLabel, { color: colors.textSecondary }]}>{t('pdf.chooseTemplate')}</Text>
                    <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                      {pdfDocumentTemplates.map((tmpl) => (
                        <TouchableOpacity
                          key={tmpl.id}
                          style={[styles.downloadModeOption, selectedPdfTemplateId === tmpl.id && { backgroundColor: colors.primary + '14' }]}
                          onPress={() => setSelectedPdfTemplateId(tmpl.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.radioOuter, { borderColor: colors.border }, selectedPdfTemplateId === tmpl.id && { borderColor: colors.primary }]}>
                            {selectedPdfTemplateId === tmpl.id && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                          </View>
                          <Text style={[styles.downloadModeLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                            {tmpl.name}
                            {tmpl.isDefault ? ` (${t('pdf.defaultTemplate')})` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  onPress={async () => {
                    setDownloadModeModalVisible(false);
                    await onDownload(pdfDownloadMode);
                  }}
                  style={styles.downloadButton}
                >
                  {t('orderDetails.downloadPdf')}
                </Button>
                {isAndroid && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onPress={async () => {
                      setDownloadModeModalVisible(false);
                      await onSaveToFolder(pdfDownloadMode);
                    }}
                    disabled={isExporting}
                    style={styles.saveToFolderButton}
                  >
                    {t('orderDetails.saveToFolder')}
                  </Button>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  editModalRoot: {
    flex: 1,
  },
  editModalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  editModalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  editModalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: BorderRadius.lg,
    ...Shadows.xl,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  editModalTitle: {
    ...Typography.h3,
    flex: 0,
    maxWidth: '80%',
  },
  editModalCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  downloadModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  downloadModeLabel: {
    ...Typography.body,
  },
  templateListLabel: {
    marginTop: 12,
    marginBottom: 6,
  },
  templateList: {
    maxHeight: 160,
  },
  downloadButton: {
    marginTop: 16,
  },
  saveToFolderButton: {
    marginTop: 10,
  },
});
