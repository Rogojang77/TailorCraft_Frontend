import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Save, X } from 'lucide-react-native';
import { KeyboardAwareScrollViewWithAccessory } from '@/components/KeyboardAwareScrollViewWithAccessory';
import { MeasurementForm } from '@/components/MeasurementForm';
import { CatalogSelectionsForm } from '@/components/CatalogSelectionsForm';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { InlineSpinner } from '@/components/InlineSpinner';
import { KeyboardAccessoryHostForModal } from '@/contexts/KeyboardAccessoryContext';
import { storageToMeasurementValue } from '@/lib/measurement';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import type { EditItemModalState } from '@/types/orderDetails';
import type { GarmentTypeRecord } from '@/types/templates';
import type { MeasurementDefinition } from '@/constants/garments';
import type { GarmentCatalogCategoryWithItems, GarmentCatalogItem } from '@/types/catalog';
import type { MeasurementValue } from '@/types/measurement';

export interface OrderEditItemModalProps {
  visible: boolean;
  editItemModal: EditItemModalState;
  editMeasurements: Record<string, Record<string, string>>;
  editDefinitionsByGarment: Record<string, MeasurementDefinition[]>;
  editDefinitionErrors: Record<string, boolean>;
  editDefinitionsLoading: boolean;
  editCatalogSelections: Record<string, Record<string, string | string[]>>;
  editCategoriesByGarment: Record<string, GarmentCatalogCategoryWithItems[]>;
  editItemsByCategoryByGarment: Record<string, Record<string, GarmentCatalogItem[]>>;
  editCatalogLoading: Record<string, boolean>;
  saveLoading: boolean;
  garmentTypes: GarmentTypeRecord[];
  onClose: () => void;
  onSave: () => void | Promise<void>;
  updateEditMeasurementValue: (garmentId: string, key: string, value: MeasurementValue) => void;
  handleEditCatalogSelectionChange: (garmentId: string, categoryCode: string, itemId: string | null) => void;
  getGarmentDisplayName: (garment: GarmentTypeRecord, fallback: string) => string;
  garmentUnavailableLabel: string;
}

