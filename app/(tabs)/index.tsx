import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Plus, Shirt, Info } from 'lucide-react-native';
import { ClientCard } from '@/components/ClientCard';
import { OrderCard } from '@/components/OrderCard';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { fetchCompanySettings, fetchGarmentTypesList } from '@/lib/apiCache';
import {
  orderStatusToLabel,
  orderItemsFromMeasurements,
  formatDate,
  customerFullName,
} from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius, StatusStyles, CompactLayoutStyles } from '@/constants/design';
import { ProBadge } from '@/components/ProBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { Section } from '@/components/ui/Section';
import { ErrorText } from '@/components/ui/ErrorText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SubscriptionLoadErrorBanner } from '@/components/SubscriptionLoadErrorBanner';

const { width } = Dimensions.get('window');

type ClientCardData = { id: string; name: string; phone: string; lastOrder: string };
type OrderCardData = {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  status: string; // Raw status code (PENDING, IN_PROGRESS, etc.)
  orderDate: string;
};

export default function HomeTab() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { checkCanCreateClient, checkCanCreateOrder, getLimitMessages, subscriptionState } = useSubscription();
  const canCreateClient = checkCanCreateClient();
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentClients, setRecentClients] = useState<ClientCardData[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderCardData[]>([]);
  const [garments, setGarments] = useState<{ id: string }[]>([]);
  const [companySettings, setCompanySettings] = useState<{
    name: string;
    owner: string;
    phone: string;
    email: string;
    address: string | null;
  } | null>(null);

  // Track component mount state for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [customersRes, ordersRes, garmentTypesRes, companyRes] = await Promise.all([
        apiFetch<{ customers: Array<{
          id: string;
          firstName: string;
          lastName: string;
          phone: string;
          _count?: { orders: number };
        }> }>(`${api.customers()}?limit=20`),
        apiFetch<{ orders: Array<{
          id: string;
          status: string;
          totalAmount: number;
          orderDate: string;
          measurements: Record<string, unknown> | null;
          customer?: { id: string; firstName: string; lastName: string; phone: string };
        }> }>(`${api.orders()}?limit=20`),
        fetchGarmentTypesList(isRefresh),
        fetchCompanySettings(isRefresh),
      ]);
      
      // Process orders
      const orders = ordersRes.orders ?? [];
      const orderCardData: OrderCardData[] = orders.map((o) => ({
        id: o.id,
        clientName: o.customer
          ? customerFullName(o.customer.firstName, o.customer.lastName)
          : '—',
        items: orderItemsFromMeasurements(o.measurements),
        total: o.totalAmount,
        status: o.status, // Pass raw status code for color-coding
        orderDate: formatDate(o.orderDate),
      }));
      setRecentOrders(orderCardData.slice(0, 5));
      
      // Process clients - fetch directly from customers API
      const customers = customersRes.customers ?? [];
      
      // Create a map of customer ID to their most recent order info
      const customerOrderMap = new Map<string, { lastOrder: string }>();
      for (const o of orders) {
        if (!o.customer) continue;
        const existing = customerOrderMap.get(o.customer.id);
        if (!existing || o.orderDate > existing.lastOrder) {
          customerOrderMap.set(o.customer.id, {
            lastOrder: o.orderDate,
          });
        }
      }
      
      // Map customers to client card data
      const clients: ClientCardData[] = customers.slice(0, 5).map((c) => {
        const orderInfo = customerOrderMap.get(c.id);
        return {
          id: c.id,
          name: customerFullName(c.firstName, c.lastName),
          phone: c.phone,
          lastOrder: orderInfo ? formatDate(orderInfo.lastOrder) : '—',
        };
      });
      
      const garmentList = (garmentTypesRes ?? []) as { id: string }[];

      // Only update state if component is still mounted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setRecentClients(clients);
        setGarments(garmentList);
        setCompanySettings(companyRes);
      }
    } catch (e) {
      // Ignore abort errors
      if (e instanceof Error && e.name !== 'AbortError' && isMountedRef.current) {
        setError(e.message || t('home.errorLoad'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Cleanup on unmount
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
        // Cleanup on blur
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [isAuthenticated, fetchData])
  );

  const onRefresh = () => fetchData(true);

  const isCompanySetupComplete = useMemo(() => {
    if (!companySettings) return false;
    const { name, owner, phone, email, address } = companySettings;
    return (
      name.trim() !== '' &&
      owner.trim() !== '' &&
      phone.trim() !== '' &&
      email.trim() !== '' &&
      (address ?? '').trim() !== ''
    );
  }, [companySettings]);

  // When only 1 or 2 fields are missing, list them for the user
  const missingCompanyFieldKeys = useMemo(() => {
    if (!companySettings) return [];
    const { name, owner, phone, email, address } = companySettings;
    const missing: string[] = [];
    if (name.trim() === '') missing.push('profile.companyName');
    if (owner.trim() === '') missing.push('profile.owner');
    if (phone.trim() === '') missing.push('profile.phone');
    if (email.trim() === '') missing.push('profile.email');
    if ((address ?? '').trim() === '') missing.push('profile.address');
    return missing.length >= 1 && missing.length <= 2 ? missing : [];
  }, [companySettings]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            {companySettings?.owner ? (
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>
                  {(() => {
                    const hour = new Date().getHours();
                    const firstName = companySettings.owner.split(' ')[0];
                    if (hour < 12) return t('home.greetingMorning', { name: firstName });
                    if (hour < 18) return t('home.greetingAfternoon', { name: firstName });
                    return t('home.greetingEvening', { name: firstName });
                  })()}
                </Text>
                <ProBadge size="sm" style={{ marginLeft: 12 }} />
              </View>
            ) : (
              <View style={styles.greetingRow}>
                <ProBadge size="sm" />
              </View>
            )}
          </View>
        </View>

        {/* Subscription status unavailable — same placement as company banner */}
        {subscriptionState === 'unknown' ? (
          <View style={styles.topBannerWrap}>
            <SubscriptionLoadErrorBanner />
          </View>
        ) : null}

        {/* Company setup: incomplete → info banner; complete → optional subtle indicator */}
        {!isCompanySetupComplete ? (
          <View style={styles.companyBanner}>
            <Info size={20} color={Colors.info} style={styles.companyBannerIcon} />
            <View style={styles.companyBannerContent}>
              <Text style={styles.companyBannerTitle}>{t('home.company.incompleteTitle')}</Text>
              <Text style={styles.companyBannerSubtitle}>
                {t('home.company.incompleteSubtitle')}
              </Text>
              {missingCompanyFieldKeys.length > 0 ? (
                <Text style={styles.companyBannerHint}>
                  {t('home.company.missingFields', {
                    fields: missingCompanyFieldKeys.map((key) => t(key)).join(t('home.company.missingFieldsSeparator')),
                  })}
                </Text>
              ) : null}
              <TouchableOpacity
                style={styles.companyBannerButton}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.companyBannerButtonText}>{t('home.company.completeNow')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          ""
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <ErrorText>{error}</ErrorText>
          </View>
        ) : null}

        {/* No garments empty state — show only when zero garments */}
        {garments.length === 0 ? (
          <View style={styles.noGarmentsContainer}>
            <View style={styles.noGarmentsCard}>
              <View style={styles.noGarmentsIcon}>
                <Shirt size={48} color={Colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={styles.noGarmentsTitle}>{t('home.noGarments.title')}</Text>
              <Text style={styles.noGarmentsSubtitle}>
                {t('home.noGarments.subtitle')}
              </Text>
              <TouchableOpacity
                style={styles.addGarmentButton}
                onPress={() => router.push('/garments/new')}
                activeOpacity={0.8}
              >
                <Plus size={22} color={Colors.textInverse} strokeWidth={2.5} />
                <Text style={styles.addGarmentButtonText}>{t('home.noGarments.button')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
        {/* Recent Clients */}
        <Section
          title={t('home.recentClients')}
          style={CompactLayoutStyles.compactSection}
          headerRight={
            <View style={styles.sectionHeaderActions}>
              {recentClients.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => canCreateClient && router.push('/clients/new')}
                  disabled={!canCreateClient}
                  style={[styles.addSectionButton, !canCreateClient ? styles.addSectionButtonDisabled : null]}
                  leftIcon={<Plus size={16} color={canCreateClient ? Colors.textInverse : Colors.textTertiary} strokeWidth={2.5} />}
                >
                  {t('home.addClient')}
                </Button>
              ) : null}
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.seeAllText}>{t('home.seeAllClients')}</Text>
              </TouchableOpacity>
            </View>
          }
        >
          {recentClients.length === 0 ? (
            <EmptyState
              title={t('home.noClients')}
              hint={!canCreateClient ? limitMsgs.clientLimitReached : undefined}
              actionLabel={t('home.addClient')}
              onAction={() => router.push('/clients/new')}
              actionDisabled={!canCreateClient}
              style={styles.emptyState}
            />
          ) : (
            <FlatList
              data={recentClients}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ClientCard
                  client={item}
                  onPress={() => router.push(`/client-details/${item.id}`)}
                />
              )}
              contentContainerStyle={styles.horizontalList}
              // Performance optimizations
              windowSize={3}
              initialNumToRender={3}
              maxToRenderPerBatch={2}
              removeClippedSubviews={true}
            />
          )}
        </Section>

        {/* Recent Orders */}
        <Section
          title={t('home.recentOrders')}
          style={CompactLayoutStyles.compactSection}
          headerRight={
            <View style={styles.sectionHeaderActions}>
              {recentOrders.length > 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => canCreateOrder && router.push('/new-order')}
                  disabled={!canCreateOrder}
                  style={[styles.addSectionButton, !canCreateOrder ? styles.addSectionButtonDisabled : null]}
                  leftIcon={<Plus size={16} color={canCreateOrder ? Colors.textInverse : Colors.textTertiary} strokeWidth={2.5} />}
                >
                  {t('home.addOrder')}
                </Button>
              ) : null}
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.seeAllText}>{t('home.seeAllOrders')}</Text>
              </TouchableOpacity>
            </View>
          }
        >
          {recentOrders.length === 0 ? (
            <EmptyState
              title={t('home.noOrders')}
              hint={!canCreateOrder ? limitMsgs.orderLimitReached : undefined}
              actionLabel={t('home.addOrder')}
              onAction={() => router.push('/new-order')}
              actionDisabled={!canCreateOrder}
              style={styles.emptyState}
            />
          ) : (
            <FlatList
              data={recentOrders}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <OrderCard
                  order={item}
                  onPress={() => router.push(`/order-details/${item.id}`)}
                />
              )}
              // Performance optimizations
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              removeClippedSubviews={false} // Small list, no need to clip
            />
          )}
        </Section>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  greeting: {
    ...Typography.h1,
  },
  welcomeText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 48, // Minimum 48px height
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, // 12px buttons
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  addSectionButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  addSectionButtonDisabled: {
    opacity: 0.5, // Disabled state: opacity 0.5, no color change
  },
  addSectionButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  seeAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md, // 16px screen horizontal padding
    gap: Spacing.xxxs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
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
    color: Colors.infoText,
    marginBottom: Spacing.xs,
  },
  companyBannerSubtitle: {
    ...Typography.caption,
    color: Colors.info,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  companyBannerHint: {
    ...Typography.caption,
    color: Colors.info,
    marginBottom: Spacing.md,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  companyBannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.info,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  companyBannerButtonText: {
    ...Typography.captionBold,
    color: Colors.textInverse,
  },
  companyCompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  companyCompleteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  emptyState: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  noGarmentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md, // 16px screen horizontal padding
    paddingTop: Spacing.xxxl * 2,
  },
  noGarmentsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, // 14px cards
    padding: Spacing.lg, // 24px (can be larger for empty state)
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    ...Shadows.sm, // Very subtle shadow
  },
  noGarmentsIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
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
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  addGarmentButton: {
    flexDirection: 'row',
    gap: Spacing.sm,
    ...ButtonStyles.primary, // Height 48px minimum, border radius 12px
    paddingHorizontal: Spacing.lg,
  },
  addGarmentButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
});