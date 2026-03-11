import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Banknote, ArrowDownCircle, Wallet, ChevronRight } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { customerFullName } from '@/lib/api';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';

type ClientBalance = {
  id: string;
  name: string;
  totalOrders: number;
  totalPaid: number;
  balance: number;
};

export default function FinancialScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalExpected, setTotalExpected] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const ordersRes = await apiFetch<{
        orders: Array<{
          id: string;
          totalAmount: number;
          paidAmount: number;
          customer?: { id: string; firstName: string; lastName: string };
        }>;
      }>(`${api.orders()}?limit=500`);

      const orders = ordersRes.orders ?? [];

      let expected = 0;
      let collected = 0;
      const clientMap = new Map<string, ClientBalance>();

      for (const order of orders) {
        expected += order.totalAmount || 0;
        collected += order.paidAmount || 0;

        if (order.customer) {
          const customerId = order.customer.id;
          const existing = clientMap.get(customerId);
          if (existing) {
            existing.totalOrders += order.totalAmount || 0;
            existing.totalPaid += order.paidAmount || 0;
            existing.balance = existing.totalOrders - existing.totalPaid;
          } else {
            clientMap.set(customerId, {
              id: customerId,
              name: customerFullName(order.customer.firstName, order.customer.lastName),
              totalOrders: order.totalAmount || 0,
              totalPaid: order.paidAmount || 0,
              balance: (order.totalAmount || 0) - (order.paidAmount || 0),
            });
          }
        }
      }

      const balances = Array.from(clientMap.values())
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setTotalExpected(expected);
        setTotalCollected(collected);
        setClientBalances(balances);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load financial data:', e);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      if (isMountedRef.current) {
        fetchData();
      }
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [isAuthenticated, fetchData])
  );

  const onRefresh = () => fetchData(true);

  const totalOutstanding = totalExpected - totalCollected;

  if (loading && !refreshing) {
    return (
      <ScreenContainer noPadding>
        <ListSkeletonLoader variant="card" count={4} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('financial.subtitle')}
        </Text>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Banknote size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('financial.totalOrders')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {totalExpected.toLocaleString()} RON
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.successBg }]}>
              <ArrowDownCircle size={20} color={colors.success} strokeWidth={2} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('financial.collected')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {totalCollected.toLocaleString()} RON
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Wallet size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t('financial.outstanding')}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {totalOutstanding.toLocaleString()} RON
              </Text>
            </View>
          </View>
        </View>

        {/* Client Balances */}
        <View style={styles.clientsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('financial.clientBalances')}
          </Text>
          {clientBalances.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {t('financial.noOutstanding')}
            </Text>
          ) : (
            <View style={styles.clientsList}>
              {clientBalances.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.clientRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push(`/client-details/${client.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.clientInfo}>
                    <Text style={[styles.clientName, { color: colors.textPrimary }]}>
                      {client.name}
                    </Text>
                    <Text style={[styles.clientBalance, { color: colors.textSecondary }]}>
                      {t('financial.remaining')}: {client.balance.toLocaleString()} RON
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  subtitle: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  summaryCards: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    ...Typography.h3,
  },
  clientsSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.small,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: Spacing.xs,
  },
  clientsList: {
    gap: Spacing.xs,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...Typography.bodySemiBold,
    marginBottom: 2,
  },
  clientBalance: {
    ...Typography.small,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: Spacing.xl,
  },
});
