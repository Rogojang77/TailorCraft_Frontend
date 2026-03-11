import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Sparkles, RefreshCw, ZoomIn, FileText, ChevronDown, ChevronUp, Edit3, X } from 'lucide-react-native';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import * as FileSystem from 'expo-file-system/legacy';
import { api, apiFetch, ApiError, getLocalizedApiMessage, resolveUploadUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/Button';
import { PaywallModal } from '@/components/subscription';
import { Section } from '@/components/ui/Section';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';
import type {
  GeneratePreviewResponse,
  GetPreviewResponse,
  GeneratePreviewErrorResponse,
} from '@/types/aiPreview';

interface AiPreviewSectionProps {
  orderId: string;
  orderStatus: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDIT_MODAL_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

const CACHE_DIR = `${FileSystem.cacheDirectory}ai-previews/`;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function ensureCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function getCachedImage(orderId: string): Promise<{ uri: string; createdAt: string } | null> {
  try {
    await ensureCacheDir();
    const cacheFile = `${CACHE_DIR}order-${orderId}.json`;
    const fileInfo = await FileSystem.getInfoAsync(cacheFile);
    
    if (!fileInfo.exists) return null;
    
    const cacheData = await FileSystem.readAsStringAsync(cacheFile);
    const { imageUri, timestamp, createdAt } = JSON.parse(cacheData);
    
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      await FileSystem.deleteAsync(cacheFile, { idempotent: true });
      return null;
    }
    
    const imageInfo = await FileSystem.getInfoAsync(imageUri);
    if (!imageInfo.exists) return null;
    
    return { uri: imageUri, createdAt };
  } catch {
    return null;
  }
}

async function cacheImage(orderId: string, remoteUrl: string, createdAt: string): Promise<string> {
  await ensureCacheDir();

  const extension = remoteUrl.includes('.png') ? 'png' : 'jpg';
  const localUri = `${CACHE_DIR}order-${orderId}.${extension}`;

  const fullUrl = resolveUploadUrl(remoteUrl) ?? remoteUrl;

  await FileSystem.downloadAsync(fullUrl, localUri);

  const cacheFile = `${CACHE_DIR}order-${orderId}.json`;
  await FileSystem.writeAsStringAsync(
    cacheFile,
    JSON.stringify({ imageUri: localUri, timestamp: Date.now(), createdAt })
  );

  return localUri;
}

async function invalidateCache(orderId: string): Promise<void> {
  try {
    const cacheFile = `${CACHE_DIR}order-${orderId}.json`;
    await FileSystem.deleteAsync(cacheFile, { idempotent: true });
    const ext = ['.png', '.jpg', '.jpeg'];
    for (const e of ext) {
      await FileSystem.deleteAsync(`${CACHE_DIR}order-${orderId}${e}`, { idempotent: true });
    }
  } catch {
    // ignore
  }
}

function formatPreviewDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AiPreviewSection({ orderId, orderStatus }: AiPreviewSectionProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { upgradeToPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [previewCreatedAt, setPreviewCreatedAt] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [editPromptVisible, setEditPromptVisible] = useState(false);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  const isDraft = orderStatus === 'DRAFT';
  const canGenerate = !isDraft;

  const fetchExistingPreview = useCallback(async (skipCache = false, silent = false) => {
    if (!silent) setFetching(true);
    try {
      if (skipCache) await invalidateCache(orderId);
      const cached = skipCache ? null : await getCachedImage(orderId);
      if (cached) {
        setImageUri(cached.uri);
        setPreviewCreatedAt(cached.createdAt);
        if (!silent) setFetching(false);
        return;
      }

      const response = await apiFetch<GetPreviewResponse>(
        `${api.ai.generatePreview}?orderId=${orderId}`
      );

      if (response.success && response.preview) {
        const localUri = await cacheImage(
          orderId,
          response.preview.imageUrl,
          response.preview.createdAt
        );
        setImageUri(localUri);
        setPreviewCreatedAt(response.preview.createdAt);
        setPrompt(response.preview.prompt ?? null);
      } else {
        setPrompt(null);
      }
    } catch {
      setPrompt(null);
    } finally {
      if (!silent) setFetching(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchExistingPreview();
  }, [fetchExistingPreview]);

  const generatePreview = useCallback(async (customPrompt?: string) => {
    if (isDraft) {
      Alert.alert(
        t('common.error'),
        t('aiPreview.draftOrderMessage')
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: { orderId: string; prompt?: string } = { orderId };
      if (typeof customPrompt === 'string' && customPrompt.trim()) body.prompt = customPrompt.trim();
      const response = await apiFetch<GeneratePreviewResponse | GeneratePreviewErrorResponse>(
        api.ai.generatePreview,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      if ('error' in response && response.error === 'ORDER_INCOMPLETE') {
        const missing = response.missingFields ?? [];
        const message = missing.includes('garmentType')
          ? t('aiPreview.orderIncompleteNoGarment')
          : (response.message || t('errors.orderIncomplete'));
        throw new Error(message);
      }

      if ('success' in response && response.success && 'imageUrl' in response) {
        await invalidateCache(orderId);
        const localUri = await cacheImage(orderId, response.imageUrl, response.createdAt);
        setImageUri(localUri);
        setPreviewCreatedAt(response.createdAt);
        // Fetch prompt from API without invalidating cache (so the image we just saved stays valid)
        try {
          const getRes = await apiFetch<GetPreviewResponse>(
            `${api.ai.generatePreview}?orderId=${orderId}`
          );
          if (getRes.success && getRes.preview) {
            setPrompt(getRes.preview.prompt ?? null);
          }
        } catch {
          // ignore; image and date are already set
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setShowPaywall(true);
        setError(null);
      } else {
        const message = getLocalizedApiMessage(e, t, t('aiPreview.generationFailed'));
        setError(message);
        if (e instanceof ApiError) {
          if (e.status === 504) {
            Alert.alert(t('aiPreview.timeout'), t('aiPreview.timeoutMessage'));
          } else if (e.status === 400) {
            Alert.alert(t('common.error'), message);
          } else {
            Alert.alert(t('common.error'), message);
          }
        } else {
          Alert.alert(t('common.error'), message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, isDraft, t]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      t('aiPreview.regenerateTitle'),
      t('aiPreview.regenerateMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('aiPreview.regenerate'), onPress: () => generatePreview() },
      ]
    );
  }, [generatePreview, t]);

  const openEditPrompt = useCallback(() => {
    setEditPromptValue(prompt ?? '');
    setEditPromptVisible(true);
  }, [prompt]);

  const savePrompt = useCallback(async () => {
    const value = editPromptValue.trim();
    if (!value) return;
    setSavingPrompt(true);
    try {
      await apiFetch(api.ai.generatePreview, {
        method: 'PATCH',
        body: JSON.stringify({ orderId, prompt: value }),
      });
      setPrompt(value);
      setEditPromptVisible(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setShowPaywall(true);
      } else {
        Alert.alert(t('common.error'), getLocalizedApiMessage(e, t, t('aiPreview.generationFailed')));
      }
    } finally {
      setSavingPrompt(false);
    }
  }, [orderId, editPromptValue, t]);

  const handleUpgrade = useCallback(async (plan: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    try {
      const result = await upgradeToPro(plan);
      if (result.success) setShowPaywall(false);
      else if (result.errorMessage) Alert.alert(t('common.error'), result.errorMessage);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('subscription.paywallCta'));
    } finally {
      setIsUpgrading(false);
    }
  }, [upgradeToPro, t]);

  const handleRegenerateWithPrompt = useCallback(() => {
    const value = (prompt ?? editPromptValue ?? '').trim();
    if (!value) {
      generatePreview();
      return;
    }
    Alert.alert(
      t('aiPreview.regenerateTitle'),
      t('aiPreview.regenerateMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('aiPreview.regenerate'), onPress: () => generatePreview(value) },
      ]
    );
  }, [generatePreview, prompt, editPromptValue, t]);

  if (fetching) {
    return (
      <Section title={t('aiPreview.sectionTitle')} style={styles.section}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.loadingContainer}>
            <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        </View>
      </Section>
    );
  }

  return (
    <Section title={t('aiPreview.sectionTitle')} style={styles.section}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {imageUri ? (
          <View style={styles.previewContainer}>
            <TouchableOpacity
              onPress={() => setFullscreenVisible(true)}
              activeOpacity={0.9}
              style={styles.imageWrapper}
            >
              <Image
                key={previewCreatedAt ?? imageUri}
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.zoomOverlay}>
                <ZoomIn size={20} color={colors.textInverse} />
              </View>
            </TouchableOpacity>
            
            {previewCreatedAt && (
              <Text style={[styles.createdAtText, { color: colors.textSecondary }]}>
                {t('aiPreview.generatedOn', { date: formatPreviewDate(previewCreatedAt) })}
              </Text>
            )}
            
            <View style={styles.previewActions}>
              <Button
                variant="secondary"
                size="sm"
                onPress={handleRegenerate}
                disabled={loading || !canGenerate}
                leftIcon={
                  loading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <RefreshCw size={16} color={canGenerate ? colors.primary : colors.textTertiary} />
                  )
                }
                style={styles.regenerateButton}
              >
                {loading ? t('aiPreview.generating') : t('aiPreview.regenerate')}
              </Button>
            </View>

            {(prompt != null && prompt !== '') && (
              <View style={[styles.promptBlock, { backgroundColor: colors.borderLight }]}>
                <TouchableOpacity
                  style={styles.promptHeader}
                  onPress={() => setPromptExpanded((e) => !e)}
                  activeOpacity={0.7}
                >
                  <FileText size={18} color={colors.textSecondary} />
                  <Text style={[styles.promptHeaderText, { color: colors.textPrimary }]}>
                    {t('aiPreview.promptLabel')}
                  </Text>
                  {promptExpanded ? (
                    <ChevronUp size={20} color={colors.textSecondary} />
                  ) : (
                    <ChevronDown size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
                {promptExpanded && (
                  <View style={styles.promptContent}>
                    <Text style={[styles.promptText, { color: colors.textSecondary }]} numberOfLines={10}>
                      {prompt}
                    </Text>
                    <View style={styles.promptActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={openEditPrompt}
                        leftIcon={<Edit3 size={14} color={colors.primary} />}
                        style={styles.promptActionButton}
                      >
                        {t('aiPreview.editPrompt')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={handleRegenerateWithPrompt}
                        disabled={loading || !canGenerate}
                        leftIcon={<RefreshCw size={14} color={canGenerate ? colors.primary : colors.textTertiary} />}
                        style={styles.promptActionButton}
                      >
                        {t('aiPreview.regenerateWithPrompt')}
                      </Button>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.primary }]}>{t('aiPreview.generating')}</Text>
                  <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>{t('aiPreview.generatingSubtext')}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                  <Sparkles size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('aiPreview.emptyTitle')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('aiPreview.emptySubtitle')}</Text>

                <Button
                  variant="primary"
                  size="md"
                  onPress={generatePreview}
                  disabled={!canGenerate || loading}
                  leftIcon={
                    <Sparkles
                      size={18}
                      color={colors.textInverse}
                    />
                  }
                  style={styles.generateButton}
                >
                  {t('aiPreview.generateButton')}
                </Button>
                
                {isDraft && (
                  <View style={[styles.disclaimerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.disclaimerHeader}>
                      <FileText size={18} color={colors.textSecondary} />
                      <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>{t('aiPreview.draftHint')}</Text>
                    </View>
                    <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>{t('aiPreview.draftDisclaimer')}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {error && !loading && (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.errorText }]}>{error}</Text>
          </View>
        )}

        <Modal
          visible={editPromptVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => !savingPrompt && setEditPromptVisible(false)}
        >
          <View style={styles.editModalRoot}>
            <TouchableWithoutFeedback onPress={() => !savingPrompt && setEditPromptVisible(false)}>
              <View style={[styles.editModalOverlay, { backgroundColor: colors.overlayModal }]} />
            </TouchableWithoutFeedback>
            <View style={styles.editModalCentered} pointerEvents="box-none">
              <View style={[styles.editModalCard, { maxWidth: EDIT_MODAL_MAX_WIDTH, backgroundColor: colors.surface }]}>
                <View style={styles.editModalHeader}>
                  <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>
                    {t('aiPreview.editPrompt')}
                  </Text>
                  <TouchableOpacity
                    style={styles.editModalCloseBtn}
                    onPress={() => !savingPrompt && setEditPromptVisible(false)}
                    disabled={savingPrompt}
                    activeOpacity={0.7}
                  >
                    <X size={22} color={colors.textSecondary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.editModalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <TextInput
                    style={[styles.editPromptInput, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={editPromptValue}
                    onChangeText={setEditPromptValue}
                    placeholder={t('aiPreview.promptPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!savingPrompt}
                  />
                </ScrollView>
                <View style={[styles.editModalActions, { borderTopColor: colors.border }]}>
                  <Button
                    variant="secondary"
                    onPress={() => !savingPrompt && setEditPromptVisible(false)}
                    disabled={savingPrompt}
                    style={styles.editModalCancelBtn}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onPress={savePrompt}
                    disabled={savingPrompt || !editPromptValue.trim()}
                    leftIcon={savingPrompt ? <ActivityIndicator size="small" color={colors.textInverse} /> : undefined}
                    style={styles.editModalSaveBtn}
                  >
                    {savingPrompt ? t('common.saving') : t('common.save')}
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <ZoomableImageViewer
          visible={fullscreenVisible}
          images={imageUri ? [{ 
            uri: imageUri, 
            title: t('aiPreview.sectionTitle'),
            description: previewCreatedAt ? formatPreviewDate(previewCreatedAt) : undefined 
          }] : []}
          initialIndex={0}
          onClose={() => setFullscreenVisible(false)}
        />

        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onUpgrade={handleUpgrade}
          loading={isUpgrading}
        />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
  },
  container: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    ...Shadows.md,
  },
  previewContainer: {
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  createdAtText: {
    ...Typography.caption,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  previewActions: {
    marginTop: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  regenerateButton: {
    minWidth: 160,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    lineHeight: 20,
  },
  generateButton: {
    minWidth: 220,
  },
  disclaimerContainer: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  disclaimerTitle: {
    ...Typography.bodyBold,
    marginLeft: Spacing.sm,
  },
  premiumDisclaimerTitle: {
  },
  disclaimerText: {
    ...Typography.small,
    lineHeight: 18,
  },
  loadingContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyBold,
    marginTop: Spacing.lg,
  },
  loadingSubtext: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  errorContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  promptBlock: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    width: '100%',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  promptHeaderText: {
    ...Typography.captionBold,
    flex: 1,
  },
  promptContent: {
    padding: Spacing.sm,
    paddingTop: 0,
  },
  promptText: {
    ...Typography.small,
    marginBottom: Spacing.md,
  },
  promptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  promptActionButton: {
    minWidth: 120,
  },
  // Edit prompt modal (matches app edit modals: root/overlay/centered/card)
  editModalRoot: {
    flex: 1,
  },
  editModalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  editModalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  editModalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: BorderRadius.lg,
    ...Shadows.xl,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  editModalTitle: {
    ...Typography.h3,
    flex: 1,
    maxWidth: '80%',
  },
  editModalCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalScroll: {
    maxHeight: 280,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  editPromptInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 140,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  editModalCancelBtn: {
    flex: 1,
  },
  editModalSaveBtn: {
    flex: 1,
  },
});
