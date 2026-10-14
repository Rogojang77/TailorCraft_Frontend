import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Plus, ChevronRight, Trash2, GripVertical } from 'lucide-react-native';
import { api, apiFetch, ApiError, HttpStatus } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  fetchGarmentTypesList,
  invalidateGarmentTypesCache,
  deleteGarmentType,
  getGarmentTypeIdFromPostResponse,
  normalizeGarmentTypeRecord,
} from '@/lib/api';
import type { GarmentTypeRecord } from '@/types/templates';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTemplates } from '@/contexts/TemplatesContext';
import { TemplateSourceBadge } from '@/components/TemplateSourceBadge';
import { PaywallModal } from '@/components/subscription';
import { Loader } from '@/components/ui/Loader';
import { ErrorText } from '@/components/ui/ErrorText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

export default function GarmentsListScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [garments, setGarments] = useState<GarmentTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { duplicateTemplate, isDuplicated } = useTemplates();
  const { checkCanCreateTemplate, upgradeToPro } = useSubscription();

  const canCreateTemplate = checkCanCreateTemplate();

  const handleAddGarment = useCallback(() => {
    if (canCreateTemplate) {
      router.push('/garments/new');
    } else {
      setShowPaywall(true);
    }
  }, [canCreateTemplate, router]);

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

  const fetchGarments = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      const rawList = await fetchGarmentTypesList(forceRefresh);
      const list = Array.isArray(rawList)
        ? rawList.map((g: unknown) => normalizeGarmentTypeRecord(g as Parameters<typeof normalizeGarmentTypeRecord>[0]))
        : [];
      setGarments(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('garments.loadError');
      if (err instanceof ApiError && err.status === HttpStatus.NotFound) {
        setError(t('garments.loadError'));
      } else {
        setError(msg);
      }
      setGarments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const handleDeleteConfirm = useCallback(async (id: string) => {
    try {
      await deleteGarmentType(id);
      fetchGarments(true);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('garments.deleteError'));
    }
  }, [fetchGarments]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      Alert.alert(t('common.delete'), t('garments.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDeleteConfirm(id) },
      ]);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('garments.deleteError'));
    }
  }, [handleDeleteConfirm, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchGarments(false);
    }, [fetchGarments])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGarments(true);
  }, [fetchGarments]);

  const handleToggleStatus = useCallback(
    async (garment: GarmentTypeRecord, enabled: boolean) => {
      const isShared = garment.source === 'shared' || garment.source === 'api';
      const canToggle = !isShared || (garment.templateId && isDuplicated(garment.templateId));
      if (!canToggle) return;
      
      try {
        await apiFetch(api.garmentTypes(garment.id), {
          method: 'PUT',
          body: JSON.stringify({ enabled }),
        });
        invalidateGarmentTypesCache();
        fetchGarments(true);
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('garments.updateStatusError'));
      }
    },
    [fetchGarments, isDuplicated]
  );

  const handleDragEnd = useCallback(async ({ data }: { data: GarmentTypeRecord[] }) => {
    setGarments(data);
    const updatePromises = data.map((garment, index) => {
      if (garment.sortOrder !== index) {
        return apiFetch(api.garmentTypes(garment.id), {
          method: 'PUT',
          body: JSON.stringify({ sortOrder: index }),
        });
      }
      return Promise.resolve();
    });
    try {
      await Promise.all(updatePromises);
      invalidateGarmentTypesCache();
    } catch (e) {
      Alert.alert(t('common.error'), t('garments.reorderError'));
      fetchGarments(true);
    }
  }, [fetchGarments, t]);

  const renderGarmentItem = useCallback(({ item: g, drag, isActive }: RenderItemParams<GarmentTypeRecord>) => {
    const isShared = g.source === 'shared' || g.source === 'api';
    const canToggle = !isShared || (g.templateId && isDuplicated(g.templateId));
    const isEnabled = g.status === 'active';

    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }, isActive && styles.rowActive]}
          onPress={() => router.push(`/garments/${g.id}`)}
          activeOpacity={0.7}
          disabled={isActive}
        >
          <View style={styles.rowContent}>
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={100}
              style={styles.dragHandle}
              activeOpacity={0.7}
            >
              <GripVertical size={20} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.rowMain}>
              <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
                {g.name}
              </Text>
              {(g.source === 'shared' || g.source === 'api') && (
                <TemplateSourceBadge source={g.source} />
              )}
            </View>
            <View style={styles.rowActions}>
              {canToggle && (
                <TouchableOpacity
                  onPress={(e) => e.stopPropagation()}
                  activeOpacity={1}
                >
                  <Switch
                    value={isEnabled}
                    onValueChange={(enabled) => {
                      handleToggleStatus(g, enabled);
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                    ios_backgroundColor={colors.border}
                    style={styles.statusSwitch}
                  />
                </TouchableOpacity>
              )}
              <ChevronRight size={18} color={colors.textTertiary} />
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => handleDelete(g.id)}
              >
                <Trash2 size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [isDuplicated, router, handleToggleStatus, handleDelete, colors]);

  return (
    <ScreenContainer noPadding>
      {loading ? (
        <Loader message={t('garments.loadingList')} style={styles.centered} />
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          <ErrorText>{error}</ErrorText>
          <Button
            variant="primary"
            onPress={() => { setLoading(true); fetchGarments(); }}
            style={styles.retryButton}
          >
            {t('garments.retry')}
          </Button>
        </ScrollView>
      ) : garments.length === 0 ? (
        <>
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
          >
            <EmptyState
              title={t('home.noGarments.title')}
              message={t('garments.emptyMessage')}
            />
          </ScrollView>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={handleAddGarment}
            activeOpacity={0.8}
          >
            <Plus size={24} color={colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <GestureHandlerRootView style={styles.list}>
            <DraggableFlatList
              data={garments}
              keyExtractor={(item) => item.id}
              renderItem={renderGarmentItem}
              onDragBegin={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              onDragEnd={(params) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleDragEnd(params);
              }}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
              }
            />
          </GestureHandlerRootView>
          
          {/* Floating Action Button */}
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={handleAddGarment}
            activeOpacity={0.8}
          >
            <Plus size={24} color={colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </>
      )}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.md,
  },
  retryButton: {
    marginTop: AtelierSpacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xxl,
  },
  row: {
    borderRadius: AtelierRadius.md,
    marginBottom: AtelierSpacing.sm,
    borderBottomWidth: 1,
    ...AtelierShadow.card,
  },
  rowActive: {
    ...AtelierShadow.elevated,
    opacity: 0.95,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
    minHeight: 64,
  },
  dragHandle: {
    paddingRight: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.xs,
  },
  rowMain: {
    flex: 1,
    marginRight: AtelierSpacing.md,
    gap: AtelierSpacing.xs,
  },
  rowName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.md,
  },
  statusSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  fab: {
    position: 'absolute',
    bottom: AtelierSpacing.xl,
    right: AtelierSpacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...AtelierShadow.elevated,
    ...(Platform.OS === 'ios' ? { elevation: 8 } : {}),
  },
});
