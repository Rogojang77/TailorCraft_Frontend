import React, { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Grid3X3, List, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api, apiFetch, uploadImage } from '@/lib/api';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

const { width } = Dimensions.get('window');
const gridPadding = 20;
const gridGap = 16;
const cardWidth = (width - gridPadding * 2 - gridGap) / 2;

// Helper to check if item is in right column (for grid spacing)
const isRightColumn = (index: number, numColumns: number) => {
  return (index + 1) % numColumns === 0;
};
const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300?text=Gallery+item';

const categories = [
  { id: 'toate', name: 'Toate' },
  { id: 'materiale', name: 'Materiale' },
  { id: 'revere', name: 'Revere' },
  { id: 'maneci', name: 'Mâneci' },
  { id: 'buzunare', name: 'Buzunare' },
  { id: 'nasturi', name: 'Nasturi' },
];

type GalleryItem = { id: string; title: string; category: string; image: string; description: string | null };

// Image Viewer Component
const ImageViewer = memo<{
  visible: boolean;
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
  onDeleteRequest: (item: GalleryItem) => void;
}>(({ visible, items, initialIndex, onClose, onDeleteRequest }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentIndexRef = useRef(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      currentIndexRef.current = initialIndex;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      translateY.setValue(50);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    // Update ref when index changes
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const currentItem = items[currentIndex];

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!visible || !currentItem) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.imageViewerContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.imageViewerBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.imageViewerContent,
            {
              transform: [{ scale: scaleAnim }, { translateY }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.imageViewerCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.imageViewerDeleteBtn}
            onPress={() => {
              onClose();
              setTimeout(() => onDeleteRequest(currentItem), 300);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.imageViewerNavBtn, styles.imageViewerNavBtnLeft]}
              onPress={handlePrev}
            >
              <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          {currentIndex < items.length - 1 && (
            <TouchableOpacity
              style={[styles.imageViewerNavBtn, styles.imageViewerNavBtnRight]}
              onPress={handleNext}
            >
              <ChevronRight size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}

          {/* Image */}
          <View style={styles.imageViewerImageContainer}>
            <Image
              source={{ uri: currentItem.image }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          </View>

          {/* Info Panel */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
            style={styles.imageViewerInfoGradient}
          >
            <View style={styles.imageViewerInfo}>
              <Text style={styles.imageViewerTitle}>{currentItem.title}</Text>
              {currentItem.description && (
                <Text style={styles.imageViewerDescription}>{currentItem.description}</Text>
              )}
              <View style={styles.imageViewerCategory}>
                <Text style={styles.imageViewerCategoryText}>
                  {categories.find((c) => c.id === currentItem.category)?.name || currentItem.category}
                </Text>
              </View>
              {items.length > 1 && (
                <Text style={styles.imageViewerCounter}>
                  {currentIndex + 1} / {items.length}
                </Text>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

ImageViewer.displayName = 'ImageViewer';

// Memoized gallery item component to prevent unnecessary re-renders
// This reduces memory churn when scrolling through large lists
const GalleryItem = memo<{
  item: GalleryItem;
  viewMode: 'grid' | 'list';
  onDeleteRequest: (item: GalleryItem) => void;
  onView: (item: GalleryItem) => void;
}>(({ item, viewMode, onDeleteRequest, onView }) => {
  const handleDelete = useCallback((e: any) => {
    e.stopPropagation();
    onDeleteRequest(item);
  }, [item, onDeleteRequest]);

  const handlePress = useCallback(() => {
    onView(item);
  }, [item, onView]);

  return (
    <TouchableOpacity
      style={[viewMode === 'grid' ? styles.gridItem : styles.listItem]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.galleryItemImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={viewMode === 'grid' ? styles.gridImage : styles.listImage}
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
      <View style={viewMode === 'grid' ? styles.gridInfo : styles.listInfo}>
        <Text style={styles.itemTitle} numberOfLines={viewMode === 'grid' ? 1 : 2}>
          {item.title}
        </Text>
        {viewMode === 'list' && item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.itemCategoryBadge}>
          <Text style={styles.itemCategoryText}>
            {categories.find((c) => c.id === item.category)?.name || item.category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

GalleryItem.displayName = 'GalleryItem';

export default function GalleryTab() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeCategory, setActiveCategory] = useState('toate');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('materiale');
  const [newItemImage, setNewItemImage] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Use ref to track if component is mounted for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchGallery = useCallback(async (isRefresh = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const category = activeCategory === 'toate' ? undefined : activeCategory;
      const res = await apiFetch<{ items: Array<{ id: string; title: string; category: string; imageUrl: string; description: string | null }> }>(
        `${api.gallery()}?limit=100${category ? `&category=${encodeURIComponent(category)}` : ''}`
      );
      
      // Only update state if component is still mounted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        const items = (res.items ?? []).map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category,
          image: i.imageUrl,
          description: i.description,
        }));
        setGalleryItems(items);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        setGalleryItems([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeCategory]);

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
      if (isMountedRef.current) {
        fetchGallery();
      }
      return () => {
        // Cleanup on blur
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [fetchGallery])
  );

  useEffect(() => {
    if (isMountedRef.current) {
      fetchGallery();
    }
  }, [activeCategory, fetchGallery]);

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
      Alert.alert('Succes', 'Item-ul a fost șters.');
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut șterge item-ul.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisiune necesară', 'Avem nevoie de permisiunea pentru a accesa galeria foto.');
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
    if (!newItemTitle.trim() || !newItemDescription.trim()) {
      Alert.alert('Eroare', 'Te rugăm să completezi titlul și descrierea.');
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
          Alert.alert('Eroare', 'Nu s-a putut încărca imaginea. Încercați din nou.');
          setSaving(false);
          return;
        }
      }

      if (!imageUrl) {
        imageUrl = PLACEHOLDER_IMAGE;
      }

      await apiFetch(api.gallery(), {
        method: 'POST',
        body: JSON.stringify({
          title: newItemTitle.trim(),
          description: newItemDescription.trim() || undefined,
          category: newItemCategory,
          imageUrl,
        }),
      });
      // Clear form state to free memory
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemCategory('materiale');
      setNewItemImage(null);
      setShowAddModal(false);
      await fetchGallery(true);
      Alert.alert('Succes', 'Item-ul a fost adăugat cu succes!');
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut adăuga item-ul.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Galerie</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'grid' && styles.activeViewButton]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}
          >
            <Grid3X3 size={18} color={viewMode === 'grid' ? Colors.textInverse : Colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && styles.activeViewButton]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <List size={18} color={viewMode === 'list' ? Colors.textInverse : Colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddItem}
            activeOpacity={0.8}
          >
            <Plus size={20} color={Colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  activeCategory === category.id && styles.activeCategoryButton,
                ]}
                onPress={() => setActiveCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === category.id && styles.activeCategoryText,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
              {activeCategory === category.id && (
                <View style={styles.categoryIndicator} />
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Gallery Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      ) : galleryItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Niciun item în galerie.</Text>
        </View>
      ) : (
        <FlatList
          data={galleryItems}
          key={viewMode} // Force re-render when view mode changes
          numColumns={viewMode === 'grid' ? 2 : 1}
          keyExtractor={(item) => item.id}
          style={styles.content}
          contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          // Performance optimizations for FlatList
          windowSize={5} // Render 5 screens worth of items (reduces memory)
          initialNumToRender={viewMode === 'grid' ? 6 : 10} // Render fewer items initially
          maxToRenderPerBatch={viewMode === 'grid' ? 4 : 8} // Render in smaller batches
          removeClippedSubviews={true} // Remove off-screen views from native hierarchy
          renderItem={({ item, index }) => (
            <View
              style={viewMode === 'grid' && !isRightColumn(index, 2) ? { marginRight: gridGap } : undefined}
            >
              <GalleryItem
                item={item}
                viewMode={viewMode}
                onDeleteRequest={handleDeleteRequest}
                onView={handleViewItem}
              />
            </View>
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adaugă Item Nou</Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={handlePickImage}
            >
              {newItemImage ? (
                <Image
                  source={{ uri: newItemImage }}
                  style={styles.pickedImage}
                  resizeMode="cover"
                  // Explicit dimensions prevent loading full-resolution images
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Plus size={32} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>Adaugă imagine</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Titlu</Text>
            <TextInput
              style={styles.input}
              placeholder="Introdu titlul item-ului"
              value={newItemTitle}
              onChangeText={setNewItemTitle}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Descriere</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Introdu descrierea item-ului"
              value={newItemDescription}
              onChangeText={setNewItemDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.inputLabel}>Categorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
              {categories.filter(c => c.id !== 'toate').map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    newItemCategory === category.id && styles.activeCategoryOption,
                  ]}
                  onPress={() => setNewItemCategory(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      newItemCategory === category.id && styles.activeCategoryOptionText,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveItem}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Salvează</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
        title="Șterge item"
        message={deleteTarget ? `Sigur ștergi „${deleteTarget.title}"?` : ''}
        confirmLabel="Șterge"
        loading={deleteLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    ...HeaderStyles.container,
  },
  title: {
    ...Typography.h2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
  },
  activeViewButton: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  addButton: {
    ...ButtonStyles.primaryIcon,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
  },
  categoriesWrapper: {
    marginBottom: 20,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  categoriesContainer: {
    marginBottom: 0,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryItem: {
    position: 'relative',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  activeCategoryButton: {
    backgroundColor: '#D4AF37',
  },
  categoryIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 3,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: gridPadding,
    paddingBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridItem: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: gridGap,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  gridImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  listImage: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  gridInfo: {
    padding: 16,
  },
  listInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  itemDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  itemCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  itemCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Image Viewer Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
  },
  imageViewerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageViewerContent: {
    flex: 1,
    position: 'relative',
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  imageViewerDeleteBtn: {
    position: 'absolute',
    top: 50,
    right: 72,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 63, 94, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerNavBtn: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
  },
  imageViewerNavBtnLeft: {
    left: 20,
  },
  imageViewerNavBtnRight: {
    right: 20,
  },
  imageViewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 200,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width,
  },
  imageViewerInfoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  imageViewerInfo: {
    paddingBottom: 20,
  },
  imageViewerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  imageViewerDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 16,
  },
  imageViewerCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginBottom: 12,
  },
  imageViewerCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  imageViewerCounter: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB', // Placeholder color while loading
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categorySelector: {
    marginBottom: 20,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeCategoryOption: {
    backgroundColor: '#D4AF37',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeCategoryOptionText: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});