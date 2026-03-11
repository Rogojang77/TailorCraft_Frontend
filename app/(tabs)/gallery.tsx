import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Alert,
  RefreshControl,
  FlatList,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, Grid3X3, List, X, Trash2, ChevronDown, FolderEdit } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api, apiFetch, uploadImage, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { InlineSpinner } from '@/components/InlineSpinner';
import { Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GALLERY_VIEW_MODE_KEY = 'gallery:viewMode';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300?text=Gallery+item';

const ALL_CATEGORIES_ID = 'all';

export type GalleryCategory = { id: string; name: string; sortOrder: number; itemCount?: number };

type GalleryItem = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  image: string;
  description: string | null;
};

// Image Viewer Component using ZoomableImageViewer
const ImageViewer = memo<{
  visible: boolean;
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
  onDeleteRequest: (item: GalleryItem) => void;
}>(({ visible, items, initialIndex, onClose, onDeleteRequest }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const images = useMemo(() => 
    items.map(item => ({
      uri: item.image,
      title: item.title,
      description: item.description || undefined,
      category: item.categoryName,
    })),
    [items]
  );

  const handleDelete = useCallback((index: number) => {
    const item = items[index];
    if (item) {
      onClose();
      setTimeout(() => onDeleteRequest(item), 300);
    }
  }, [items, onClose, onDeleteRequest]);

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (items.length === 0) return null;

  return (
    <ZoomableImageViewer
      visible={visible}
      images={images}
      initialIndex={initialIndex}
      onClose={onClose}
      onIndexChange={handleIndexChange}
      headerRight={(index) => (
        <TouchableOpacity
          style={styles.imageViewerDeleteBtn}
          onPress={() => handleDelete(index)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    />
  );
});

ImageViewer.displayName = 'ImageViewer';

// Memoized gallery item component to prevent unnecessary re-renders
const GalleryItemCard = memo<{
  item: GalleryItem;
  viewMode: 'grid' | 'list';
  onDeleteRequest: (item: GalleryItem) => void;
  onView: (item: GalleryItem) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}>(({ item, viewMode, onDeleteRequest, onView, colors }) => {
  const handleDelete = useCallback((e: any) => {
    e.stopPropagation();
    onDeleteRequest(item);
  }, [item, onDeleteRequest]);

  const handlePress = useCallback(() => {
    onView(item);
  }, [item, onView]);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.gridImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.galleryItemImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={[styles.listImage, { backgroundColor: colors.borderLight }]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.galleryItemGradient}
        />
        <TouchableOpacity
          style={styles.deleteIconBtn}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.deleteIconShadow}>
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={[styles.itemCategoryBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.itemCategoryText, { color: colors.primaryDark }]}>
            {item.categoryName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

GalleryItemCard.displayName = 'GalleryItemCard';

export default function GalleryTab() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ openAdd?: string }>();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>('');
  const [newItemImage, setNewItemImage] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<GalleryCategory | null>(null);
  const [categoryDeleteLoading, setCategoryDeleteLoading] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(GALLERY_VIEW_MODE_KEY);
        if (saved === 'grid' || saved === 'list') {
          setViewMode(saved);
        }
      } catch {}
      setViewModeLoaded(true);
    };

    loadViewMode();
  }, []);

  useEffect(() => {
    if (!viewModeLoaded) return;

    AsyncStorage.setItem(GALLERY_VIEW_MODE_KEY, viewMode).catch(() => {});
  }, [viewMode, viewModeLoaded]);

  // Open add-item modal when navigated from FAB with ?openAdd=1
  useFocusEffect(
    useCallback(() => {
      if (params.openAdd === '1') {
        setShowAddModal(true);
        router.replace('/(tabs)/gallery');
      }
    }, [params.openAdd, router])
  );

  const getFilterCategoryLabel = (id: string) =>
    id === ALL_CATEGORIES_ID ? t('gallery.categories.all') : (categories.find((c) => c.id === id)?.name ?? id);

  // Use ref to track if component is mounted for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const list = await apiFetch<GalleryCategory[]>(api.galleryCategories());
      if (isMountedRef.current) {
        const arr = Array.isArray(list) ? list : [];
        setCategories(arr);
        setNewItemCategoryId((prev) => (prev === '' && arr.length ? arr[0].id : prev));
      }
    } catch {
      if (isMountedRef.current) setCategories([]);
    }
  }, []);

  const fetchGallery = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const categoryParam =
        activeCategoryId === ALL_CATEGORIES_ID ? '' : `&categoryId=${encodeURIComponent(activeCategoryId)}`;
      const res = await apiFetch<{
        items: Array<{
          id: string;
          title: string;
          categoryId: string;
          categoryName: string;
          imageUrl: string;
          description: string | null;
        }>;
      }>(`${api.gallery()}?limit=100${categoryParam}`);

      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        const items = (res.items ?? []).map((i) => ({
          id: i.id,
          title: i.title,
          categoryId: i.categoryId,
          categoryName: i.categoryName ?? '',
          image: i.imageUrl,
          description: i.description,
        }));
        setGalleryItems(items);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) setGalleryItems([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeCategoryId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      if (isMountedRef.current) {
        fetchCategories();
        fetchGallery();
      }
      return () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    }, [isAuthenticated, fetchCategories, fetchGallery])
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isMountedRef.current) fetchGallery();
  }, [isAuthenticated, activeCategoryId, fetchGallery]);

  const handleAddItem = () => setShowAddModal(true);
  const onRefresh = () => fetchGallery(true);

  const handleDeleteRequest = (item: GalleryItem) => {
    setDeleteTarget(item);
  };

  const handleViewItem = (item: GalleryItem) => {
    const index = galleryItems.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      setViewerIndex(index);
      setViewerVisible(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiFetch(api.gallery(deleteTarget.id), { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchGallery(true);
      Alert.alert(t('common.success'), t('gallery.alerts.deleteSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('gallery.alerts.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('gallery.alerts.permissionRequired'), t('gallery.alerts.permissionMessage'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Disable editing to preserve original aspect ratio (including 9:16)
      quality: 0.8, // Reduced from 1.0 to save memory
    });
    if (!result.canceled && result.assets[0]) {
      try {
        // Compress and resize image before storing in state to reduce memory usage
        // This prevents keeping full-resolution images in memory
        // Use max dimensions that maintain aspect ratio for both portrait and landscape
        const asset = result.assets[0];
        const maxDimension = 1200;
        
        // Calculate resize dimensions maintaining aspect ratio
        let resizeWidth = asset.width;
        let resizeHeight = asset.height;
        
        if (asset.width > maxDimension || asset.height > maxDimension) {
          const ratio = Math.min(maxDimension / asset.width, maxDimension / asset.height);
          resizeWidth = Math.round(asset.width * ratio);
          resizeHeight = Math.round(asset.height * ratio);
        }
        
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: resizeWidth, height: resizeHeight } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to 70% quality
        );
        setNewItemImage(manipulatedImage.uri);
      } catch (error) {
        // Fallback to original if manipulation fails
        setNewItemImage(result.assets[0].uri);
      }
    }
  };

  const handleSaveItem = async () => {
    if (!newItemTitle.trim()) {
      Alert.alert(t('common.error'), t('gallery.alerts.fillTitle'));
      return;
    }
    setSaving(true);
    try {
      // Upload image if it's a local file
      let imageUrl = newItemImage;
      if (newItemImage && !newItemImage.startsWith('http')) {
        try {
          // Image is already compressed in handlePickImage, but ensure it's optimized
          // Additional compression for upload to reduce bandwidth and server storage
          // Resize maintains aspect ratio, so this works for both portrait and landscape
          const finalImage = await ImageManipulator.manipulateAsync(
            newItemImage,
            [{ resize: { width: 800 } }], // Further reduce for upload (maintains aspect ratio)
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          imageUrl = await uploadImage(finalImage.uri);
          // Clear local image from memory after upload
          setNewItemImage(null);
        } catch (uploadError) {
          Alert.alert(t('common.error'), t('gallery.alerts.uploadError'));
          setSaving(false);
          return;
        }
      }

      if (!imageUrl) {
        imageUrl = PLACEHOLDER_IMAGE;
      }

      if (!newItemCategoryId) {
        Alert.alert(t('common.error'), t('gallery.alerts.createCategoryFirst'));
        setSaving(false);
        return;
      }
      await apiFetch(api.gallery(), {
        method: 'POST',
        body: JSON.stringify({
          title: newItemTitle.trim(),
          description: newItemDescription.trim() || undefined,
          categoryId: newItemCategoryId,
          imageUrl,
        }),
      });
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemCategoryId(categories[0]?.id ?? '');
      setNewItemImage(null);
      setShowAddModal(false);
      await fetchGallery(true);
      Alert.alert(t('common.success'), t('gallery.alerts.addSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('gallery.alerts.addError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    const name = categoryNameInput.trim();
    if (!name) return;
    setCategorySaving(true);
    try {
      if (categoryEditId) {
        await apiFetch(api.galleryCategories(categoryEditId), {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
        Alert.alert(t('common.success'), t('gallery.alerts.categoryUpdated'));
        setCategoryEditId(null);
      } else {
        await apiFetch(api.galleryCategories(), {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        Alert.alert(t('common.success'), t('gallery.alerts.categoryCreated'));
      }
      setCategoryNameInput('');
      await fetchCategories();
      await fetchGallery(true);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('gallery.alerts.categoryError'));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryDeleteTarget) return;
    setCategoryDeleteLoading(true);
    try {
      await apiFetch(api.galleryCategories(categoryDeleteTarget.id), { method: 'DELETE' });
      setCategoryDeleteTarget(null);
      await fetchCategories();
      await fetchGallery(true);
      Alert.alert(t('common.success'), t('gallery.alerts.categoryDeleted'));
    } catch (e: unknown) {
      const is409 = e instanceof ApiError && e.status === 409;
      Alert.alert(
        t('common.error'),
        is409 ? t('gallery.alerts.categoryInUse') : (e instanceof Error ? e.message : t('gallery.alerts.categoryError'))
      );
    } finally {
      setCategoryDeleteLoading(false);
      setCategoryDeleteTarget(null);
    }
  };

  if (!viewModeLoaded) {
    return null;
  }

  return (
    <ScreenContainer noPadding>
      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.viewModeButtons}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: viewMode === 'grid' ? colors.primary : colors.borderLight }, viewMode === 'grid' && styles.activeViewButton]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}
          >
            <Grid3X3 size={18} color={viewMode === 'grid' ? colors.textInverse : colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: viewMode === 'list' ? colors.primary : colors.borderLight }, viewMode === 'list' && styles.activeViewButton]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <List size={18} color={viewMode === 'list' ? colors.textInverse : colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleAddItem}
          activeOpacity={0.8}
        >
          <Plus size={20} color={colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Category dropdown */}
      <View style={[styles.categoriesWrapper, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.categoryDropdownTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setCategoryDropdownOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryDropdownTriggerText, { color: colors.textPrimary }]} numberOfLines={1}>
            {getFilterCategoryLabel(activeCategoryId)}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manageCategoriesBtn}
          onPress={() => { fetchCategories(); setShowCategoriesModal(true); }}
        >
          <FolderEdit size={18} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.manageCategoriesText, { color: colors.primary }]}>{t('gallery.manageCategories')}</Text>
        </TouchableOpacity>
      </View>

      {/* Category dropdown modal */}
      <Modal
        visible={categoryDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.categoryDropdownBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryDropdownOpen(false)}
        >
          <View style={[styles.categoryDropdownPanel, { backgroundColor: colors.surface }]}>
            <ScrollView
              style={styles.categoryDropdownScroll}
              keyboardShouldPersistTaps="handled"
            >
              {[ALL_CATEGORIES_ID, ...categories.map((c) => c.id)].map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.categoryDropdownOption,
                    activeCategoryId === id && [styles.categoryDropdownOptionActive, { backgroundColor: colors.primaryLight }],
                  ]}
                  onPress={() => {
                    setActiveCategoryId(id);
                    setCategoryDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryDropdownOptionText,
                      { color: colors.textPrimary },
                      activeCategoryId === id && [styles.categoryDropdownOptionTextActive, { color: colors.primary }],
                    ]}
                  >
                    {getFilterCategoryLabel(id)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gallery Content */}
      {loading && !refreshing ? (
        <View style={styles.content}>
          <ListSkeletonLoader variant="grid" count={6} />
        </View>
      ) : galleryItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('gallery.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={galleryItems}
          key={viewMode} // Force re-render when view mode changes
          numColumns={viewMode === 'grid' ? 3 : 1}
          keyExtractor={(item) => item.id}
          style={styles.content}
          contentContainerStyle={viewMode === 'grid' ? styles.cleanGridContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          // Performance optimizations for FlatList
          windowSize={5} // Render 5 screens worth of items (reduces memory)
          initialNumToRender={viewMode === 'grid' ? 6 : 10} // Render fewer items initially
          maxToRenderPerBatch={viewMode === 'grid' ? 4 : 8} // Render in smaller batches
          removeClippedSubviews={true} // Remove off-screen views from native hierarchy
          renderItem={({ item }) => (
            <GalleryItemCard
              item={item}
              viewMode={viewMode}
              onDeleteRequest={handleDeleteRequest}
              onView={handleViewItem}
              colors={colors}
            />
          )}
        />
      )}

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('gallery.addItem')}</Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={handlePickImage}
            >
              {newItemImage ? (
                <Image
                  source={{ uri: newItemImage }}
                  style={[styles.pickedImage, { backgroundColor: colors.border }]}
                  resizeMode="cover"
                  // Explicit dimensions prevent loading full-resolution images
                />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.borderLight, borderColor: colors.border }]}>
                  <Plus size={32} color={colors.textTertiary} />
                  <Text style={[styles.imagePlaceholderText, { color: colors.textTertiary }]}>{t('gallery.addImage')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <Input
              label={t('gallery.titleLabel')}
              placeholder={t('gallery.titlePlaceholder')}
              value={newItemTitle}
              onChangeText={setNewItemTitle}
            />

            <Input
              label={`${t('common.optional')} – ${t('gallery.descriptionLabel')}`}
              placeholder={t('gallery.descriptionPlaceholder')}
              value={newItemDescription}
              onChangeText={setNewItemDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('gallery.categoryLabel')}</Text>
            {categories.length === 0 ? (
              <Text style={[styles.noCategoriesHint, { color: colors.textSecondary }]}>{t('gallery.createCategoryFirst')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: newItemCategoryId === c.id ? colors.primary : colors.borderLight },
                      newItemCategoryId === c.id && styles.activeCategoryOption,
                    ]}
                    onPress={() => setNewItemCategoryId(c.id)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: newItemCategoryId === c.id ? colors.textInverse : colors.textSecondary },
                        newItemCategoryId === c.id && styles.activeCategoryOptionText,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.saveButtonDisabled]}
              onPress={handleSaveItem}
              disabled={saving}
            >
              {saving ? (
                <InlineSpinner variant="inverse" />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>{t('gallery.save')}</Text>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>

      <ImageViewer
        visible={viewerVisible}
        items={galleryItems}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        onDeleteRequest={handleDeleteRequest}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('gallery.deleteItem')}
        message={deleteTarget ? t('gallery.deleteMessage', { title: deleteTarget.title }) : ''}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
      />

      {/* Manage Categories Modal */}
      <Modal
        visible={showCategoriesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoriesModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('gallery.manageCategories')}</Text>
            <TouchableOpacity onPress={() => setShowCategoriesModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <KeyboardAwareScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.categoryFormRow}>
              <Input
                placeholder={t('gallery.categoryNamePlaceholder')}
                value={categoryNameInput}
                onChangeText={(text) => {
                  setCategoryNameInput(text);
                  if (!text.trim()) setCategoryEditId(null);
                }}
                containerStyle={styles.categoryInput}
              />
              <Button
                variant="primary"
                onPress={handleSaveCategory}
                size="sm"
                disabled={categorySaving || !categoryNameInput.trim()}
                loading={categorySaving}
              >
                {categoryEditId ? t('common.save') : t('gallery.addCategory')}
              </Button>
            </View>
            {categoryEditId && (
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => { setCategoryEditId(null); setCategoryNameInput(''); }}
              >
                <Text style={[styles.cancelEditText, { color: colors.primary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('gallery.yourCategories')}</Text>
            {categories.length === 0 ? (
              <Text style={[styles.noCategoriesHint, { color: colors.textSecondary }]}>{t('gallery.noCategoriesYet')}</Text>
            ) : (
              categories.map((c) => (
                <View key={c.id} style={[styles.categoryRow, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.categoryRowName}
                    onPress={() => {
                      setCategoryEditId(c.id);
                      setCategoryNameInput(c.name);
                    }}
                  >
                    <Text style={[styles.categoryRowNameText, { color: colors.textPrimary }]}>{c.name}</Text>
                    {c.itemCount != null && c.itemCount > 0 && (
                      <Text style={[styles.categoryRowCount, { color: colors.textTertiary }]}>{c.itemCount}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.categoryRowDelete}
                    onPress={() => setCategoryDeleteTarget(c)}
                    disabled={(c.itemCount ?? 0) > 0}
                  >
                    <Trash2 size={18} color={(c.itemCount ?? 0) > 0 ? colors.textTertiary : colors.error} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </KeyboardAwareScrollView>
        </SafeAreaView>
        <DeleteConfirmModal
          visible={!!categoryDeleteTarget}
          onClose={() => !categoryDeleteLoading && setCategoryDeleteTarget(null)}
          onConfirm={handleDeleteCategoryConfirm}
          title={t('gallery.deleteCategory')}
          message={
            categoryDeleteTarget
              ? t('gallery.deleteCategoryMessage', { name: categoryDeleteTarget.name })
              : ''
          }
          confirmLabel={t('common.delete')}
          loading={categoryDeleteLoading}
        />
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeViewButton: {
    ...Shadows.primary,
  },
  addButton: {
    ...ButtonStyles.primaryIcon,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
  },
  categoriesWrapper: {
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryDropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 44,
  },
  categoryDropdownTriggerText: {
    ...Typography.body,
    fontWeight: '500',
    flex: 1,
  },
  categoryDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  categoryDropdownPanel: {
    borderRadius: BorderRadius.lg,
    maxHeight: 320,
    ...Shadows.lg,
  },
  categoryDropdownScroll: {
    maxHeight: 320,
  },
  categoryDropdownOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  categoryDropdownOptionActive: {
  },
  categoryDropdownOptionText: {
    ...Typography.body,
  },
  categoryDropdownOptionTextActive: {
    fontWeight: '600',
  },
  manageCategoriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.md,
  },
  manageCategoriesText: {
    ...Typography.label,
    fontWeight: '600',
  },
  noCategoriesHint: {
    ...Typography.body,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  categoryFormRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  categoryInput: {
    flex: 1,
    marginBottom: 0,
  },
  categorySubmitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelEditBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  cancelEditText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
  },
  categoryRowName: {
    flex: 1,
  },
  categoryRowNameText: {
    ...Typography.body,
    fontWeight: '500',
  },
  categoryRowCount: {
    ...Typography.small,
    marginTop: Spacing.xxs,
  },
  categoryRowDelete: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  cleanGridContainer: {
    padding: 0,
  },
  listContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  gridItem: {
    width: '33.333%',
  },
  listItem: {
    width: '100%',
    minHeight: 160,
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  galleryItemImageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  galleryItemGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  deleteIconBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconShadow: Platform.select({
    android: {},
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 4,
    },
  }),
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  listImage: {
    width: 100,
    minHeight: 160,
  },
  gridInfo: {
    padding: Spacing.md,
  },
  listInfo: {
    flex: 1,
    padding: Spacing.md,
  },
  itemTitle: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  itemDescription: {
    ...Typography.caption,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  itemCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  itemCategoryText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Image Viewer Delete Button Style
  imageViewerDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 63, 94, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.h2,
    fontSize: 20,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
  },
  imagePlaceholderText: {
    marginTop: Spacing.sm,
    ...Typography.body,
    fontWeight: '500',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  inputLabel: {
    ...Typography.label,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  categorySelector: {
    marginBottom: Spacing.lg,
  },
  categoryOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  activeCategoryOption: {
  },
  categoryOptionText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  activeCategoryOptionText: {
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadows.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.bodyBold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  emptyState: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
  },
});