import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { api, apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

type Granularity = 'week' | 'month';

type PeriodBucket = {
  bucketStart: string;
  bucketEnd: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export default function FinancialProfitScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { preferredCurrency } = useSettings();
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buckets, setBuckets] = useState<PeriodBucket[]>([]);

  const fetchSummary = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const now = new Date();
        const from = new Date(now);
        if (granularity === 'month') {
          from.setMonth(now.getMonth() - 5);
        } else {
          from.setDate(now.getDate() - 7 * 11);
        }

        const params = new URLSearchParams({
          granularity,
          from: from.toISOString(),
          to: now.toISOString(),
        });

        const res = await apiFetch<{ buckets: PeriodBucket[] }>(
          `${api.financial.periodSummary}?${params.toString()}`
        );
        setBuckets(res.buckets ?? []);
      } catch (error) {
        console.error('Failed to load financial period summary:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [granularity]
  );

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  const totals = useMemo(() => {
    return buckets.reduce(
      (acc, b) => {
        acc.revenue += b.revenue;
        acc.expenses += b.expenses;
        acc.profit += b.profit;
        return acc;
      },
      { revenue: 0, expenses: 0, profit: 0 }
    );
  }, [buckets]);

  if (loading && !refreshing) {
    return (
      <ScreenContainer noPadding>
        <ListSkeletonLoader variant="card" count={4} />
      </ScreenContainer>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    // Buckets are cut at UTC month/week edges; local time would push "May 31 23:59Z" to "Jun 1".
    timeZone: 'UTC',
  });

  return (
    <ScreenContainer noPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchSummary(true)} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.toggleRow}>
          {(['week', 'month'] as Granularity[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.toggle,
                {
                  backgroundColor: granularity === item ? colors.brass ?? colors.primary : colors.card,
                  borderColor: colors.rule ?? colors.border,
                },
              ]}
              onPress={() => setGranularity(item)}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: granularity === item ? colors.paper ?? '#EFE9DC' : colors.textPrimary },
                ]}
              >
                {item === 'week' ? t('financial.weekly') : t('financial.monthly')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.totalsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('financial.revenue')}</Text>
          <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
            {totals.revenue.toLocaleString()} {preferredCurrency}
          </Text>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('financial.expensesTotal')}</Text>
          <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
            {totals.expenses.toLocaleString()} {preferredCurrency}
          </Text>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t('financial.profitResult')}</Text>
          <Text style={[styles.totalValue, { color: totals.profit >= 0 ? colors.pine ?? colors.success : colors.ember ?? colors.error }]}>
            {totals.profit.toLocaleString()} {preferredCurrency}
          </Text>
        </View>

        <View style={styles.list}>
          {[...buckets].reverse().map((bucket) => (
            <View key={bucket.bucketStart} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                {dateFmt.format(new Date(bucket.bucketStart))} - {dateFmt.format(new Date(bucket.bucketEnd))}
              </Text>
              <Text style={[styles.rowText, { color: colors.textSecondary }]}>
                {t('financial.revenue')}: {bucket.revenue.toLocaleString()} {preferredCurrency}
              </Text>
              <Text style={[styles.rowText, { color: colors.textSecondary }]}>
                {t('financial.expensesTotal')}: {bucket.expenses.toLocaleString()} {preferredCurrency}
              </Text>
              <Text style={[styles.rowProfit, { color: bucket.profit >= 0 ? colors.pine ?? colors.success : colors.ember ?? colors.error }]}>
                {t('financial.profitResult')}: {bucket.profit.toLocaleString()} {preferredCurrency}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xxl,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.md,
  },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.sm,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  totalsCard: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    ...AtelierShadow.card,
    marginBottom: AtelierSpacing.md,
    gap: 2,
  },
  totalLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.sm,
  },
  list: {
    gap: AtelierSpacing.sm,
  },
  row: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
  },
  rowTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs,
  },
  rowText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  rowProfit: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginTop: AtelierSpacing.xs,
  },
});