export function OrderEditItemModal({
  visible,
  editItemModal,
  editMeasurements,
  editDefinitionsByGarment,
  editDefinitionErrors,
  editDefinitionsLoading,
  editCatalogSelections,
  editCategoriesByGarment,
  editItemsByCategoryByGarment,
  editCatalogLoading,
  saveLoading,
  garmentTypes,
  onClose,
  onSave,
  updateEditMeasurementValue,
  handleEditCatalogSelectionChange,
  getGarmentDisplayName,
  garmentUnavailableLabel,
}: OrderEditItemModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  if (!editItemModal) return null;

  const modalTitle =
    editItemModal.type === 'measurement'
      ? (() => {
          const defs = editDefinitionsByGarment[editItemModal.garmentId] ?? [];
          const def = defs.find((d) => d.key === editItemModal.measurementKey);
          const label = def?.label ?? editItemModal.measurementKey;
          const garment = garmentTypes.find((g) => g.id === editItemModal.garmentId);
          const garmentName = garment ? getGarmentDisplayName(garment, garmentUnavailableLabel) : garmentUnavailableLabel;
          return `${garmentName}: ${label}`;
        })()
      : (() => {
          const garment = garmentTypes.find((g) => g.id === editItemModal.garmentId);
          const garmentName = garment ? getGarmentDisplayName(garment, garmentUnavailableLabel) : garmentUnavailableLabel;
          const categoryLabel = t(`catalog.categories.${editItemModal.categoryCode}`, { defaultValue: editItemModal.categoryCode });
          return `${garmentName}: ${categoryLabel}`;
        })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.editModalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.editModalOverlay, { backgroundColor: colors.overlayModal }]} />
        </TouchableWithoutFeedback>
        <View style={styles.editModalCentered} pointerEvents="box-none">
          <View style={[styles.editModalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {modalTitle}
              </Text>
              <TouchableOpacity style={styles.editModalCloseBtn} onPress={onClose} disabled={saveLoading} activeOpacity={0.7}>
                <X size={22} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollViewWithAccessory
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {editItemModal.type === 'measurement' && (
                <>
                  {editDefinitionsLoading ? (
                    <View style={styles.editModalLoadingDefs}>
                      <InlineSpinner size="small" />
                      <Text style={[styles.editModalLoadingDefsText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
                    </View>
                  ) : (() => {
                    const defs = editDefinitionsByGarment[editItemModal.garmentId] ?? [];
                    const singleDef = defs.find((d) => d.key === editItemModal.measurementKey);
                    const existing = editMeasurements[editItemModal.garmentId] ?? {};
                    const formValues: Record<string, MeasurementValue> = {};
                    if (singleDef && singleDef.inputType !== 'calculated') {
                      formValues[singleDef.key] = storageToMeasurementValue(existing[singleDef.key], singleDef.inputType);
                    }
                    const defsForForm = singleDef ? [singleDef] : [];
                    return editDefinitionErrors[editItemModal.garmentId] ? (
                      <ErrorText style={styles.editModalDefsError}>{t('orderDetails.definitionsLoadError')}</ErrorText>
                    ) : singleDef ? (
                      <MeasurementForm
                        definitions={defsForForm}
                        values={formValues}
                        onChange={(key, value) => updateEditMeasurementValue(editItemModal.garmentId, key, value)}
                        twoColumns={false}
                        compact
                      />
                    ) : (
                      <Text style={[styles.editModalNoDefsHint, { color: colors.textTertiary }]}>{t('orderDetails.measurementsSection')} —</Text>
                    );
                  })()}
                </>
              )}

              {editItemModal.type === 'catalog' && (
                <>
                  {editCatalogLoading[editItemModal.garmentId] ? (
                    <View style={styles.editModalLoadingDefs}>
                      <InlineSpinner size="small" />
                      <Text style={[styles.editModalLoadingDefsText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
                    </View>
                  ) : (() => {
                    const categories = editCategoriesByGarment[editItemModal.garmentId] ?? [];
                    const singleCategory = categories.find((c) => c.code === editItemModal.categoryCode);
                    const itemsByCategory = editItemsByCategoryByGarment[editItemModal.garmentId] ?? {};
                    const selections = editCatalogSelections[editItemModal.garmentId] ?? {};
                    if (!singleCategory) return null;
                    const categoriesWithItems = [
                      {
                        ...singleCategory,
                        garmentTypeId: editItemModal.garmentId,
                        items: itemsByCategory[singleCategory.code] ?? [],
                      },
                    ];
                    return (
                      <CatalogSelectionsForm
                        categories={categoriesWithItems}
                        selections={selections}
                        onSelectionChange={(categoryCode, itemId) =>
                          handleEditCatalogSelectionChange(editItemModal.garmentId, categoryCode, itemId)
                        }
                      />
                    );
                  })()}
                </>
              )}
            </KeyboardAwareScrollViewWithAccessory>
            <View style={[styles.editModalActions, { borderTopColor: colors.border }]}>
              <Button variant="secondary" onPress={onClose} disabled={saveLoading} style={styles.editModalCancelBtn}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={onSave}
                disabled={saveLoading}
                loading={saveLoading}
                leftIcon={saveLoading ? undefined : <Save size={18} color={colors.textInverse} strokeWidth={2.5} />}
                style={styles.editModalSaveBtn}
              >
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
        {editItemModal.type === 'measurement' && <KeyboardAccessoryHostForModal />}
      </View>
    </Modal>
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
    maxWidth: 400,
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
  editModalScroll: {
    maxHeight: 500,
    paddingHorizontal: Spacing.lg,
  },
  editModalLoadingDefs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  editModalLoadingDefsText: {
    ...Typography.small,
  },
  editModalDefsError: {
    marginTop: Spacing.sm,
  },
  editModalNoDefsHint: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  editModalCancelBtn: {
    flex: 1,
  },
  editModalSaveBtn: {
    flex: 1,
  },
});
