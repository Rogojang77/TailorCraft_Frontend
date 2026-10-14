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
  Plus,
} from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { fetchCompanySettings, fetchGarmentTypesList } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { PaywallModal, SubscriptionLoadErrorBanner } from '@/components/subscription';
import { ErrorText } from '@/components/ui/ErrorText';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import {
  FontFamily,
  AtelierSpacing,
  AtelierRadius,
  AtelierShadow,
  AtelierType,
  AtelierStatus,
} from '@/constants/atelierDesign';
import { TCRule } from '@/components/atelier/TCRule';

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

const STATUS_MAP: Record<string, keyof typeof AtelierStatus> = {
  PENDING: 'pending',
  IN_PROGRESS: 'progress',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function dayLabel(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function greetingPrefix(hour: number, firstName: string, t: (k: string, v?: Record<string, unknown>) => string) {
  if (hour < 12) return t('home.greetingMorning', { name: firstName });
  if (hour < 18) return t('home.greetingAfternoon', { name: firstName });
  return t('home.greetingEvening', { name: firstName });
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
    if (abortControllerRef.current) abortControllerRef.current.abort();
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
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      if (isMountedRef.current) fetchData();
      return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [isAuthenticated, fetchData])
  );

  const onRefresh = () => fetchData(true);

  const canCreateTemplate = checkCanCreateTemplate();
  const handleAddGarment = useCallback(() => {
    if (canCreateTemplate) router.push('/garments/new');
    else setShowPaywall(true);
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
    return name.trim() !== '' && owner.trim() !== '' && phone.trim() !== '' && email.trim() !== '';
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

  const activeOrders = useMemo(() =>
    orders.filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS'),
    [orders]
  );

  const ordersDueThisWeek = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return activeOrders.filter((o) => {
      if (!o.deliveryDate) return false;
      const delivery = new Date(o.deliveryDate);
      return delivery >= now && delivery <= weekFromNow;
    });
  }, [activeOrders]);

  const recentOrders = useMemo(() =>
    [...orders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5),
    [orders]
  );

  const handleCreateOrder = () => {
    if (clientCount === 0) router.push('/clients/new');
    else router.push('/new-order');
  };

  const handleOrderPress = (orderId: string) => router.push(`/order-details/${orderId}`);
  const handleAddGalleryItem = () => router.push('/(tabs)/gallery?openAdd=1');

  // ─── Theme shorthands ────────────────────────────────────────────────────────
  const bg = colors.paper;
  const inkColor = colors.textPrimary;
  const ink2 = colors.ink2 ?? colors.textPrimary;
  const ink3 = colors.ink3 ?? colors.textSecondary;
  const ink4 = colors.ink4 ?? colors.textTertiary;
  const brassColor = colors.brass;
  const ruleColor = colors.rule ?? colors.border;
  const cardBg = colors.card;

  if (loading && !refreshing) {
    return (
      <ScreenContainer noPadding centered style={{ backgroundColor: bg }}>
        <ListSkeletonLoader variant="card" count={6} />
      </ScreenContainer>
    );
  }

  const firstName = companySettings?.owner?.split(' ')[0] ?? '';
  const hour = new Date().getHours();

  return (
    <ScreenContainer noPadding style={{ backgroundColor: bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brassColor} />
        }
      >
        {/* ─── Page header ─────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={[styles.dayLabel, { color: ink3 }]}>{dayLabel()}</Text>
            {firstName ? (
              <Text style={[styles.greeting, { color: inkColor }]}>
                {greetingPrefix(hour, firstName, t)}
              </Text>
            ) : (
              <Text style={[styles.greeting, { color: inkColor }]}>
                {companySettings?.name ?? 'TailorCraft'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.cardSoft, borderColor: ruleColor }]}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <Settings size={18} color={ink3} />
          </TouchableOpacity>
        </View>

        {/* ─── Banners ─────────────────────────────────────────────────── */}
        {subscriptionState === 'unknown' ? (
          <View style={styles.bannerWrap}>
            <SubscriptionLoadErrorBanner />
          </View>
        ) : null}

        {!isCompanySetupComplete ? (
          <View style={[styles.infoBanner, { borderColor: colors.ocean, backgroundColor: `${colors.ocean}10` }]}>
            <Info size={16} color={colors.ocean} />
            <View style={styles.infoBannerBody}>
              <Text style={[styles.infoBannerTitle, { color: ink2 }]}>
                {t('home.company.incompleteTitle')}
              </Text>
              {missingCompanyFieldKeys.length > 0 ? (
                <Text style={[styles.infoBannerSub, { color: ink3 }]}>
                  {t('home.company.missingFields', {
                    fields: missingCompanyFieldKeys.map((k) => t(k)).join(t('home.company.missingFieldsSeparator')),
                  })}
                </Text>
              ) : null}
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
                <Text style={[styles.infoBannerLink, { color: colors.ocean }]}>
                  {t('home.company.completeNow')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.bannerWrap}>
            <ErrorText>{error}</ErrorText>
          </View>
        ) : null}

        {/* ─── No garments empty state ─────────────────────────────────── */}
        {garments.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyCard, { backgroundColor: cardBg }, AtelierShadow.card]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: `${brassColor}18` }]}>
                <Shirt size={40} color={brassColor} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: inkColor }]}>
                {t('home.noGarments.title')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: ink3 }]}>
                {t('home.noGarments.subtitle')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: brassColor }]}
                onPress={handleAddGarment}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.emptyBtnText}>{t('home.noGarments.button')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* ─── Hero stat card ──────────────────────────────────────── */}
            <View style={[styles.heroCard, { backgroundColor: inkColor }, AtelierShadow.elevated]}>
              <Text style={[styles.heroEyebrow, { color: brassColor }]}>TODAY'S BENCH</Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatNum}>{activeOrders.length}</Text>
                  <Text style={[styles.heroStatLabel, { color: ink4 }]}>Active</Text>
                </View>
                <View style={[styles.heroStatDivider, { backgroundColor: ink2 }]} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatNum}>{ordersDueThisWeek.length}</Text>
                  <Text style={[styles.heroStatLabel, { color: ink4 }]}>Due This Week</Text>
                </View>
                <View style={[styles.heroStatDivider, { backgroundColor: ink2 }]} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatNum}>{clientCount}</Text>
                  <Text style={[styles.heroStatLabel, { color: ink4 }]}>Clients</Text>
                </View>
              </View>
            </View>

            {/* ─── Quick actions strip ─────────────────────────────────── */}
            <View style={styles.quickStrip}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: ruleColor }]}
                onPress={() => router.push('/(tabs)/orders')}
                activeOpacity={0.7}
              >
                <ShoppingBag size={18} color={brassColor} />
                <Text style={[styles.quickBtnLabel, { color: ink2 }]}>Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: ruleColor }]}
                onPress={() => router.push('/(tabs)/gallery')}
                activeOpacity={0.7}
              >
                <Image size={18} color={colors.ocean} />
                <Text style={[styles.quickBtnLabel, { color: ink2 }]}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: ruleColor }]}
                onPress={() => router.push('/financial')}
                activeOpacity={0.7}
              >
                <TrendingUp size={18} color={colors.pine} />
                <Text style={[styles.quickBtnLabel, { color: ink2 }]}>Finance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: cardBg, borderColor: ruleColor }]}
                onPress={() => router.push('/clients')}
                activeOpacity={0.7}
              >
                <Users size={18} color={colors.ember} />
                <Text style={[styles.quickBtnLabel, { color: ink2 }]}>Clients</Text>
              </TouchableOpacity>
            </View>

            {/* ─── Recent orders ───────────────────────────────────────── */}
            {showRecentOrders ? (
              <View style={styles.section}>
                <TCRule
                  label={t('home.needsAttention.title')}
                  count={recentOrders.length}
                  style={styles.sectionRule}
                />

                {recentOrders.length === 0 ? (
                  <View style={[styles.emptyInline, { borderColor: ruleColor }]}>
                    <Text style={[styles.emptyInlineText, { color: ink4 }]}>
                      {t('home.needsAttention.noOrders')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.orderList, { backgroundColor: cardBg, borderColor: ruleColor }, AtelierShadow.card]}>
                    {recentOrders.map((order, idx) => {
                      const statusKey = STATUS_MAP[order.status] ?? 'pending';
                      const statusInfo = AtelierStatus[statusKey];
                      return (
                        <React.Fragment key={order.id}>
                          <TouchableOpacity
                            style={styles.orderRow}
                            onPress={() => handleOrderPress(order.id)}
                            activeOpacity={0.7}
                          >
                            {/* Status rail */}
                            <View style={[styles.orderRail, { backgroundColor: statusInfo.fg }]} />
                            <View style={styles.orderRowBody}>
                              <View style={styles.orderRowTop}>
                                <Text style={[styles.orderNum, { color: inkColor }]}>
                                  #{order.orderNumber}
                                </Text>
                                <Text style={[styles.orderStatusLabel, { color: statusInfo.fg }]}>
                                  {STATUS_LABEL[order.status]}
                                </Text>
                              </View>
                              <Text style={[styles.orderClient, { color: ink3 }]}>
                                {order.customer
                                  ? `${order.customer.firstName} ${order.customer.lastName}`
                                  : '—'}
                              </Text>
                              {order.deliveryDate ? (
                                <Text style={[styles.orderDate, { color: ink4 }]}>
                                  Due {formatDate(order.deliveryDate)}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                          {idx < recentOrders.length - 1 ? (
                            <View style={[styles.orderDivider, { backgroundColor: ruleColor }]} />
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                    <TouchableOpacity
                      style={[styles.viewAllRow, { borderTopColor: ruleColor }]}
                      onPress={() => router.push('/(tabs)/orders')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.viewAllText, { color: brassColor }]}>
                        {t('home.needsAttention.viewAll')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

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
  scrollContent: {},

  // Header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
  },
  pageHeaderLeft: { flex: 1, gap: 2 },
  dayLabel: {
    ...AtelierType.monoSm,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: FontFamily.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: AtelierSpacing.md,
  },

  // Banners
  bannerWrap: {
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.md,
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
    gap: AtelierSpacing.sm,
    alignItems: 'flex-start',
  },
  infoBannerBody: { flex: 1, gap: 4 },
  infoBannerTitle: {
    ...AtelierType.uiMd,
  },
  infoBannerSub: {
    ...AtelierType.uiSm,
  },
  infoBannerLink: {
    ...AtelierType.uiSm,
    textDecorationLine: 'underline',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingTop: AtelierSpacing.xxl * 2,
  },
  emptyCard: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    gap: AtelierSpacing.sm,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: AtelierRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...AtelierType.uiSm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
    marginTop: AtelierSpacing.sm,
  },
  emptyBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#FFF',
  },

  // Hero card
  heroCard: {
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.lg,
  },
  heroEyebrow: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: AtelierSpacing.md,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.md,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroStatNum: {
    fontFamily: FontFamily.monoBold,
    fontSize: 28,
    lineHeight: 34,
    color: '#EFE9DC',
  },
  heroStatLabel: {
    ...AtelierType.monoSm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    opacity: 0.3,
  },

  // Quick actions strip
  quickStrip: {
    flexDirection: 'row',
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.lg,
    gap: AtelierSpacing.sm,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: AtelierSpacing.sm,
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickBtnLabel: {
    ...AtelierType.monoLabel,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  // Orders section
  section: {
    paddingHorizontal: AtelierSpacing.pagePad,
  },
  sectionRule: {
    marginBottom: AtelierSpacing.md,
  },
  emptyInline: {
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
    padding: AtelierSpacing.lg,
    alignItems: 'center',
  },
  emptyInlineText: {
    ...AtelierType.uiSm,
  },

  // Order list card
  orderList: {
    borderRadius: AtelierRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: AtelierSpacing.md,
    paddingRight: AtelierSpacing.md,
  },
  orderRail: {
    width: 3,
    borderRadius: 2,
    marginHorizontal: AtelierSpacing.sm,
    alignSelf: 'stretch',
  },
  orderRowBody: {
    flex: 1,
    gap: 2,
    paddingLeft: 4,
  },
  orderRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNum: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  orderStatusLabel: {
    ...AtelierType.monoLabel,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  orderClient: {
    ...AtelierType.uiSm,
  },
  orderDate: {
    ...AtelierType.monoSm,
    fontSize: 11,
  },
  orderDivider: {
    height: 1,
    marginLeft: AtelierSpacing.lg,
  },
  viewAllRow: {
    padding: AtelierSpacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  viewAllText: {
    ...AtelierType.uiSm,
    textDecorationLine: 'underline',
  },
});
