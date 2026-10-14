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
import { KeyboardAwareScrollView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
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
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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
      <KeyboardAvoidingView behavior="padding" style={[styles.overlay, styles.centered, { backgroundColor: colors.overlay }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View
          entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
          exiting={modalExiting}
          style={[styles.card, { backgroundColor: colors.card }]}
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
                      style={[styles.removeImageBtn, { backgroundColor: colors.ember ?? colors.error }]}
                      onPress={handleRemoveImage}
                    >
                      <Trash2 size={16} color={colors.paper ?? '#EFE9DC'} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.imagePlaceholder, { borderColor: colors.rule ?? colors.border }]}
                    onPress={handlePickImage}
                    disabled={uploading}
                  >
                    <Camera size={24} color={colors.ink4 ?? colors.textTertiary} />
                    <Text style={[styles.imagePlaceholderText, { color: colors.ink4 ?? colors.textTertiary }]}>
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
                style={[styles.colorPickerTrigger, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]}
                onPress={() => setColorPickerVisible(true)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.colorSwatchTrigger,
                    { borderColor: colors.rule ?? colors.border },
                    color && parseHex(color)
                      ? { backgroundColor: color }
                      : { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border },
                  ]}
                >
                  {!color && <Palette size={20} color={colors.ink4 ?? colors.textTertiary} />}
                </View>
                <Text
                  style={[
                    styles.colorValueText,
                    { color: colors.textPrimary },
                    !color && { color: colors.ink4 ?? colors.textTertiary },
                  ]}
                >
                  {color || t('catalog.selectColor')}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
          <View style={[styles.footer, { borderTopColor: colors.rule ?? colors.border }]}>
            <Button
              variant="secondary"
              onPress={onClose}
              disabled={submitting || uploading}
              style={styles.footerCancelBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={submitting || uploading}
              loading={submitting}
              style={styles.footerSaveBtn}
            >
              {mode === 'add' ? t('common.add') : t('common.save')}
            </Button>
          </View>
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
      </KeyboardAvoidingView>
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
    padding: AtelierSpacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: AtelierRadius.lg,
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  scroll: {
    maxHeight: 500,
  },
  scrollContent: {
    padding: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.lg,
  },
  field: {
    marginBottom: AtelierSpacing.lg,
  },
  label: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.xs,
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
    borderRadius: AtelierRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.xs,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: AtelierRadius.md,
    resizeMode: 'contain',
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
    ...AtelierShadow.card,
  },
  colorPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
    gap: AtelierSpacing.md,
  },
  colorSwatchTrigger: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorValueText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: AtelierSpacing.md,
    padding: AtelierSpacing.lg,
    borderTopWidth: 1,
  },
  footerCancelBtn: {
    flex: 1,
  },
  footerSaveBtn: {
    flex: 1,
  },
});
