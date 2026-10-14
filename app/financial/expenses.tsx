import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

type ExpenseCategory = 'SUPPLIER' | 'SHIPPING' | 'OTHER';

type ExpenseItem = {
  id: string;
  amount: number;
  occurredAt: string;
  category: ExpenseCategory;
  supplierName: string | null;
  description: string | null;
};

const CATEGORIES: Array<{ key: 'ALL' | ExpenseCategory; labelKey: string }> = [
  { key: 'ALL', labelKey: 'common.all' },
  { key: 'SUPPLIER', labelKey: 'financial.categorySupplier' },
  { key: 'SHIPPING', labelKey: 'financial.categoryShipping' },
  { key: 'OTHER', labelKey: 'financial.categoryOther' },
];

export default function FinancialExpensesScreen() {
  const { colors } = useTheme();
  const { preferredCurrency } = useSettings();
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<'ALL' | ExpenseCategory>('ALL');
  const [items, setItems] = useState<ExpenseItem[]>([]);

  const loadExpenses = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({ limit: '100' });
        if (category !== 'ALL') params.set('category', category);
        const res = await apiFetch<{ expenses: ExpenseItem[] }>(
          `${api.financial.expenses()}?${params.toString()}`
        );
        setItems(res.expenses ?? []);
      } catch (error) {
        console.error('Failed to load expenses:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category]
  );

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  if (loading && !refreshing) {
    return (
      <ScreenContainer noPadding>
        <ListSkeletonLoader variant="card" count={5} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadExpenses(true)} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.filterRow}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: category === item.key ? colors.brass ?? colors.primary : colors.card,
                  borderColor: colors.rule ?? colors.border,
                },
              ]}
              onPress={() => setCategory(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: category === item.key ? colors.paper ?? '#EFE9DC' : colors.textPrimary },
                ]}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.brass ?? colors.primary }]}
          onPress={() => router.push('/financial/expense-new')}
        >
          <Plus size={16} color={colors.paper ?? '#EFE9DC'} />
          <Text style={[styles.addButtonText, { color: colors.paper ?? '#EFE9DC' }]}>
            {t('financial.addExpense')}
          </Text>
        </TouchableOpacity>

        <View style={styles.list}>
          {items.map((expense) => (
            <View key={expense.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowCategory, { color: colors.textSecondary }]}>
                  {t(
                    expense.category === 'SUPPLIER'
                      ? 'financial.categorySupplier'
                      : expense.category === 'SHIPPING'
                        ? 'financial.categoryShipping'
                        : 'financial.categoryOther'
                  )}
                </Text>
                <Text style={[styles.rowAmount, { color: colors.textPrimary }]}>
                  {expense.amount.toLocaleString()} {preferredCurrency}
                </Text>
              </View>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                {new Date(expense.occurredAt).toLocaleDateString()}
              </Text>
              {expense.supplierName ? (
                <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
                  {t('financial.supplier')}: {expense.supplierName}
                </Text>
              ) : null}
              {expense.description ? (
                <Text style={[styles.rowDescription, { color: colors.textPrimary }]}>{expense.description}</Text>
              ) : null}
            </View>
          ))}
          {items.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t('financial.noExpenses')}</Text>
          ) : null}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.xs,
    marginBottom: AtelierSpacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: AtelierRadius.full,
    paddingVertical: 6,
    paddingHorizontal: AtelierSpacing.sm,
  },
  filterText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.xs,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.md,
  },
  addButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: AtelierSpacing.sm,
  },
  row: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    ...AtelierShadow.card,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  rowCategory: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowAmount: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  rowMeta: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  rowDescription: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: AtelierSpacing.xs,
  },
  emptyText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: AtelierSpacing.xl,
  },
});

