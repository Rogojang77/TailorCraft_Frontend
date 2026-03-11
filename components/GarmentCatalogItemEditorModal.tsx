import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { X, Camera, Trash2, Palette } from 'lucide-react-native';
import { ColorPickerModal } from '@/components/ColorPickerModal';
import * as ImagePicker from 'expo-image-picker';
import {
  modalEntering,
  modalEnteringReducedMotion,
  modalExiting,
} from '@/constants/modalAnimation';
import type {
  GarmentCatalogItem,
  CreateGarmentCatalogItemRequest,
  UpdateGarmentCatalogItemRequest,
} from '@/types/catalog';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';
import { uploadImage } from '@/lib/api';

export interface GarmentCatalogItemEditorModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initial?: GarmentCatalogItem | null;
  suggestedSortOrder?: number;
  onSubmit: (
    payload: CreateGarmentCatalogItemRequest | UpdateGarmentCatalogItemRequest
  ) => Promise<void>;
}

function parseHex(hex: string): string | null {
  const s = hex.replace(/^#/, '').trim();
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return '#' + s;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[0]! + s[0];
    const g = s[1]! + s[1];
    const b = s[2]! + s[2];
    return '#' + r + g + b;
  }
  return null;
}

export function GarmentCatalogItemEditorModal({
  visible,
  onClose,
  mode,
  initial,
  suggestedSortOrder,
  onSubmit,
}: GarmentCatalogItemEditorModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [color, setColor] = useState('');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && initial) {
      setName(initial.name ?? '');
      setCode(initial.code ?? '');
      setDescription(initial.description ?? '');
      setImageUrl(initial.imageUrl ?? null);
      setColor(initial.color ?? '');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setImageUrl(null);
      setColor('');
    }
  }, [visible, mode, initial]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          const url = await uploadImage(result.assets[0].uri);
          setImageUrl(url);
        } catch (e) {
          Alert.alert(
            t('common.error'),
            e instanceof Error ? e.message : t('catalog.imageUploadError')
          );
        } finally {
          setUploading(false);
        }
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('catalog.imagePickerError'));
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), t('catalog.enterItemName'));
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        const payload: CreateGarmentCatalogItemRequest = {
          name: trimmedName,
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl ?? undefined,
          color: color.trim() || undefined,
          sortOrder: suggestedSortOrder ?? 0,
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateGarmentCatalogItemRequest = {
          name: trimmedName,
          code: code.trim() || null,
          description: description.trim() || null,
          imageUrl: imageUrl,
          color: color.trim() || null,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (e) {
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('catalog.saveItemError')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, styles.centered, { backgroundColor: colors.overlay }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View
          entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
          exiting={modalExiting}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {mode === 'add' ? t('catalog.addItem') : t('catalog.editItem')}
            </Text>
            <Button variant="ghost" onPress={onClose} accessibilityLabel={t('common.close')}>
              <X size={24} color={colors.textPrimary} />
            </Button>
          </View>
          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <Input
                label={t('catalog.itemName')}
                value={name}
                onChangeText={setName}
                placeholder={t('catalog.itemNamePlaceholder')}
                autoCapitalize="words"
                autoCorrect={false}
                containerStyle={styles.inputInField}
              />
            </View>
            <View style={styles.field}>
              <Input
                label={t('catalog.itemCode')}
                value={code}
                onChangeText={setCode}
                placeholder={t('catalog.itemCodePlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.inputInField}
              />
            </View>
            <View style={styles.field}>
              <Input
                label={t('catalog.itemDescription')}
                value={description}
                onChangeText={setDescription}
                placeholder={t('catalog.itemDescriptionPlaceholder')}
                multiline
                numberOfLines={2}
                containerStyle={styles.inputInField}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('catalog.itemImage')}
              </Text>
              <View style={styles.imageRow}>
                {imageUrl ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={[styles.removeImageBtn, { backgroundColor: colors.error }]}
                      onPress={handleRemoveImage}
                    >
                      <Trash2 size={16} color={colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.imagePlaceholder, { borderColor: colors.border }]}
                    onPress={handlePickImage}
                    disabled={uploading}
                  >
                    <Camera size={24} color={colors.textTertiary} />
                    <Text style={[styles.imagePlaceholderText, { color: colors.textTertiary }]}>
                      {uploading ? t('common.uploading') : t('catalog.addImage')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('catalog.itemColor')}
              </Text>
              <TouchableOpacity
                style={[styles.colorPickerTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setColorPickerVisible(true)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.colorSwatchTrigger,
                    { borderColor: colors.border },
                    color && parseHex(color)
                      ? { backgroundColor: color }
                      : { backgroundColor: colors.borderLight },
                  ]}
                >
                  {!color && <Palette size={20} color={colors.textTertiary} />}
                </View>
                <Text
                  style={[
                    styles.colorValueText,
                    { color: colors.textPrimary },
                    !color && { color: colors.textTertiary },
                  ]}
                >
                  {color || t('catalog.selectColor')}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting || uploading}
              loading={submitting}
              style={styles.saveBtn}
            >
              {mode === 'add' ? t('common.add') : t('common.save')}
            </Button>
          </KeyboardAwareScrollView>
        </Animated.View>

        <ColorPickerModal
          visible={colorPickerVisible}
          initialColor={color || '#ff0000'}
          title={t('catalog.itemColor')}
          onClose={() => setColorPickerVisible(false)}
          onSelect={(hex) => setColor(hex)}
          allowNone
          hexPlaceholder={t('catalog.customColorPlaceholder')}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: BorderRadius.lg,
    ...Typography.body,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
  },
  scroll: {
    maxHeight: 500,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  inputInField: {
    marginBottom: 0,
  },
  imageRow: {
    flexDirection: 'row',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  colorPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  colorSwatchTrigger: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorValueText: {
    ...Typography.body,
    flex: 1,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
