import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { resolveUploadUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [maxCatalogCardHeight, setMaxCatalogCardHeight] = useState(0);
  const [catalogGridWidth, setCatalogGridWidth] = useState(0);

  const catalogItemWidth = useMemo(() => {
    const availableWidth = catalogGridWidth > 0 ? catalogGridWidth : screenWidth - AtelierSpacing.md * 4;
    const columns = screenWidth > screenHeight ? 3 : 2;
    const totalGapWidth = AtelierSpacing.sm * Math.max(0, columns - 1);
    return (availableWidth - totalGapWidth) / columns;
  }, [catalogGridWidth, screenHeight, screenWidth]);

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
          <View key={`catalog-${garmentId}`} style={[styles.section, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.sectionHeader, { justifyContent: 'space-between' }]}
              onPress={() => onToggleSection(garmentId)}
              activeOpacity={0.7}
              accessibilityLabel={isExpanded ? t('common.collapse') : t('common.expand')}
              accessibilityState={{ expanded: isExpanded }}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
              {isExpanded ? (
                <ChevronUp size={20} color={colors.ink3} style={styles.catalogSectionChevron} />
              ) : (
                <ChevronDown size={20} color={colors.ink3} style={styles.catalogSectionChevron} />
              )}
            </TouchableOpacity>
            {isExpanded && (
              <View
                style={styles.catalogSelectionsGrid}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (nextWidth > 0 && Math.abs(nextWidth - catalogGridWidth) > 0.5) {
                    setCatalogGridWidth(nextWidth);
                  }
                }}
              >
                {Object.entries(selections).map(([categoryCode, itemIdOrIds]) => {
                  const itemId = Array.isArray(itemIdOrIds) ? itemIdOrIds[0] : itemIdOrIds;
                  if (!itemId) return null;
                  const item = resolvedCatalogItems[String(itemId)];
                  const categoryLabel =
                    resolvedCatalogCategoryLabels[categoryCode] ??
                    t(`catalog.categories.${categoryCode}`, { defaultValue: categoryCode });
                  const row = (
                    <View
                      onLayout={(event) => {
                        const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
                        if (measuredHeight > maxCatalogCardHeight) {
                          setMaxCatalogCardHeight(measuredHeight);
                        }
                      }}
                      style={[
                        styles.catalogSelectionItem,
                        {
                          backgroundColor: colors.ruleSoft ?? colors.rule,
                          width: catalogItemWidth,
                          minWidth: catalogItemWidth,
                          maxWidth: catalogItemWidth,
                          minHeight: maxCatalogCardHeight || undefined,
                        },
                      ]}
                    >
                      <Text style={[styles.catalogSelectionLabel, { color: colors.ink3 }]}>{categoryLabel}</Text>
                      <View style={styles.catalogSelectionValueRow}>
                        {item?.imageUrl ? (
                          <Image source={{ uri: resolveUploadUrl(item.imageUrl) ?? '' }} style={styles.catalogSelectionThumb} />
                        ) : null}
                        {item?.color && (
                          <View style={[styles.catalogColorSwatch, { backgroundColor: item.color, borderColor: colors.rule }]} />
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
    marginBottom: AtelierSpacing.md,
    marginHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    ...AtelierShadow.elevated,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  catalogSectionChevron: {
    marginLeft: AtelierSpacing.sm,
  },
  catalogSelectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.sm,
  },
  catalogSelectionItem: {
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    flexGrow: 0,
    flexShrink: 0,
  },
  catalogSelectionLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: AtelierSpacing.xs,
  },
  catalogSelectionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  catalogSelectionThumb: {
    width: 32,
    height: 32,
    borderRadius: AtelierRadius.sm,
    resizeMode: 'contain',
  },
  catalogColorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
  },
  catalogSelectionValue: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
});
