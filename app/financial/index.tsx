import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { PiggyBank, Wallet, TrendingUp, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow, AtelierType } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';

type MonthTotals = { revenue: number; expenses: number; profit: number };

const SECTIONS: { key: 'receivables' | 'profit' | 'expenses'; icon: LucideIcon; route: Href }[] = [
  { key: 'receivables', icon: Wallet, route: '/financial/receivables' },
  { key: 'profit', icon: TrendingUp, route: '/financial/profit' },
  { key: 'expenses', icon: PiggyBank, route: '/financial/expenses' },
];

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancialScreen() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const { preferredCurrency } = useSettings();
  const router = useRouter();
  const [month, setMonth] = useState<MonthTotals | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(now);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const params = new URLSearchParams({ granularity: 'month', from: from.toISOString(), to: new Date().toISOString() });
      apiFetch<{ buckets: MonthTotals[] }>(`${api.financial.periodSummary}?${params.toString()}`)
        .then((res) => {
          if (cancelled) return;
          const totals = (res.buckets ?? []).reduce(
            (acc, b) => ({ revenue: acc.revenue + b.revenue, expenses: acc.expenses + b.expenses, profit: acc.profit + b.profit }),
            { revenue: 0, expenses: 0, profit: 0 }
          );
          setMonth(totals);
        })
        .catch((error) => console.error('Failed to load monthly summary:', error))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const paper = colors.paper ?? colors.background;
  const ink4 = colors.ink4 ?? colors.textTertiary;
  const ink2 = colors.ink2 ?? colors.textPrimary;
  const profitNegative = (month?.profit ?? 0) < 0;

  return (
    <ScreenContainer noPadding>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('financial.subtitle')}</Text>

        {/* This month at a glance — same ink card language as the Home bench */}
        <View style={[styles.monthCard, { backgroundColor: colors.textPrimary }, AtelierShadow.elevated]}>
          <Text style={[styles.monthLabel, { color: colors.brass }]}>{monthLabel}</Text>
          {loading && !month ? (
            <ActivityIndicator color={colors.brassPale ?? colors.brass} style={styles.loader} />
          ) : (
            <>
              <Text style={[styles.profitCaption, { color: ink4 }]}>{t('financial.profitResult')}</Text>
              <Text
                style={[styles.profitAmount, { color: profitNegative ? colors.ember : paper }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(month?.profit ?? 0)}
                <Text style={[styles.currency, { color: ink4 }]}> {preferredCurrency}</Text>
              </Text>
              <View style={[styles.splitRow, { borderTopColor: ink2 }]}>
                <View style={styles.splitItem}>
                  <Text style={[styles.splitLabel, { color: ink4 }]}>{t('financial.revenue')}</Text>
                  <Text style={[styles.splitValue, { color: colors.brassPale ?? colors.brass }]}>
                    {formatAmount(month?.revenue ?? 0)}
                  </Text>
                </View>
                <View style={[styles.splitDivider, { backgroundColor: ink2 }]} />
                <View style={styles.splitItem}>
                  <Text style={[styles.splitLabel, { color: ink4 }]}>{t('financial.expensesTotal')}</Text>
                  <Text style={[styles.splitValue, { color: paper }]}>{formatAmount(month?.expenses ?? 0)}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={[styles.list, { backgroundColor: colors.card, borderColor: colors.rule }]}>
          {SECTIONS.map(({ key, icon: Icon, route }, i) => (
            <TouchableOpacity
              key={key}
              style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.ruleSoft ?? colors.rule }]}
              onPress={() => router.push(route)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={[styles.iconWrap, { backgroundColor: paper, borderColor: colors.rule }]}>
                <Icon size={20} color={colors.brass} strokeWidth={1.8} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t(`financial.${key}Title`)}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.ink3 }]}>{t(`financial.${key}Subtitle`)}</Text>
              </View>
              <ChevronRight size={18} color={ink4} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: 100,
  },
  pageTitle: {
    ...AtelierType.displaySm,
    marginBottom: AtelierSpacing.md,
  },
  monthCard: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.lg,
  },
  monthLabel: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.md,
  },
  loader: {
    marginVertical: AtelierSpacing.xl,
  },
  profitCaption: {
    ...AtelierType.monoSm,
  },
  profitAmount: {
    fontFamily: FontFamily.serif,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -0.5,
  },
  currency: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
  },
  splitItem: {
    flex: 1,
    gap: 2,
  },
  splitDivider: {
    width: 1,
    height: 32,
    opacity: 0.4,
    marginHorizontal: AtelierSpacing.md,
  },
  splitLabel: {
    ...AtelierType.monoSm,
  },
  splitValue: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  list: {
    borderRadius: AtelierRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  rowSubtitle: {
    ...AtelierType.uiSm,
    fontSize: 12,
    lineHeight: 17,
  },
});
