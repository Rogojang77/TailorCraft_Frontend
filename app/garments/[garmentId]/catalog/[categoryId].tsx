import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { DragEndParams } from 'react-native-draggable-flatlist';
import { Plus, Edit, Trash2, GripVertical, ChevronLeft } from 'lucide-react-native';
import { api, apiFetch } from '@/lib/api';
import type {
  GarmentCatalogCategory,
  GarmentCatalogItem,
  GarmentCatalogItemListResponse,
  CreateGarmentCatalogItemRequest,
  UpdateGarmentCatalogItemRequest,
} from '@/types/catalog';
import { GarmentCatalogItemEditorModal } from '@/components/GarmentCatalogItemEditorModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Button } from '@/components/ui/Button';
import { useDynamicTitle } from '@/contexts/PageTitleContext';
import { Loader } from '@/components/ui/Loader';
import { ErrorText } from '@/components/ui/ErrorText';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

function getNextSortOrder(items: GarmentCatalogItem[]): number {
  if (items.length === 0) return 0;
  const orders = items.map((i) => i.sortOrder ?? 0);
  return Math.max(0, ...orders) + 1;
}

export default function CategoryItemsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ garmentId: string; categoryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const garmentId = params.garmentId ?? '';
  const categoryId = params.categoryId ?? '';

  const [category, setCategory] = useState<GarmentCatalogCategory | null>(null);
  const [items, setItems] = useState<GarmentCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editorInitial, setEditorInitial] = useState<GarmentCatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GarmentCatalogItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useDynamicTitle(category?.name ?? t('catalog.categoryItems'));

  const fetchData = useCallback(async () => {
    if (!garmentId || !categoryId) return;
    try {
      setError(null);
      const [categoryRes, itemsRes] = await Promise.all([
        apiFetch<{ category: GarmentCatalogCategory }>(
          api.garmentCatalog.category(garmentId, categoryId)
        ),
        apiFetch<GarmentCatalogItemListResponse>(
          api.garmentCatalog.items(garmentId, categoryId, true)
        ),
      ]);
      setCategory(categoryRes.category);
      setItems(itemsRes.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('catalog.loadItemsError'));
      setCategory(null);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garmentId, categoryId, t]);

  useFocusEffect(
    useCallback(() => {
      if (garmentId && categoryId) {
        setLoading(true);
        fetchData();
      }
    }, [garmentId, categoryId, fetchData])
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [items]
  );

  const nextSortOrder = useMemo(() => getNextSortOrder(items), [items]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAddItem = useCallback(() => {
    setEditorInitial(null);
    setEditorMode('add');
    setEditorVisible(true);
  }, []);

  const handleEditItem = useCallback((item: GarmentCatalogItem) => {
    setEditorInitial(item);
    setEditorMode('edit');
    setEditorVisible(true);
  }, []);

  const handleSaveItem = useCallback(
    async (payload: CreateGarmentCatalogItemRequest | UpdateGarmentCatalogItemRequest) => {
      if (editorMode === 'add') {
        await apiFetch<{ item: GarmentCatalogItem }>(
          api.garmentCatalog.items(garmentId, categoryId),
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
      } else if (editorInitial) {
        await apiFetch<{ item: GarmentCatalogItem }>(
          api.garmentCatalog.item(garmentId, editorInitial.id),
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
      }
      setEditorVisible(false);
      setEditorInitial(null);
      fetchData();
    },
    [garmentId, categoryId, editorMode, editorInitial, fetchData]
  );

  const handleDeleteItem = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await apiFetch(api.garmentCatalog.item(garmentId, deleteTarget.id), {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteError(null);
      fetchData();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t('catalog.deleteItemError'));
    } finally {
      setDeleteLoading(false);
    }
  }, [garmentId, deleteTarget, fetchData, t]);

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const handleDragEnd = useCallback(
    async ({ data: reordered }: DragEndParams<GarmentCatalogItem>) => {
      const updated = reordered.map((item, index) => ({
        ...item,
        sortOrder: index,
      }));
      setItems(updated);

      try {
        await apiFetch<GarmentCatalogItemListResponse>(
          api.garmentCatalog.items(garmentId, categoryId),
          {
            method: 'PUT',
            body: JSON.stringify({ itemIds: reordered.map((i) => i.id) }),
          }
        );
      } catch (e) {
        Alert.alert(
          t('common.error'),
          e instanceof Error ? e.message : t('catalog.reorderError')
        );
        fetchData();
      }
    },
    [garmentId, categoryId, fetchData, t]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: { item: GarmentCatalogItem; drag: () => void; isActive: boolean }) => (
      <ScaleDecorator activeScale={1.02}>
        <View
          style={[
            styles.itemRow,
            { backgroundColor: colors.surface },
            isActive && styles.itemRowActive,
          ]}
        >
          <TouchableOpacity
            onLongPress={drag}
            style={styles.dragHandle}
            accessibilityLabel={t('catalog.dragToReorder')}
          >
            <GripVertical size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
          ) : item.color ? (
            <View style={[styles.itemColorSwatch, { backgroundColor: item.color }]} />
          ) : (
            <View style={[styles.itemPlaceholder, { backgroundColor: colors.borderLight }]} />
          )}
          <View style={styles.itemMain}>
            <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
            {item.code && (
              <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{item.code}</Text>
            )}
            {item.description && (
              <Text
                style={[styles.itemDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>
          <View style={styles.itemActions}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => handleEditItem(item)}
              leftIcon={<Edit size={16} color={colors.primary} />}
              style={styles.itemActionBtn}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setDeleteError(null);
                setDeleteTarget(item);
              }}
              leftIcon={<Trash2 size={16} color={colors.error} />}
              style={styles.itemActionBtn}
            >
              <Text style={[styles.itemActionText, { color: colors.error }]}>
                {t('common.delete')}
              </Text>
            </Button>
          </View>
        </View>
      </ScaleDecorator>
    ),
    [colors, handleEditItem, t]
  );

  if (!garmentId || !categoryId) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.centered}>
          <ErrorText>{t('catalog.categoryIdMissing')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      {loading ? (
        <Loader message={t('common.loading')} style={styles.centered} />
      ) : error || !category ? (
        <View style={styles.centered}>
          <ErrorText>{error ?? t('catalog.categoryNotFound')}</ErrorText>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setLoading(true);
              fetchData();
            }}
            style={styles.retryBtn}
          >
            {t('common.retry')}
          </Button>
        </View>
      ) : (
        <View style={styles.mainWithFooter}>
          <GestureHandlerRootView style={styles.draggableRoot}>
            <DraggableFlatList
              data={sortedItems}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
              style={styles.draggableList}
              contentContainerStyle={styles.draggableListContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                />
              }
              ListHeaderComponent={
                <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                    {t(`catalog.categories.${category.code}`) !==
                    `catalog.categories.${category.code}`
                      ? t(`catalog.categories.${category.code}`)
                      : category.name}
                  </Text>
                  {category.description && (
                    <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
                      {category.description}
                    </Text>
                  )}
                  <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
                    {t('catalog.itemCount', { count: sortedItems.length })}
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <EmptyState title={t('catalog.noItemsYet')} style={styles.emptyItems} />
              }
            />
          </GestureHandlerRootView>
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, AtelierSpacing.md),
                backgroundColor: colors.paper ?? colors.background,
                borderTopColor: colors.rule ?? colors.border,
              },
            ]}
          >
            <Button
              variant="primary"
              size="lg"
              onPress={handleAddItem}
              leftIcon={<Plus size={18} color={colors.paper ?? '#EFE9DC'} />}
              style={styles.addButton}
            >
              {t('catalog.addItem')}
            </Button>
          </View>
        </View>
      )}

      <GarmentCatalogItemEditorModal
        visible={editorVisible}
        onClose={() => {
          setEditorVisible(false);
          setEditorInitial(null);
        }}
        mode={editorMode}
        initial={editorInitial}
        suggestedSortOrder={nextSortOrder}
        onSubmit={handleSaveItem}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteItem}
        title={t('catalog.deleteItem')}
        message={
          deleteTarget
            ? t('catalog.deleteItemMessage', { name: deleteTarget.name })
            : t('common.cannotUndo')
        }
        errorMessage={deleteError}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.lg,
  },
  retryBtn: {
    marginTop: AtelierSpacing.md,
  },
  mainWithFooter: {
    flex: 1,
  },
  draggableRoot: {
    flex: 1,
  },
  draggableList: {
    flex: 0,
  },
  draggableListContent: {
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xl,
  },
  headerCard: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.lg,
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    ...AtelierShadow.card,
  },
  categoryName: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.xs,
  },
  categoryDescription: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs,
  },
  itemCount: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  emptyItems: {
    marginHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.lg,
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
    ...AtelierShadow.card,
  },
  itemRowActive: {
    opacity: 0.95,
    ...AtelierShadow.elevated,
  },
  dragHandle: {
    padding: AtelierSpacing.xs,
    marginRight: AtelierSpacing.sm,
    justifyContent: 'center',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: AtelierRadius.sm,
    marginRight: AtelierSpacing.md,
  },
  itemColorSwatch: {
    width: 48,
    height: 48,
    borderRadius: AtelierRadius.sm,
    marginRight: AtelierSpacing.md,
  },
  itemPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: AtelierRadius.sm,
    marginRight: AtelierSpacing.md,
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs / 2,
  },
  itemCode: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.xs / 2,
  },
  itemDescription: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  itemActions: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
  },
  itemActionBtn: {
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: AtelierSpacing.xs,
  },
  itemActionText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
  },
  addButton: {
    width: '100%',
  },
});
