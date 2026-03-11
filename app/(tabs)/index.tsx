import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Shirt,
  Info,
  Settings,
  Image,
} from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { fetchCompanySettings, fetchGarmentTypesList } from '@/lib/api';
import { Spacing, Typography, Shadows, BorderRadius, StatusStyles } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { PaywallModal, SubscriptionLoadErrorBanner } from '@/components/subscription';
import { ErrorText } from '@/components/ui/ErrorText';
import { MetricCard } from '@/components/MetricCard';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { FloatingActionButton } from '@/components/FloatingActionButton';

interface OrderResponse {
  id: string;
  customerId: string;
  orderNumber: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  paidAmount: number;
  orderDate: string;
  deliveryDate?: string | null;
  customer?: {
    firstName: string;
    lastName: string;
  };
  orderGarmentSnapshots?: Array<{
    garmentTypeName: string;
  }>;
}

export default function HomeTab() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { subscriptionState, checkCanCreateTemplate, upgradeToPro } = useSubscription();
  const { showRecentOrders } = useSettings();

  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [garments, setGarments] = useState<{ id: string }[]>([]);
  const [companySettings, setCompanySettings] = useState<{
    name: string;
    owner: string;
    phone: string;
    email: string;
    address: string | null;
  } | null>(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [customersRes, ordersRes, garmentTypesRes, companyRes] = await Promise.all([
        apiFetch<{ customers: Array<{ id: string }> }>(`${api.customers()}?limit=1000`),
        apiFetch<{ orders: OrderResponse[] }>(`${api.orders()}?limit=100`),
        fetchGarmentTypesList(isRefresh),
        fetchCompanySettings(isRefresh),
      ]);

      const customers = customersRes.customers ?? [];
      const ordersList = ordersRes.orders ?? [];
      const garmentList = (garmentTypesRes ?? []) as { id: string }[];

      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setClientCount(customers.length);
        setOrders(ordersList);
        setGarments(garmentList);
        setCompanySettings(companyRes);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError' && isMountedRef.current) {
        setError(e.message || t('home.errorLoad'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [t]);

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

  const isCompanySetupComplete = useMemo(() => {
    if (!companySettings) return false;
    const { name, owner, phone, email } = companySettings;
    return (
      name.trim() !== '' &&
      owner.trim() !== '' &&
      phone.trim() !== '' &&
      email.trim() !== ''
    );
  }, [companySettings]);

  const missingCompanyFieldKeys = useMemo(() => {
    if (!companySettings) return [];
    const { name, owner, phone, email } = companySettings;
    const missing: string[] = [];
    if (name.trim() === '') missing.push('profile.companyName');
    if (owner.trim() === '') missing.push('profile.owner');
    if (phone.trim() === '') missing.push('profile.phone');
    if (email.trim() === '') missing.push('profile.email');
    return missing.length >= 1 && missing.length <= 2 ? missing : [];
  }, [companySettings]);

  const activeOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS'
    );
  }, [orders]);

  const ordersDueThisWeek = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return activeOrders.filter((o) => {
      if (!o.deliveryDate) return false;
      const delivery = new Date(o.deliveryDate);
      return delivery >= now && delivery <= weekFromNow;
    });
  }, [activeOrders]);

  const pendingPaymentsTotal = useMemo(() => {
    return orders.reduce((sum, o) => {
      const pending = (o.totalAmount ?? 0) - (o.paidAmount ?? 0);
      return sum + (pending > 0 ? pending : 0);
    }, 0);
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 3);
  }, [orders]);

  const handleAddGalleryItem = () => {
    router.push('/(tabs)/gallery?openAdd=1');
  };

  const handleCreateOrder = () => {
    if (clientCount === 0) {
      router.push('/clients/new');
    } else {
      router.push('/new-order');
    }
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/order-details/${orderId}`);
  };

  if (loading && !refreshing) {
    return (
      <ScreenContainer noPadding centered>
        <ListSkeletonLoader variant="card" count={6} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {companySettings?.owner ? (
              <View style={styles.greetingRow}>
                <Text style={[styles.greeting, { color: colors.textPrimary }]}>
                  {(() => {
                    const hour = new Date().getHours();
                    const firstName = companySettings.owner.split(' ')[0];
                    if (hour < 12) return t('home.greetingMorning', { name: firstName });
                    if (hour < 18) return t('home.greetingAfternoon', { name: firstName });
                    return t('home.greetingEvening', { name: firstName });
                  })()}
                </Text>
              </View>
            ) : (
              <View style={styles.greetingRow} />
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <Settings size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription status unavailable */}
        {subscriptionState === 'unknown' ? (
          <View style={styles.topBannerWrap}>
            <SubscriptionLoadErrorBanner />
          </View>
        ) : null}

        {/* Company setup: incomplete → info banner */}
        {!isCompanySetupComplete ? (
          <View style={styles.companyBanner}>
            <Info size={20} color={colors.info} style={styles.companyBannerIcon} />
            <View style={styles.companyBannerContent}>
              <Text style={[styles.companyBannerTitle, { color: colors.infoText }]}>
                {t('home.company.incompleteTitle')}
              </Text>
              <Text style={[styles.companyBannerSubtitle, { color: colors.info }]}>
                {t('home.company.incompleteSubtitle')}
              </Text>
              {missingCompanyFieldKeys.length > 0 ? (
                <Text style={[styles.companyBannerHint, { color: colors.info }]}>
                  {t('home.company.missingFields', {
                    fields: missingCompanyFieldKeys.map((key) => t(key)).join(t('home.company.missingFieldsSeparator')),
                  })}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[styles.companyBannerButton, { backgroundColor: colors.info }]}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <Text style={[styles.companyBannerButtonText, { color: colors.textInverse }]}>
                  {t('home.company.completeNow')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <ErrorText>{error}</ErrorText>
          </View>
        ) : null}

        {/* No garments empty state */}
        {garments.length === 0 ? (
          <View style={styles.noGarmentsContainer}>
            <View style={[styles.noGarmentsCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.noGarmentsIcon, { backgroundColor: colors.primaryLight }]}>
                <Shirt size={48} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={[styles.noGarmentsTitle, { color: colors.textPrimary }]}>
                {t('home.noGarments.title')}
              </Text>
              <Text style={[styles.noGarmentsSubtitle, { color: colors.textSecondary }]}>
                {t('home.noGarments.subtitle')}
              </Text>
              <TouchableOpacity
                style={[styles.addGarmentButton, { backgroundColor: colors.primary }]}
                onPress={handleAddGarment}
                activeOpacity={0.8}
              >
                <Text style={[styles.addGarmentButtonText, { color: colors.textInverse }]}>
                  {t('home.noGarments.button')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.dashboardContainer}>
            {/* Metric Grid: full-width large cards when recent orders hidden, else 2x2 */}
            <View style={[styles.metricsGrid, !showRecentOrders && styles.metricsGridFullWidth]}>
              <MetricCard
                title={t('home.quickOverview.activeOrders')}
                value={activeOrders.length}
                subtitle={t('home.quickOverview.dueThisWeek', { count: ordersDueThisWeek.length })}
                icon={ShoppingBag}
                iconColor={colors.primary}
                onPress={() => router.push('/(tabs)/orders')}
                size={showRecentOrders ? 'default' : 'large'}
              />
              <MetricCard
                title={t('home.quickOverview.totalClients')}
                value={clientCount}
                subtitle={t('home.quickOverview.records', { count: clientCount })}
                icon={Users}
                iconColor={colors.primary}
                onPress={() => router.push('/(tabs)/orders')}
                size={showRecentOrders ? 'default' : 'large'}
              />
              <MetricCard
                title={t('home.quickOverview.gallery')}
                icon={Image}
                iconColor={colors.info}
                onPress={() => router.push('/(tabs)/gallery')}
                size={showRecentOrders ? 'default' : 'large'}
              />
              <MetricCard
                title={t('home.quickOverview.financial')}
                icon={TrendingUp}
                iconColor={colors.warning}
                onPress={() => router.push('/financial')}
                size={showRecentOrders ? 'default' : 'large'}
              />
            </View>

            {/* Recent Orders Section (hidden when setting is off) */}
            {showRecentOrders ? (
              <View style={styles.recentSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t('home.needsAttention.title')}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                    <Text style={[styles.sectionLink, { color: colors.primary }]}>
                      {t('home.needsAttention.viewAll')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {recentOrders.length === 0 ? (
                  <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {t('home.needsAttention.noOrders')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.recentOrdersList}>
                    {recentOrders.map((order) => (
                      <OrderHistoryItem
                        key={order.id}
                        order={{
                          id: order.id,
                          orderNumber: order.orderNumber,
                          clientName: order.customer
                            ? `${order.customer.firstName} ${order.customer.lastName}`
                            : '—',
                          total: order.totalAmount,
                          advance: order.paidAmount,
                          status: order.status,
                          orderDate: new Date(order.orderDate).toLocaleDateString(),
                          rawOrderDate: order.orderDate,
                          deliveryDate: order.deliveryDate,
                        }}
                        onPress={() => handleOrderPress(order.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {garments.length > 0 ? (
        <FloatingActionButton
          onCreateOrder={handleCreateOrder}
          onAddGalleryItem={handleAddGalleryItem}
        />
      ) : null}
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    ...Typography.h1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  topBannerWrap: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...StatusStyles.error,
    borderRadius: BorderRadius.sm,
  },
  companyBanner: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...StatusStyles.info,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  companyBannerIcon: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  companyBannerContent: {
    flex: 1,
  },
  companyBannerTitle: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  companyBannerSubtitle: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  companyBannerHint: {
    ...Typography.caption,
    marginBottom: Spacing.md,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  companyBannerButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  companyBannerButtonText: {
    ...Typography.captionBold,
  },
  noGarmentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxxl * 2,
  },
  noGarmentsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    ...Shadows.sm,
  },
  noGarmentsIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  noGarmentsTitle: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  noGarmentsSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  addGarmentButton: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGarmentButtonText: {
    ...Typography.bodyBold,
  },
  dashboardContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricsGridFullWidth: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  recentSection: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  sectionLink: {
    ...Typography.captionBold,
  },
  emptyState: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
  },
  recentOrdersList: {
  },
});
