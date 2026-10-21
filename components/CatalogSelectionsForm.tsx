import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { Search, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { GarmentCatalogCategoryWithItems } from '@/types/catalog';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { API_BASE_URL } from '@/lib/api';

const COLLAPSE_THRESHOLD = 3; // Show search + collapse when categories exceed this

export interface CatalogSelectionsFormProps {
  categories: GarmentCatalogCategoryWithItems[];
  selections: Record<string, string | string[]>;
  onSelectionChange: (categoryCode: string, itemId: string | null) => void;
  isLoading?: boolean;
}

function ColorSwatch({ color, borderColor }: { color: string | null; borderColor: string }) {
  if (!color) return null;
  return (
    <View
      style={[
        styles.colorSwatch,
        { backgroundColor: color, borderColor },
      ]}
    />
  );
}

function matchesSearch(query: string, categoryLabel: string, itemNames: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (categoryLabel.toLowerCase().includes(q)) return true;
  return itemNames.some((name) => name.toLowerCase().includes(q));
}

export function CatalogSelectionsForm({
  categories,
  selections,
  onSelectionChange,
  isLoading = false,
}: CatalogSelectionsFormProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({});

  const showSearchAndCollapse = categories.length > COLLAPSE_THRESHOLD;

  // Default expanded: categories with a selection, or all when few categories
  useEffect(() => {
    if (!showSearchAndCollapse) return;
    setExpandedCategoryIds((prev) => {
      const next = { ...prev };
      for (const cat of categories) {
        const sel = selections[cat.code];
        const hasSelection = sel != null && (Array.isArray(sel) ? sel.length > 0 : !!sel);
        if (next[cat.id] === undefined) {
          next[cat.id] = hasSelection;
        }
      }
      return next;
    });
  }, [showSearchAndCollapse, categories.map((c) => c.id).join(','), selections]);

  const getSelectedItemId = useCallback(
    (categoryCode: string): string | null => {
      const selection = selections[categoryCode];
      if (!selection) return null;
      return Array.isArray(selection) ? selection[0] ?? null : selection;
    },
    [selections]
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.trim().toLowerCase();
    return categories
      .map((cat) => {
        const categoryTranslationKey = `catalog.categories.${cat.code}`;
        const translatedName = t(categoryTranslationKey);
        const categoryLabel = translatedName !== categoryTranslationKey ? translatedName : cat.name;
        const itemNames = (cat.items ?? []).map((i) => i.name);
        if (!matchesSearch(searchQuery, categoryLabel, itemNames)) return null;
        const filteredItems = (cat.items ?? []).filter(
          (item) => categoryLabel.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
        );
        return { ...cat, items: filteredItems };
      })
      .filter((c): c is GarmentCatalogCategoryWithItems => c != null);
  }, [categories, searchQuery, t]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategoryIds((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showSearchAndCollapse && (
        <View style={[styles.searchRow, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, borderColor: colors.rule ?? colors.border }]}>
          <Search size={18} color={colors.ink3} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('catalog.searchPlaceholder', { defaultValue: 'Search categories & items...' })}
            placeholderTextColor={colors.ink4 ?? colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={!isLoading}
          />
        </View>
      )}

      <View style={styles.categoriesContainer}>
        {filteredCategories.map((category) => {
          const items = category.items ?? [];
          const selectedItemId = getSelectedItemId(category.code);
          const hasItems = items.length > 0;

          const categoryTranslationKey = `catalog.categories.${category.code}`;
          const translatedName = t(categoryTranslationKey);
          const categoryLabel = translatedName !== categoryTranslationKey ? translatedName : category.name;

          const isExpanded = showSearchAndCollapse ? expandedCategoryIds[category.id] !== false : true;
          const onToggle = showSearchAndCollapse ? () => toggleCategory(category.id) : undefined;

          const categoryHeader = (
            <View style={styles.categoryHeaderRow}>
              {onToggle ? (
                <TouchableOpacity
                  style={[styles.categoryHeaderTouchable, { borderColor: colors.rule ?? colors.border }]}
                  onPress={onToggle}
                  activeOpacity={0.7}
                  accessibilityLabel={isExpanded ? t('common.collapse', { defaultValue: 'Collapse' }) : t('common.expand', { defaultValue: 'Expand' })}
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>{categoryLabel}</Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.ink3} style={styles.categoryChevron} />
                  ) : (
                    <ChevronDown size={18} color={colors.ink3} style={styles.categoryChevron} />
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>{categoryLabel}</Text>
              )}
            </View>
          );

          return (
            <View key={category.id} style={styles.categoryField}>
              {categoryHeader}
              {isExpanded && (
                <View style={styles.optionRowWrapper}>
                  {!hasItems || isLoading ? (
                    <Text style={[styles.noItemsText, { color: colors.ink4 ?? colors.textTertiary }]}>{t('catalog.noItems')}</Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {items.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.optionButton,
                              { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, borderColor: colors.rule ?? colors.border },
                              isSelected && { backgroundColor: colors.brass ?? colors.primary, borderColor: colors.brass ?? colors.primary },
                            ]}
                            onPress={() => onSelectionChange(category.code, item.id)}
                            disabled={isLoading}
                            activeOpacity={0.7}
                          >
                            <View style={styles.optionButtonContent}>
                              {item.imageUrl ? (
                                <Image source={{ uri: item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}` }} style={styles.optionButtonThumb} />
                              ) : null}
                              {item.color && <ColorSwatch color={item.color} borderColor={colors.rule ?? colors.border} />}
                              <Text
                                style={[
                                  styles.optionText,
                                  { color: colors.ink3 },
                                  isSelected && { color: colors.paper ?? '#EFE9DC' },
                                ]}
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {showSearchAndCollapse && searchQuery.trim() && filteredCategories.length === 0 && (
        <Text style={[styles.noResultsText, { color: colors.ink4 ?? colors.textTertiary }]}>
          {t('catalog.noSearchResults', { defaultValue: 'No categories or items match your search.' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: AtelierSpacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: AtelierSpacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: AtelierSpacing.sm,
  },
  categoriesContainer: {
    gap: AtelierSpacing.sm,
    paddingBottom: AtelierSpacing.md,
  },
  categoryField: {
    marginBottom: AtelierSpacing.xs,
  },
  categoryHeaderRow: {
    marginBottom: AtelierSpacing.sm,
  },
  categoryHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.sm,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
  },
  categoryChevron: {
    marginLeft: AtelierSpacing.sm,
  },
  categoryLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  noResultsText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.sm,
  },
  optionRowWrapper: {
    minHeight: 44,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.lg,
    paddingVertical: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    borderWidth: 2,
    height: 48,
  },
  optionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  optionButtonThumb: {
    width: 28,
    height: 28,
    borderRadius: AtelierRadius.sm,
    resizeMode: 'contain',
  },
  optionText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  noItemsText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
});
