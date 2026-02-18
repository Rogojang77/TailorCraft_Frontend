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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Plus, ChevronRight, Trash2 } from 'lucide-react-native';
import { api, apiFetch, ApiError, HttpStatus } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fetchGarmentTypesList, invalidateGarmentTypesCache, deleteGarmentType } from '@/lib/apiCache';
import { getGarmentTypeIdFromPostResponse, normalizeGarmentTypeRecord } from '@/lib/api-mappers';
import type { GarmentTypeRecord } from '@/types/templates';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTemplates } from '@/contexts/TemplatesContext';
import { TemplateSourceBadge } from '@/components/TemplateSourceBadge';
import { Header } from '@/components/layout/Header';
import { Loader } from '@/components/ui/Loader';
import { ErrorText } from '@/components/ui/ErrorText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';

function statusLabel(status: string): string {
  if (status === 'active') return 'Enabled';
  if (status === 'disabled') return 'Disabled';
  return status;
}

export default function GarmentsListScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [garments, setGarments] = useState<GarmentTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { templateCreationStatus, sharedTemplateUsageStatus } = useSubscription();
  const { duplicateTemplate, isDuplicated } = useTemplates();
  const createStatus = templateCreationStatus();
  const duplicateStatus = sharedTemplateUsageStatus();

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

  const handleDuplicate = useCallback(
    async (garment: GarmentTypeRecord) => {
      if (!duplicateStatus.allowed) return;
      if (garment.source === 'local') return;
      try {
        const res = await apiFetch<unknown>(api.garmentTypes(), {
          method: 'POST',
          body: JSON.stringify({
            name: `Copy of ${garment.name}`,
            copyFromId: garment.id,
          }),
        });
        invalidateGarmentTypesCache();
        const id = getGarmentTypeIdFromPostResponse(res);
        duplicateTemplate(garment.id);
        if (id) {
          router.push(`/garments/${id}`);
        } else {
          Alert.alert(t('garments.duplicated'), t('garments.duplicatedMessage'));
          fetchGarments(true);
        }
      } catch (e) {
        Alert.alert(
          t('common.error'),
          e instanceof Error ? e.message : t('garments.duplicateError')
        );
      }
    },
    [duplicateStatus.allowed, duplicateTemplate, router, fetchGarments]
  );

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

  return (
    <ScreenContainer noPadding>
      <Header
        title={t('garments.pageTitle')}
        onBack={() => router.back()}
        backAccessibilityLabel={t('common.back')}
      />

      {loading ? (
        <Loader message={t('garments.loadingList')} style={styles.centered} />
      ) : error ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          >
            <EmptyState
              title={t('home.noGarments.title')}
              message="You haven't created any garments yet. Create your first garment to define how you measure."
              hint={!createStatus.allowed && createStatus.message ? createStatus.message : undefined}
            />
          </ScrollView>
          <TouchableOpacity
            style={[styles.fab, !createStatus.allowed && styles.fabDisabled]}
            onPress={() => router.push('/garments/new')}
            activeOpacity={0.8}
            disabled={!createStatus.allowed}
          >
            <Plus size={24} color={Colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          >
            {garments.map((g) => {
              const isShared = g.source === 'shared' || g.source === 'api';
              const canToggle = !isShared || (g.templateId && isDuplicated(g.templateId));
              const isEnabled = g.status === 'active';
              
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.row}
                  onPress={() => router.push(`/garments/${g.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowContent}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName} numberOfLines={1}>
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
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={Colors.surface}
                            ios_backgroundColor={Colors.border}
                            style={styles.statusSwitch}
                          />
                        </TouchableOpacity>
                      )}
                      <ChevronRight size={18} color={Colors.textTertiary} />
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => handleDelete(g.id)}
                      >
                        <Trash2 size={18} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          
          {/* Floating Action Button */}
          <TouchableOpacity
            style={[styles.fab, !createStatus.allowed && styles.fabDisabled]}
            onPress={() => router.push('/garments/new')}
            activeOpacity={0.8}
            disabled={!createStatus.allowed}
          >
            <Plus size={24} color={Colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Shadows.sm,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 64,
  },
  rowMain: {
    flex: 1,
    marginRight: Spacing.md,
    gap: Spacing.xs,
  },
  rowName: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.primary,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
