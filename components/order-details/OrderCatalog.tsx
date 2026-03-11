import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { resolveUploadUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import type { OrderDetailsData } from '@/types/orderDetails';
import type { GarmentTypeRecord } from '@/types/templates';
import type { GarmentCatalogItem } from '@/types/catalog';

export interface OrderCatalogProps {
  orderData: OrderDetailsData;
  garmentTypes: GarmentTypeRecord[];
  orderGarmentIdsSorted: string[];
  enabledGarmentIdsForEdit: Set<string>;
  resolvedCatalogItems: Record<string, GarmentCatalogItem>;
  resolvedCatalogCategoryLabels: Record<string, string>;
  catalogSectionsExpanded: Record<string, boolean>;
  onToggleSection: (garmentId: string) => void;
  openEditCatalogItemModal: (garmentId: string, categoryCode: string) => void;
  getGarmentDisplayName: (garment: GarmentTypeRecord, fallback: string) => string;
  garmentUnavailableLabel: string;
}

export function OrderCatalog({
  orderData,
  garmentTypes,
  orderGarmentIdsSorted,
  enabledGarmentIdsForEdit,
  resolvedCatalogItems,
  resolvedCatalogCategoryLabels,
  catalogSectionsExpanded,
  onToggleSection,
  openEditCatalogItemModal,
  getGarmentDisplayName,
  garmentUnavailableLabel,
}: OrderCatalogProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const catalogSelections = orderData.catalogSelections;
  if (!catalogSelections || Object.keys(catalogSelections).length === 0) return null;

  const garmentNameById = new Map<string, string>();
  for (const g of garmentTypes) {
    garmentNameById.set(g.id, getGarmentDisplayName(g, garmentUnavailableLabel));
  }

  const garmentIdsWithCatalog = orderGarmentIdsSorted.filter((garmentId) => {
    const selections = catalogSelections[garmentId];
    return selections && Object.keys(selections).length > 0;
  });

  return (
    <>
      {garmentIdsWithCatalog.map((garmentId) => {
        const selections = catalogSelections[garmentId];
        if (!selections || Object.keys(selections).length === 0) return null;
        const displayName = garmentNameById.get(garmentId) ?? garmentUnavailableLabel;
        const title = t('orderDetails.stylesForGarment', { name: displayName });
        const isEditable = orderData.rawStatus !== 'COMPLETED' && enabledGarmentIdsForEdit.has(garmentId);
        const isExpanded = catalogSectionsExpanded[garmentId] !== false;

        return (
          <View key={`catalog-${garmentId}`} style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.sectionHeader, { justifyContent: 'space-between' }]}
              onPress={() => onToggleSection(garmentId)}
              activeOpacity={0.7}
              accessibilityLabel={isExpanded ? t('common.collapse') : t('common.expand')}
              accessibilityState={{ expanded: isExpanded }}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
              {isExpanded ? (
                <ChevronUp size={20} color={colors.textSecondary} style={styles.catalogSectionChevron} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} style={styles.catalogSectionChevron} />
              )}
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.catalogSelectionsGrid}>
                {Object.entries(selections).map(([categoryCode, itemIdOrIds]) => {
                  const itemId = Array.isArray(itemIdOrIds) ? itemIdOrIds[0] : itemIdOrIds;
                  if (!itemId) return null;
                  const item = resolvedCatalogItems[String(itemId)];
                  const categoryLabel =
                    resolvedCatalogCategoryLabels[categoryCode] ??
                    t(`catalog.categories.${categoryCode}`, { defaultValue: categoryCode });
                  const row = (
                    <View style={[styles.catalogSelectionItem, { backgroundColor: colors.borderLight }]}>
                      <Text style={[styles.catalogSelectionLabel, { color: colors.textSecondary }]}>{categoryLabel}</Text>
                      <View style={styles.catalogSelectionValueRow}>
                        {item?.imageUrl ? (
                          <Image source={{ uri: resolveUploadUrl(item.imageUrl) ?? '' }} style={styles.catalogSelectionThumb} />
                        ) : null}
                        {item?.color && (
                          <View style={[styles.catalogColorSwatch, { backgroundColor: item.color, borderColor: colors.border }]} />
                        )}
                        <Text style={[styles.catalogSelectionValue, { color: colors.textPrimary }]}>{item?.name ?? itemId}</Text>
                      </View>
                    </View>
                  );
                  return isEditable ? (
                    <TouchableOpacity
                      key={categoryCode}
                      onPress={() => openEditCatalogItemModal(garmentId, categoryCode)}
                      activeOpacity={0.7}
                    >
                      {row}
                    </TouchableOpacity>
                  ) : (
                    <View key={categoryCode}>{row}</View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    fontWeight: '700',
  },
  catalogSectionChevron: {
    marginLeft: Spacing.sm,
  },
  catalogSelectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  catalogSelectionItem: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    flex: 1,
    minWidth: '45%',
  },
  catalogSelectionLabel: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  catalogSelectionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  catalogSelectionThumb: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
  },
  catalogColorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
  },
  catalogSelectionValue: {
    ...Typography.body,
    flex: 1,
  },
});
