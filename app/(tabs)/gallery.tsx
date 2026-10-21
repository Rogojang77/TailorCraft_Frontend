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
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierType, AtelierShadow } from '@/constants/atelierDesign';
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
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  }

  const itemCard = colors.card;
  const itemRuleColor = colors.rule ?? colors.border;
  const itemBrassColor = colors.brass;
  const itemInkColor = colors.textPrimary;
  const itemInk3 = colors.ink3 ?? colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: itemCard, borderColor: itemRuleColor }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.galleryItemImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={[styles.listImage, { backgroundColor: itemRuleColor }]}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.deleteIconBtn}
          onPress={handleDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.deleteIconShadow}>
            <Trash2 size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.itemTitle, { color: itemInkColor }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={[styles.itemDescription, { color: itemInk3 }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={[styles.itemCategoryBadge, { backgroundColor: `${itemBrassColor}18` }]}>
          <Text style={[styles.itemCategoryText, { color: itemBrassColor }]}>
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

  const bg = colors.paper;
  const inkColor = colors.textPrimary;
  const ink3 = colors.ink3 ?? colors.textSecondary;
  const ink4 = colors.ink4 ?? colors.textTertiary;
  const brassColor = colors.brass;
  const cardBg = colors.card;
  const ruleColor = colors.rule ?? colors.border;

  return (
    <ScreenContainer noPadding style={{ backgroundColor: bg }}>
      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.viewModeButtons}>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: viewMode === 'grid' ? brassColor : cardBg, borderColor: ruleColor }]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}
          >
            <Grid3X3 size={16} color={viewMode === 'grid' ? colors.paper : ink3} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: viewMode === 'list' ? brassColor : cardBg, borderColor: ruleColor }]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <List size={16} color={viewMode === 'list' ? colors.paper : ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: brassColor }]}
          onPress={handleAddItem}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Category dropdown */}
      <View style={[styles.categoriesWrapper, { borderBottomColor: ruleColor }]}>
        <TouchableOpacity
          style={[styles.categoryDropdownTrigger, { backgroundColor: cardBg, borderColor: ruleColor }]}
          onPress={() => setCategoryDropdownOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryDropdownTriggerText, { color: inkColor }]} numberOfLines={1}>
            {getFilterCategoryLabel(activeCategoryId)}
          </Text>
          <ChevronDown size={18} color={ink3} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.manageCategoriesBtn}
          onPress={() => { fetchCategories(); setShowCategoriesModal(true); }}
        >
          <FolderEdit size={16} color={brassColor} strokeWidth={2} />
          <Text style={[styles.manageCategoriesText, { color: brassColor }]}>{t('gallery.manageCategories')}</Text>
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
          <View style={[styles.categoryDropdownPanel, { backgroundColor: cardBg }]}>
            <ScrollView style={styles.categoryDropdownScroll} keyboardShouldPersistTaps="handled">
              {[ALL_CATEGORIES_ID, ...categories.map((c) => c.id)].map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.categoryDropdownOption,
                    activeCategoryId === id && [styles.categoryDropdownOptionActive, { backgroundColor: `${brassColor}18` }],
                  ]}
                  onPress={() => {
                    setActiveCategoryId(id);
                    setCategoryDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryDropdownOptionText,
                      { color: inkColor },
                      activeCategoryId === id && [styles.categoryDropdownOptionTextActive, { color: brassColor }],
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
          <Text style={[styles.emptyText, { color: ink3 }]}>{t('gallery.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={galleryItems}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 3 : 1}
          keyExtractor={(item) => item.id}
          style={styles.content}
          contentContainerStyle={viewMode === 'grid' ? styles.cleanGridContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brassColor} />
          }
          windowSize={5}
          initialNumToRender={viewMode === 'grid' ? 6 : 10}
          maxToRenderPerBatch={viewMode === 'grid' ? 4 : 8}
          removeClippedSubviews={true}
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
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: ruleColor }]}>
            <Text style={[styles.modalTitle, { color: inkColor }]}>{t('gallery.addItem')}</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeButton}>
              <X size={22} color={inkColor} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {newItemImage ? (
                <Image
                  source={{ uri: newItemImage }}
                  style={[styles.pickedImage, { backgroundColor: ruleColor }]}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: cardBg, borderColor: ruleColor }]}>
                  <Plus size={28} color={ink4} />
                  <Text style={[styles.imagePlaceholderText, { color: ink4 }]}>{t('gallery.addImage')}</Text>
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

            <Text style={[styles.inputLabel, { color: ink3 }]}>{t('gallery.categoryLabel')}</Text>
            {categories.length === 0 ? (
              <Text style={[styles.noCategoriesHint, { color: ink3 }]}>{t('gallery.createCategoryFirst')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: newItemCategoryId === c.id ? brassColor : cardBg, borderColor: ruleColor },
                    ]}
                    onPress={() => setNewItemCategoryId(c.id)}
                  >
                    <Text style={[styles.categoryOptionText, { color: newItemCategoryId === c.id ? colors.paper : ink3 }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: brassColor }, saving && styles.saveButtonDisabled]}
              onPress={handleSaveItem}
              disabled={saving}
            >
              {saving ? (
                <InlineSpinner variant="inverse" />
              ) : (
                <Text style={styles.saveButtonText}>{t('gallery.save')}</Text>
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
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: ruleColor }]}>
            <Text style={[styles.modalTitle, { color: inkColor }]}>{t('gallery.manageCategories')}</Text>
            <TouchableOpacity onPress={() => setShowCategoriesModal(false)} style={styles.closeButton}>
              <X size={22} color={inkColor} />
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
                <Text style={[styles.cancelEditText, { color: brassColor }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.inputLabel, { color: ink3 }]}>{t('gallery.yourCategories')}</Text>
            {categories.length === 0 ? (
              <Text style={[styles.noCategoriesHint, { color: ink3 }]}>{t('gallery.noCategoriesYet')}</Text>
            ) : (
              categories.map((c) => (
                <View key={c.id} style={[styles.categoryRow, { borderBottomColor: ruleColor }]}>
                  <TouchableOpacity
                    style={styles.categoryRowName}
                    onPress={() => {
                      setCategoryEditId(c.id);
                      setCategoryNameInput(c.name);
                    }}
                  >
                    <Text style={[styles.categoryRowNameText, { color: inkColor }]}>{c.name}</Text>
                    {c.itemCount != null && c.itemCount > 0 && (
                      <Text style={[styles.categoryRowCount, { color: ink4 }]}>{c.itemCount}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.categoryRowDelete}
                    onPress={() => setCategoryDeleteTarget(c)}
                    disabled={(c.itemCount ?? 0) > 0}
                  >
                    <Trash2 size={16} color={(c.itemCount ?? 0) > 0 ? ink4 : colors.ember} strokeWidth={2} />
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
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.sm,
  },
  viewModeButtons: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeViewButton: {},
  addButton: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesWrapper: {
    paddingBottom: AtelierSpacing.sm,
    paddingTop: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.pagePad,
    borderBottomWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  categoryDropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    minHeight: 38,
  },
  categoryDropdownTriggerText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    flex: 1,
  },
  categoryDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: AtelierSpacing.lg,
  },
  categoryDropdownPanel: {
    borderRadius: AtelierRadius.lg,
    maxHeight: 320,
    ...AtelierShadow.elevated,
  },
  categoryDropdownScroll: { maxHeight: 320 },
  categoryDropdownOption: {
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.sm,
  },
  categoryDropdownOptionActive: {},
  categoryDropdownOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  categoryDropdownOptionTextActive: {
    fontFamily: FontFamily.sansSemiBold,
  },
  manageCategoriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.sm,
  },
  manageCategoriesText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  noCategoriesHint: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: AtelierSpacing.md,
  },
  categoryFormRow: {
    flexDirection: 'row',
    gap: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
  },
  categoryInput: { flex: 1, marginBottom: 0 },
  categorySubmitText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  cancelEditBtn: {
    alignSelf: 'flex-start',
    marginBottom: AtelierSpacing.md,
  },
  cancelEditText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
  },
  categoryRowName: { flex: 1 },
  categoryRowNameText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
  },
  categoryRowCount: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    marginTop: 2,
  },
  categoryRowDelete: { padding: 8 },
  content: { flex: 1 },
  cleanGridContainer: { padding: 0 },
  listContainer: {
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingVertical: AtelierSpacing.md,
  },
  gridItem: { width: '33.333%' },
  listItem: {
    width: '100%',
    minHeight: 140,
    flexDirection: 'row',
    borderRadius: AtelierRadius.lg,
    marginBottom: AtelierSpacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    ...AtelierShadow.card,
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
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconShadow: Platform.select({
    android: {},
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
      elevation: 3,
    },
  }),
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  listImage: {
    width: 90,
    minHeight: 140,
  },
  gridInfo: { padding: AtelierSpacing.sm },
  listInfo: {
    flex: 1,
    padding: AtelierSpacing.md,
    gap: 4,
  },
  itemTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  itemDescription: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  itemCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: AtelierRadius.xs,
  },
  itemCategoryText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  imageViewerDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(162, 62, 46, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingVertical: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
  },
  closeButton: { padding: 4 },
  modalContent: {
    flex: 1,
    padding: AtelierSpacing.pagePad,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: AtelierRadius.md,
    marginBottom: AtelierSpacing.lg,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: AtelierRadius.md,
    gap: AtelierSpacing.sm,
  },
  imagePlaceholderText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  inputLabel: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: AtelierSpacing.sm,
    marginTop: AtelierSpacing.sm,
  },
  categorySelector: { marginBottom: AtelierSpacing.lg },
  categoryOption: {
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: 6,
    borderRadius: AtelierRadius.xs,
    borderWidth: 1,
    marginRight: AtelierSpacing.sm,
  },
  activeCategoryOption: {},
  categoryOptionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
  },
  activeCategoryOptionText: {},
  saveButton: {
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    alignItems: 'center',
    marginTop: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.lg,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#EFE9DC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.xl,
  },
  loadingText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    marginTop: AtelierSpacing.md,
  },
  emptyState: {
    paddingVertical: AtelierSpacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
  },
});