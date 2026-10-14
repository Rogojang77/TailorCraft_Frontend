import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import {
  modalEntering,
  modalEnteringReducedMotion,
  modalExiting,
} from '@/constants/modalAnimation';
import type {
  GarmentCatalogCategory,
  CreateGarmentCatalogCategoryRequest,
  UpdateGarmentCatalogCategoryRequest,
} from '@/types/catalog';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

export interface GarmentCatalogCategoryEditorModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initial?: GarmentCatalogCategory | null;
  existingCategories: GarmentCatalogCategory[];
  suggestedSortOrder?: number;
  onSubmit: (
    payload: CreateGarmentCatalogCategoryRequest | UpdateGarmentCatalogCategoryRequest
  ) => Promise<void>;
}

function nameToCode(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'category';
  let slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return 'category';
  if (!/^[a-z]/.test(slug)) slug = 'cat_' + slug;
  return slug;
}

function uniqueCode(baseCode: string, existingCodes: Set<string>): string {
  if (!existingCodes.has(baseCode)) return baseCode;
  let n = 1;
  while (existingCodes.has(`${baseCode}_${n}`)) n++;
  return `${baseCode}_${n}`;
}

export function GarmentCatalogCategoryEditorModal({
  visible,
  onClose,
  mode,
  initial,
  existingCategories,
  suggestedSortOrder,
  onSubmit,
}: GarmentCatalogCategoryEditorModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const existingCodes = React.useMemo(() => {
    const codes = new Set<string>();
    for (const c of existingCategories) {
      if (c.code && (!initial || c.id !== initial.id)) {
        codes.add(c.code);
      }
    }
    return codes;
  }, [existingCategories, initial]);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && initial) {
      setName(initial.name ?? '');
      setDescription(initial.description ?? '');
    } else {
      setName('');
      setDescription('');
    }
  }, [visible, mode, initial]);

  const derivedCode = React.useMemo(() => {
    if (mode === 'edit' && initial) {
      return initial.code;
    }
    const base = nameToCode(name);
    return uniqueCode(base, existingCodes);
  }, [name, existingCodes, mode, initial]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), t('catalog.enterCategoryName'));
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        const payload: CreateGarmentCatalogCategoryRequest = {
          name: trimmedName,
          code: derivedCode,
          description: description.trim() || undefined,
          sortOrder: suggestedSortOrder ?? 0,
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateGarmentCatalogCategoryRequest = {
          name: trimmedName,
          description: description.trim() || null,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (e) {
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('catalog.saveCategoryError')
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
          style={[styles.card, { backgroundColor: colors.card }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {mode === 'add' ? t('catalog.addCategory') : t('catalog.editCategory')}
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
                label={t('catalog.categoryName')}
                value={name}
                onChangeText={setName}
                placeholder={t('catalog.categoryNamePlaceholder')}
                autoCapitalize="words"
                autoCorrect={false}
                containerStyle={styles.inputInField}
              />
            </View>
            <View style={styles.field}>
              <Input
                label={t('catalog.categoryDescription')}
                value={description}
                onChangeText={setDescription}
                placeholder={t('catalog.categoryDescriptionPlaceholder')}
                multiline
                numberOfLines={2}
                containerStyle={styles.inputInField}
              />
            </View>
          </KeyboardAwareScrollView>
          <View style={[styles.footer, { borderTopColor: colors.rule ?? colors.border }]}>
            <Button
              variant="secondary"
              onPress={onClose}
              disabled={submitting}
              style={styles.footerCancelBtn}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
              style={styles.footerSaveBtn}
            >
              {mode === 'add' ? t('common.add') : t('common.save')}
            </Button>
          </View>
        </Animated.View>
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
    padding: AtelierSpacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
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
    maxHeight: 400,
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
