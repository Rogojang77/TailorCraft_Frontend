import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ImagePlus, PencilLine, Save, Trash2 } from 'lucide-react-native';
import { api, apiFetch, getLocalizedApiMessage, resolveUploadUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierRadius, AtelierShadow, AtelierSpacing } from '@/constants/atelierDesign';
import {
  loadSavedSketchImports,
  removeSavedSketchImport,
  saveImportedSketch,
  type SavedSketchImport,
} from '@/lib/order/sketchImportLibrary';

type OrderSketchItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  imageUrl: string;
  createdAt?: string;
};

interface OrderSketchStepSectionProps {
  customerId?: string;
  currentOrderId?: string;
  sketchDraftUri?: string;
  onOpenDrawing: () => void;
  onSetSketchUri: (uri: string | undefined) => void;
}

const PAST_SKETCH_CACHE_DIR = `${FileSystem.cacheDirectory}order-sketches/`;

async function ensurePastSketchCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PAST_SKETCH_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PAST_SKETCH_CACHE_DIR, { intermediates: true });
  }
}

export function OrderSketchStepSection({
  customerId,
  currentOrderId,
  sketchDraftUri,
  onOpenDrawing,
  onSetSketchUri,
}: OrderSketchStepSectionProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [pastSketches, setPastSketches] = useState<OrderSketchItem[]>([]);
  const [savedImports, setSavedImports] = useState<SavedSketchImport[]>([]);
  const [pastModalOpen, setPastModalOpen] = useState(false);
  const [savedModalOpen, setSavedModalOpen] = useState(false);

  const hasSavedDraft = Boolean(sketchDraftUri);

  const loadSavedImports = useCallback(async () => {
    const saved = await loadSavedSketchImports();
    setSavedImports(saved);
  }, []);

  const loadPastSketches = useCallback(async () => {
    if (!customerId) {
      setPastSketches([]);
      return;
    }

    setIsLoadingPast(true);
    try {
      const response = await apiFetch<{
        orders: {
          id: string;
          orderNumber: string;
          orderDate: string;
          sketches?: { id: string; imageUrl: string; title?: string | null; createdAt?: string }[];
        }[];
      }>(`${api.customerOrders(customerId)}?limit=50`);

      const flattened: OrderSketchItem[] = [];
      for (const order of response.orders ?? []) {
        if (currentOrderId && order.id === currentOrderId) continue;
        for (const sketch of order.sketches ?? []) {
          if (!sketch.imageUrl) continue;
          flattened.push({
            id: sketch.id,
            orderId: order.id,
            orderNumber: order.orderNumber,
            imageUrl: sketch.imageUrl,
            createdAt: sketch.createdAt ?? order.orderDate,
          });
        }
      }
      setPastSketches(flattened);
    } catch (error) {
      const msg = getLocalizedApiMessage(error, t, t('newOrder.measurements.sketch.loadPastError'));
      Alert.alert(t('common.error'), msg);
    } finally {
      setIsLoadingPast(false);
    }
  }, [customerId, currentOrderId, t]);

  useEffect(() => {
    void loadSavedImports();
  }, [loadSavedImports]);

  useEffect(() => {
    if (!customerId) return;
    void loadPastSketches();
  }, [customerId, loadPastSketches]);

  const openImageImport = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('newOrder.measurements.sketch.photoPermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const pickedUri = result.assets[0].uri;
    if (!pickedUri) return;
    onSetSketchUri(pickedUri);
  }, [onSetSketchUri, t]);

  const selectPastSketch = useCallback(
    async (item: OrderSketchItem) => {
      try {
        setIsLoadingPast(true);
        await ensurePastSketchCacheDir();
        const sourceUrl = resolveUploadUrl(item.imageUrl) ?? item.imageUrl;
        const ext = sourceUrl.includes('.png') ? 'png' : 'jpg';
        const target = `${PAST_SKETCH_CACHE_DIR}${item.id}-${Date.now()}.${ext}`;
        await FileSystem.downloadAsync(sourceUrl, target);
        onSetSketchUri(target);
        setPastModalOpen(false);
      } catch (error) {
        const msg = getLocalizedApiMessage(error, t, t('newOrder.measurements.sketch.selectPastError'));
        Alert.alert(t('common.error'), msg);
      } finally {
        setIsLoadingPast(false);
      }
    },
    [onSetSketchUri, t]
  );

  const saveCurrentToLibrary = useCallback(async () => {
    if (!sketchDraftUri) return;
    try {
      const next = await saveImportedSketch(sketchDraftUri);
      setSavedImports(next);
      Alert.alert(t('common.success'), t('newOrder.measurements.sketch.savedToLibrary'));
    } catch (error) {
      const msg = getLocalizedApiMessage(error, t, t('newOrder.measurements.sketch.saveLibraryError'));
      Alert.alert(t('common.error'), msg);
    }
  }, [sketchDraftUri, t]);

  const removeSavedItem = useCallback(
    async (id: string) => {
      try {
        const next = await removeSavedSketchImport(id);
        setSavedImports(next);
      } catch (error) {
        const msg = getLocalizedApiMessage(error, t, t('newOrder.measurements.sketch.removeLibraryError'));
        Alert.alert(t('common.error'), msg);
      }
    },
    [t]
  );

  const previewLabel = useMemo(() => {
    if (!sketchDraftUri) return t('newOrder.measurements.sketch.noSketchSelected');
    return t('newOrder.measurements.sketch.sketchSelected');
  }, [sketchDraftUri, t]);

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('newOrder.measurements.sketch.title')}
      </Text>
      <Text style={[styles.sectionHint, { color: colors.ink3 }]}>
        {t('newOrder.measurements.sketch.hint')}
      </Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={[styles.actionButton, { borderColor: colors.rule ?? colors.border }]} onPress={onOpenDrawing} activeOpacity={0.7}>
          <PencilLine size={18} color={colors.brass ?? colors.primary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>{t('newOrder.measurements.sketch.openDrawing')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { borderColor: colors.rule ?? colors.border }]} onPress={openImageImport} activeOpacity={0.7}>
          <ImagePlus size={18} color={colors.brass ?? colors.primary} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>{t('newOrder.measurements.sketch.importImage')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.rule ?? colors.border }, !customerId && styles.disabled]}
          onPress={() => setPastModalOpen(true)}
          activeOpacity={0.7}
          disabled={!customerId}
        >
          <Text style={[styles.actionText, { color: customerId ? colors.textPrimary : colors.ink4 ?? colors.textTertiary }]}>
            {t('newOrder.measurements.sketch.fromPastOrders')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.rule ?? colors.border }, savedImports.length === 0 && styles.disabled]}
          onPress={() => setSavedModalOpen(true)}
          activeOpacity={0.7}
          disabled={savedImports.length === 0}
        >
          <Text style={[styles.actionText, { color: savedImports.length > 0 ? colors.textPrimary : colors.ink4 ?? colors.textTertiary }]}>
            {t('newOrder.measurements.sketch.fromSavedImports')}
          </Text>
        </TouchableOpacity>
      </View>

      {!!sketchDraftUri && (
        <View style={[styles.previewWrap, { borderColor: colors.rule ?? colors.border }]}>
          <Image source={{ uri: sketchDraftUri }} style={styles.previewImage} resizeMode="cover" />
          <Text style={[styles.previewLabel, { color: colors.ink3 }]}>{previewLabel}</Text>
        </View>
      )}
      {!sketchDraftUri && (
        <Text style={[styles.previewLabel, { color: colors.ink3 }]}>{previewLabel}</Text>
      )}

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.smallAction, { borderColor: colors.rule ?? colors.border }, !hasSavedDraft && styles.disabled]}
          onPress={saveCurrentToLibrary}
          disabled={!hasSavedDraft}
          activeOpacity={0.7}
        >
          <Save size={16} color={hasSavedDraft ? colors.brass ?? colors.primary : colors.ink4 ?? colors.textTertiary} />
          <Text style={[styles.smallActionText, { color: hasSavedDraft ? colors.textPrimary : colors.ink4 ?? colors.textTertiary }]}>
            {t('newOrder.measurements.sketch.saveCurrentImport')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.smallAction, { borderColor: colors.rule ?? colors.border }, !hasSavedDraft && styles.disabled]}
          onPress={() => onSetSketchUri(undefined)}
          disabled={!hasSavedDraft}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={hasSavedDraft ? colors.ember ?? colors.error : colors.ink4 ?? colors.textTertiary} />
          <Text style={[styles.smallActionText, { color: hasSavedDraft ? colors.textPrimary : colors.ink4 ?? colors.textTertiary }]}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pastModalOpen} animationType="slide" onRequestClose={() => setPastModalOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.paper ?? colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('newOrder.measurements.sketch.fromPastOrders')}</Text>
          <ScrollView contentContainerStyle={styles.modalList}>
            {isLoadingPast && (
              <Text style={[styles.modalEmptyText, { color: colors.ink3 }]}>{t('common.loading')}</Text>
            )}
            {!isLoadingPast && pastSketches.length === 0 && (
              <Text style={[styles.modalEmptyText, { color: colors.ink3 }]}>{t('newOrder.measurements.sketch.noPastSketches')}</Text>
            )}
            {!isLoadingPast &&
              pastSketches.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.modalRow, { borderColor: colors.rule ?? colors.border }]}
                  onPress={() => void selectPastSketch(item)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: resolveUploadUrl(item.imageUrl) ?? item.imageUrl }} style={styles.modalRowImage} />
                  <View style={styles.modalRowTextWrap}>
                    <Text style={[styles.modalRowTitle, { color: colors.textPrimary }]}>{item.orderNumber}</Text>
                    <Text style={[styles.modalRowMeta, { color: colors.ink3 }]}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
          <TouchableOpacity style={[styles.closeButton, { borderColor: colors.rule ?? colors.border }]} onPress={() => setPastModalOpen(false)} activeOpacity={0.7}>
            <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={savedModalOpen} animationType="slide" onRequestClose={() => setSavedModalOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.paper ?? colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('newOrder.measurements.sketch.fromSavedImports')}</Text>
          <ScrollView contentContainerStyle={styles.modalList}>
            {savedImports.length === 0 && (
              <Text style={[styles.modalEmptyText, { color: colors.ink3 }]}>{t('newOrder.measurements.sketch.noSavedImports')}</Text>
            )}
            {savedImports.map((item) => (
              <View key={item.id} style={[styles.modalRow, { borderColor: colors.rule ?? colors.border }]}>
                <TouchableOpacity style={styles.savedSelectWrap} onPress={() => { onSetSketchUri(item.localUri); setSavedModalOpen(false); }} activeOpacity={0.7}>
                  <Image source={{ uri: item.localUri }} style={styles.modalRowImage} />
                  <View style={styles.modalRowTextWrap}>
                    <Text style={[styles.modalRowTitle, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.modalRowMeta, { color: colors.ink3 }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void removeSavedItem(item.id)} style={styles.removeButton} activeOpacity={0.7}>
                  <Trash2 size={16} color={colors.ember ?? colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.closeButton, { borderColor: colors.rule ?? colors.border }]} onPress={() => setSavedModalOpen(false)} activeOpacity={0.7}>
            <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: AtelierSpacing.md,
    marginTop: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.sm,
    padding: AtelierSpacing.md,
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    ...AtelierShadow.card,
  },
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  sectionHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.xs,
    marginBottom: AtelierSpacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.xs,
  },
  actionText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  previewWrap: {
    marginTop: AtelierSpacing.sm,
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 140,
  },
  previewLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.xs,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    marginTop: AtelierSpacing.sm,
  },
  smallAction: {
    flex: 1,
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    paddingVertical: AtelierSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.xs,
  },
  smallActionText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    padding: AtelierSpacing.xs,
  },
  disabled: {
    opacity: 0.55,
  },
  modalRoot: {
    flex: 1,
    paddingTop: 50 + AtelierSpacing.xxl,
    paddingHorizontal: AtelierSpacing.md,
    paddingBottom: 20 + AtelierSpacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.md,
  },
  modalList: {
    gap: AtelierSpacing.sm,
    paddingBottom: AtelierSpacing.md,
  },
  modalEmptyText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: AtelierSpacing.lg,
  },
  modalRow: {
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  savedSelectWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  modalRowImage: {
    width: 58,
    height: 58,
    borderRadius: AtelierRadius.sm,
    backgroundColor: '#ddd',
  },
  modalRowTextWrap: {
    flex: 1,
  },
  modalRowTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  modalRowMeta: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  removeButton: {
    padding: AtelierSpacing.xs,
  },
  closeButton: {
    marginTop: AtelierSpacing.sm,
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  closeButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
});
