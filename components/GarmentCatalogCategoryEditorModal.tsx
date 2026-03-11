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
import { CATALOG_ICONS } from '@/types/catalog';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius } from '@/constants/design';

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

const ICON_OPTIONS = Object.entries(CATALOG_ICONS).map(([code, icon]) => ({
  code,
  icon,
}));

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
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
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
      setSelectedIcon(initial.icon ?? null);
    } else {
      setName('');
      setDescription('');
      setSelectedIcon(null);
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
          icon: selectedIcon ?? undefined,
          sortOrder: suggestedSortOrder ?? 0,
        };
        await onSubmit(payload);
      } else {
        const payload: UpdateGarmentCatalogCategoryRequest = {
          name: trimmedName,
          description: description.trim() || null,
          icon: selectedIcon,
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
          style={[styles.card, { backgroundColor: colors.surface }]}
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
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {t('catalog.categoryIcon')}
              </Text>
              <View style={styles.iconRow}>
                <TouchableOpacity
                  style={[
                    styles.iconChip,
                    { backgroundColor: colors.borderLight },
                    !selectedIcon && {
                      backgroundColor: colors.primaryLight + '60',
                      borderWidth: 1,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedIcon(null)}
                >
                  <Text
                    style={[
                      styles.iconChipText,
                      { color: colors.textSecondary },
                      !selectedIcon && { ...Typography.captionBold, color: colors.primary },
                    ]}
                  >
                    {t('common.none')}
                  </Text>
                </TouchableOpacity>
                {ICON_OPTIONS.map((opt) => {
                  const labelKey = `catalog.categories.${opt.code}`;
                  const label = t(labelKey) !== labelKey ? t(labelKey) : opt.code;
                  return (
                    <TouchableOpacity
                      key={opt.code}
                      style={[
                        styles.iconChip,
                        { backgroundColor: colors.borderLight },
                        selectedIcon === opt.icon && {
                          backgroundColor: colors.primaryLight + '60',
                          borderWidth: 1,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setSelectedIcon(opt.icon)}
                    >
                      <Text
                        style={[
                          styles.iconChipText,
                          { color: colors.textSecondary },
                          selectedIcon === opt.icon && {
                            ...Typography.captionBold,
                            color: colors.primary,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
              style={styles.saveBtn}
            >
              {mode === 'add' ? t('common.add') : t('common.save')}
            </Button>
          </KeyboardAwareScrollView>
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
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
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
    maxHeight: 400,
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
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  iconChipText: {
    ...Typography.caption,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
