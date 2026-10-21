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
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

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
            { backgroundColor: colors.card },
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
              <GripVertical size={20} color={colors.ink4 ?? colors.textTertiary} />
            </TouchableOpacity>
          )}
          <View style={styles.categoryMain}>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
              {category.name || t(`catalog.categories.${category.code}`)}
            </Text>
            <Text style={[styles.categoryMeta, { color: colors.ink3 }]}>
              {t('catalog.itemCount', { count: category.itemCount })}
            </Text>
          </View>
          {canEdit && (
            <View style={styles.categoryActions}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleEditCategory(category)}
                leftIcon={<Edit size={16} color={colors.brass ?? colors.primary} />}
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
                leftIcon={<Trash2 size={16} color={colors.ember ?? colors.error} />}
                style={styles.categoryActionBtn}
              >
                <Text style={[styles.categoryActionText, { color: colors.ember ?? colors.error }]}>
                  {t('common.delete')}
                </Text>
              </Button>
            </View>
          )}
          {!canEdit && (
            <ChevronRight size={20} color={colors.ink4 ?? colors.textTertiary} />
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
              <Plus size={18} color={colors.brass ?? colors.primary} />
              <Text style={[styles.addCategoryHeaderText, { color: colors.brass ?? colors.primary }]}>
                {t('catalog.addCategory')}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
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
                style={[styles.categoryRow, { backgroundColor: colors.card }]}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryMain}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                    {category.name || t(`catalog.categories.${category.code}`)}
                  </Text>
                  <Text style={[styles.categoryMeta, { color: colors.ink3 }]}>
                    {t('catalog.itemCount', { count: category.itemCount })}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.ink4 ?? colors.textTertiary} />
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
    marginHorizontal: AtelierSpacing.md,
  },
  emptyCategories: {
    // EmptyState defaults to 80% height for full-screen lists; inside a page section it should hug its text.
    height: 'auto',
    marginHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
    ...AtelierShadow.card,
  },
  categoryRowActive: {
    opacity: 0.95,
    ...AtelierShadow.card,
  },
  dragHandle: {
    padding: AtelierSpacing.xs,
    marginRight: AtelierSpacing.sm,
    justifyContent: 'center',
  },
  categoryMain: {
    flex: 1,
  },
  categoryName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs,
  },
  categoryMeta: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
  },
  categoryActionBtn: {
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: AtelierSpacing.xs,
  },
  categoryActionText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  addCategoryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  addCategoryHeaderText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
});
