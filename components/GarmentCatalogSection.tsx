import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { DragEndParams } from 'react-native-draggable-flatlist';
import { Plus, Edit, Trash2, GripVertical, ChevronRight } from 'lucide-react-native';
import { api, apiFetch } from '@/lib/api';
import type {
  GarmentCatalogCategory,
  GarmentCatalogCategoryListResponse,
  CreateGarmentCatalogCategoryRequest,
  UpdateGarmentCatalogCategoryRequest,
} from '@/types/catalog';
import { GarmentCatalogCategoryEditorModal } from './GarmentCatalogCategoryEditorModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius, Shadows, CompactLayoutStyles } from '@/constants/design';

export interface GarmentCatalogSectionProps {
  garmentId: string;
  categories: GarmentCatalogCategory[];
  canEdit: boolean;
  onCategoriesChange: (categories: GarmentCatalogCategory[]) => void;
  onRefresh: () => void;
}

function getNextSortOrder(categories: GarmentCatalogCategory[]): number {
  if (categories.length === 0) return 0;
  const orders = categories.map((c) => c.sortOrder ?? 0);
  return Math.max(0, ...orders) + 1;
}

export function GarmentCatalogSection({
  garmentId,
  categories,
  canEdit,
  onCategoriesChange,
  onRefresh,
}: GarmentCatalogSectionProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editorInitial, setEditorInitial] = useState<GarmentCatalogCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GarmentCatalogCategory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  );

  const nextSortOrder = useMemo(() => getNextSortOrder(categories), [categories]);

  const handleAddCategory = useCallback(() => {
    setEditorInitial(null);
    setEditorMode('add');
    setEditorVisible(true);
  }, []);

  const handleEditCategory = useCallback((category: GarmentCatalogCategory) => {
    setEditorInitial(category);
    setEditorMode('edit');
    setEditorVisible(true);
  }, []);

  const handleSaveCategory = useCallback(
    async (payload: CreateGarmentCatalogCategoryRequest | UpdateGarmentCatalogCategoryRequest) => {
      if (editorMode === 'add') {
        await apiFetch<{ category: GarmentCatalogCategory }>(
          api.garmentCatalog.categories(garmentId),
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
      } else if (editorInitial) {
        await apiFetch<{ category: GarmentCatalogCategory }>(
          api.garmentCatalog.category(garmentId, editorInitial.id),
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
      }
      setEditorVisible(false);
      setEditorInitial(null);
      onRefresh();
    },
    [garmentId, editorMode, editorInitial, onRefresh]
  );

  const handleDeleteCategory = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await apiFetch(api.garmentCatalog.category(garmentId, deleteTarget.id), {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteError(null);
      onRefresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t('catalog.deleteCategoryError'));
    } finally {
      setDeleteLoading(false);
    }
  }, [garmentId, deleteTarget, onRefresh, t]);

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const handleDragEnd = useCallback(
    async ({ data: reordered }: DragEndParams<GarmentCatalogCategory>) => {
      const updated = reordered.map((cat, index) => ({
        ...cat,
        sortOrder: index,
      }));
      onCategoriesChange(updated);

      try {
        await apiFetch<GarmentCatalogCategoryListResponse>(
          api.garmentCatalog.categories(garmentId),
          {
            method: 'PUT',
            body: JSON.stringify({ categoryIds: reordered.map((c) => c.id) }),
          }
        );
      } catch (e) {
        Alert.alert(
          t('common.error'),
          e instanceof Error ? e.message : t('catalog.reorderError')
        );
        onRefresh();
      }
    },
    [garmentId, onCategoriesChange, onRefresh, t]
  );

  const handleCategoryPress = useCallback(
    (category: GarmentCatalogCategory) => {
      router.push(`/garments/${garmentId}/catalog/${category.id}`);
    },
    [garmentId, router]
  );

  const renderCategoryItem = useCallback(
    ({ item: category, drag, isActive }: { item: GarmentCatalogCategory; drag: () => void; isActive: boolean }) => (
      <ScaleDecorator activeScale={1.02}>
        <TouchableOpacity
          style={[
            styles.categoryRow,
            { backgroundColor: colors.surface },
            isActive && styles.categoryRowActive,
          ]}
          onPress={() => handleCategoryPress(category)}
          activeOpacity={0.7}
        >
          {canEdit && (
            <TouchableOpacity
              onLongPress={drag}
              style={styles.dragHandle}
              accessibilityLabel={t('catalog.dragToReorder')}
            >
              <GripVertical size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          <View style={styles.categoryMain}>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
              {t(`catalog.categories.${category.code}`) !== `catalog.categories.${category.code}`
                ? t(`catalog.categories.${category.code}`)
                : category.name}
            </Text>
            <Text style={[styles.categoryMeta, { color: colors.textSecondary }]}>
              {t('catalog.itemCount', { count: category.itemCount })}
            </Text>
          </View>
          {canEdit && (
            <View style={styles.categoryActions}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleEditCategory(category)}
                leftIcon={<Edit size={16} color={colors.primary} />}
                style={styles.categoryActionBtn}
              >
                {t('common.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setDeleteError(null);
                  setDeleteTarget(category);
                }}
                leftIcon={<Trash2 size={16} color={colors.error} />}
                style={styles.categoryActionBtn}
              >
                <Text style={[styles.categoryActionText, { color: colors.error }]}>
                  {t('common.delete')}
                </Text>
              </Button>
            </View>
          )}
          {!canEdit && (
            <ChevronRight size={20} color={colors.textTertiary} />
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [colors, canEdit, handleCategoryPress, handleEditCategory, t]
  );

  if (!canEdit && sortedCategories.length === 0) {
    return null;
  }

  return (
    <>
      <Section
        title={t('catalog.styleAndMaterials')}
        headerRight={
          canEdit ? (
            <TouchableOpacity onPress={handleAddCategory} style={styles.addCategoryHeaderBtn}>
              <Plus size={18} color={colors.primary} />
              <Text style={[styles.addCategoryHeaderText, { color: colors.primary }]}>
                {t('catalog.addCategory')}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
        style={CompactLayoutStyles.compactSection}
      >
        {sortedCategories.length === 0 ? (
          <EmptyState
            title={t('catalog.noCategoriesYet')}
            style={styles.emptyCategories}
          />
        ) : canEdit ? (
          <GestureHandlerRootView style={styles.draggableRoot}>
            <DraggableFlatList
              data={sortedCategories}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              renderItem={renderCategoryItem}
              scrollEnabled={false}
            />
          </GestureHandlerRootView>
        ) : (
          <View>
            {sortedCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryRow, { backgroundColor: colors.surface }]}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryMain}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                    {t(`catalog.categories.${category.code}`) !== `catalog.categories.${category.code}`
                      ? t(`catalog.categories.${category.code}`)
                      : category.name}
                  </Text>
                  <Text style={[styles.categoryMeta, { color: colors.textSecondary }]}>
                    {t('catalog.itemCount', { count: category.itemCount })}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Section>

      <GarmentCatalogCategoryEditorModal
        visible={editorVisible}
        onClose={() => {
          setEditorVisible(false);
          setEditorInitial(null);
        }}
        mode={editorMode}
        initial={editorInitial}
        existingCategories={categories}
        suggestedSortOrder={nextSortOrder}
        onSubmit={handleSaveCategory}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteCategory}
        title={t('catalog.deleteCategory')}
        message={
          deleteTarget
            ? t('catalog.deleteCategoryMessage', { name: deleteTarget.name })
            : t('common.cannotUndo')
        }
        errorMessage={deleteError}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  draggableRoot: {
    marginHorizontal: Spacing.md,
  },
  emptyCategories: {
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  categoryRowActive: {
    opacity: 0.95,
    ...Shadows.md,
  },
  dragHandle: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
    justifyContent: 'center',
  },
  categoryMain: {
    flex: 1,
  },
  categoryName: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  categoryMeta: {
    ...Typography.small,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryActionBtn: {
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: Spacing.xs,
  },
  categoryActionText: {
    ...Typography.captionBold,
  },
  addCategoryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addCategoryHeaderText: {
    ...Typography.captionBold,
  },
});
