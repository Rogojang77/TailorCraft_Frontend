import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Search, Plus, Filter, X } from 'lucide-react-native';
import { ClientListItem } from '@/components/ClientListItem';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import {
  api,
  apiFetch,
  orderStatusToLabel,
  orderItemsFromMeasurements,
  formatDate,
  customerFullName,
} from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierType, AtelierShadow } from '@/constants/atelierDesign';

type ClientListItemData = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  lastOrder: string;
};

type OrderHistoryItemData = {
  id: string;
  orderNumber: string;
  clientName: string;
  items: string[];
  total: number;
  advance: number;
  status: string;
  orderDate: string;
  rawOrderDate: string; // ISO date for filtering
  rawStatus: string; // Original status for filtering
  deliveryDate?: string | null;
};

const ORDER_STATUS_IDS = ['all', 'PENDING', 'inProgress', 'COMPLETED', 'DELIVERED', 'CANCELLED'] as const;
const CLIENT_ORDER_IDS = ['all', '0', '1', '5', '10'] as const;
const PAYMENT_STATUS_IDS = ['all', 'fully_paid', 'partially_paid', 'unpaid'] as const;
const DATE_RANGE_IDS = ['all', 'today', 'week', 'month', '3months', 'year'] as const;
const AMOUNT_RANGE_IDS = ['all', '0-500', '500-1000', '1000-2000', '2000+'] as const;

type OrderFilterState = {
  orderStatusFilter: string;
  clientOrderFilter: string;
  paymentStatusFilter: string;
  orderDateRangeFilter: string;
  totalAmountFilter: string;
  advanceAmountFilter: string;
  clientDateRangeFilter: string;
};

const ORDER_FILTER_PRESETS: Array<{
  id: string;
  labelKey: string;
  values: OrderFilterState;
}> = [
  {
    id: 'activeOrders',
    labelKey: 'presetActiveOrders',
    values: {
      orderStatusFilter: 'inProgress',
      clientOrderFilter: 'all',
      paymentStatusFilter: 'all',
      orderDateRangeFilter: 'all',
      totalAmountFilter: 'all',
      advanceAmountFilter: 'all',
      clientDateRangeFilter: 'all',
    },
  },
  {
    id: 'unpaid',
    labelKey: 'presetUnpaid',
    values: {
      orderStatusFilter: 'all',
      clientOrderFilter: 'all',
      paymentStatusFilter: 'unpaid',
      orderDateRangeFilter: 'all',
      totalAmountFilter: 'all',
      advanceAmountFilter: 'all',
      clientDateRangeFilter: 'all',
    },
  },
  {
    id: 'partiallyPaid',
    labelKey: 'presetPartiallyPaid',
    values: {
      orderStatusFilter: 'all',
      clientOrderFilter: 'all',
      paymentStatusFilter: 'partially_paid',
      orderDateRangeFilter: 'all',
      totalAmountFilter: 'all',
      advanceAmountFilter: 'all',
      clientDateRangeFilter: 'all',
    },
  },
];

function orderStatusLabelId(id: string): string {
  if (id === 'all') return 'all';
  if (id === 'DELIVERED') return 'completed';
  if (id === 'inProgress') return 'inProgress';
  return id.toLowerCase();
}
function amountRangeLabelId(id: string): string {
  if (id === 'all') return 'all';
  const map: Record<string, string> = {
    '0-500': 'amount0_500',
    '500-1000': 'amount500_1000',
    '1000-2000': 'amount1000_2000',
    '2000+': 'amount2000plus',
  };
  return map[id] ?? id;
}

export default function OrdersTab() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { checkCanCreateClient, checkCanCreateOrder, getLimitMessages } = useSubscription();
  const canCreateClient = checkCanCreateClient();
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();

  const [activeTab, setActiveTab] = useState<'clients' | 'orders'>('orders');
  // Home's quick buttons open this screen on a given tab (?tab=clients | orders).
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => {
    if (tab === 'clients' || tab === 'orders') setActiveTab(tab);
  }, [tab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientListItemData[]>([]);
  const [orders, setOrders] = useState<OrderHistoryItemData[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'client'; id: string; name: string } | { type: 'order'; id: string; clientName: string } | null
  >(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [clientOrderFilter, setClientOrderFilter] = useState<string>('all');
  // Order filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [orderDateRangeFilter, setOrderDateRangeFilter] = useState<string>('all');
  const [totalAmountFilter, setTotalAmountFilter] = useState<string>('all');
  const [advanceAmountFilter, setAdvanceAmountFilter] = useState<string>('all');
  // Client filters
  const [clientDateRangeFilter, setClientDateRangeFilter] = useState<string>('all');
  const searchRef = useRef(searchQuery);
  searchRef.current = searchQuery;
  
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
    const search = searchRef.current.trim() || undefined;
    const statusParam =
      orderStatusFilter !== 'all'
        ? orderStatusFilter === 'inProgress'
          ? 'IN_PROGRESS'
          : orderStatusFilter
        : undefined;
    try {
      const [customersRes, ordersRes] = await Promise.all([
        apiFetch<{ customers: Array<{
          id: string;
          firstName: string;
          lastName: string;
          phone: string;
          _count?: { orders: number };
        }> }>(
          `${api.customers()}?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`
        ),
        apiFetch<{ orders: Array<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          deliveryDate?: string | null;
          measurements: Record<string, unknown> | null;
          customer?: { id: string; firstName: string; lastName: string };
        }> }>(
          `${api.orders()}?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}${statusParam ? `&status=${encodeURIComponent(statusParam)}` : ''}`
        ),
      ]);
      const ord = ordersRes.orders ?? [];
      
      // Create a map of customer ID to their most recent order date
      const customerLastOrderMap = new Map<string, string>();
      for (const o of ord) {
        if (!o.customer || !('id' in o.customer)) continue;
        const customerId = o.customer.id;
        const existing = customerLastOrderMap.get(customerId);
        if (!existing || o.orderDate > existing) {
          customerLastOrderMap.set(customerId, o.orderDate);
        }
      }
      
      const cust = customersRes.customers ?? [];
      setClients(
        cust.map((c) => {
          const lastOrderDate = customerLastOrderMap.get(c.id);
          return {
            id: c.id,
            name: customerFullName(c.firstName, c.lastName),
            phone: c.phone,
            totalOrders: c._count?.orders ?? 0,
            lastOrder: lastOrderDate ? formatDate(lastOrderDate) : '—',
          };
        })
      );
      setOrders(
        ord.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          clientName: o.customer
            ? customerFullName(o.customer.firstName, o.customer.lastName)
            : '—',
          items: orderItemsFromMeasurements(o.measurements),
          total: o.totalAmount,
          advance: o.paidAmount,
          status: o.status, // Pass raw status code for color-coding
          orderDate: formatDate(o.orderDate),
          rawOrderDate: o.orderDate,
          rawStatus: o.status,
          deliveryDate: o.deliveryDate ?? null,
        }))
      );
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
  }, [orderStatusFilter]);

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

  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setTimeout(() => {
      if (isMountedRef.current) {
        fetchData();
      }
    }, 300);
    return () => {
      clearTimeout(t);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, searchQuery, orderStatusFilter, fetchData]);

  const onRefresh = () => fetchData(true);

  const handleDeleteClient = (client: ClientListItemData) => {
    setDeleteTarget({ type: 'client', id: client.id, name: client.name });
  };

  const handleDeleteOrder = (order: OrderHistoryItemData) => {
    setDeleteTarget({ type: 'order', id: order.id, clientName: order.clientName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'client') {
        await apiFetch(api.customers(deleteTarget.id), { method: 'DELETE' });
        Alert.alert(t('common.success'), t('orders.deleteSuccessClient'));
      } else {
        await apiFetch(api.orders(deleteTarget.id), { method: 'DELETE' });
        Alert.alert(t('common.success'), t('orders.deleteSuccessOrder'));
      }
      setDeleteTarget(null);
      await fetchData(true);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orders.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper function to check if date is within range
  const isDateInRange = (dateStr: string, range: string): boolean => {
    if (range === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return date >= today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return date >= monthAgo;
      case '3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return date >= threeMonthsAgo;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return date >= yearAgo;
      default:
        return true;
    }
  };

  // Helper function to check if amount is in range
  const isAmountInRange = (amount: number, range: string): boolean => {
    if (range === 'all') return true;
    switch (range) {
      case '0-500':
        return amount >= 0 && amount <= 500;
      case '500-1000':
        return amount > 500 && amount <= 1000;
      case '1000-2000':
        return amount > 1000 && amount <= 2000;
      case '2000+':
        return amount > 2000;
      default:
        return true;
    }
  };

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredClients = useMemo(() => {
    let filtered = clients;
    
    // Filter by order count
    if (clientOrderFilter !== 'all') {
      const minOrders = parseInt(clientOrderFilter);
      filtered = filtered.filter(client => client.totalOrders >= minOrders);
    }
    
    // Filter by date range (registration date - would need createdAt from API)
    // For now, we'll skip this as we don't have createdAt in the current data
    
    return filtered;
  }, [clients, clientOrderFilter, clientDateRangeFilter]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    // Filter by payment status
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(order => {
        const isFullyPaid = order.advance >= order.total;
        const isPartiallyPaid = order.advance > 0 && order.advance < order.total;
        const isUnpaid = order.advance === 0;
        
        switch (paymentStatusFilter) {
          case 'fully_paid':
            return isFullyPaid;
          case 'partially_paid':
            return isPartiallyPaid;
          case 'unpaid':
            return isUnpaid;
          default:
            return true;
        }
      });
    }
    
    // Filter by order date range
    if (orderDateRangeFilter !== 'all') {
      filtered = filtered.filter(order => isDateInRange(order.rawOrderDate, orderDateRangeFilter));
    }
    
    // Filter by total amount range
    if (totalAmountFilter !== 'all') {
      filtered = filtered.filter(order => isAmountInRange(order.total, totalAmountFilter));
    }
    
    // Filter by advance amount range
    if (advanceAmountFilter !== 'all') {
      filtered = filtered.filter(order => isAmountInRange(order.advance, advanceAmountFilter));
    }
    
    return filtered;
  }, [orders, paymentStatusFilter, orderDateRangeFilter, totalAmountFilter, advanceAmountFilter]);

  // Memoize callbacks to prevent re-renders
  const handleClientPress = useCallback((clientId: string) => {
    router.push(`/client-details/${clientId}`);
  }, [router]);

  const handleOrderPress = useCallback((orderId: string) => {
    router.push(`/order-details/${orderId}`);
  }, [router]);

  const handleClientDelete = useCallback((client: ClientListItemData) => {
    handleDeleteClient(client);
  }, [handleDeleteClient]);

  const handleOrderDelete = useCallback((order: OrderHistoryItemData) => {
    handleDeleteOrder(order);
  }, [handleDeleteOrder]);

  // Memoized render functions for FlatList
  const renderClientItem = useCallback(({ item }: { item: ClientListItemData }) => (
    <ClientListItem
      client={item}
      onPress={() => handleClientPress(item.id)}
      onDelete={() => handleClientDelete(item)}
    />
  ), [handleClientPress, handleClientDelete]);

  const renderOrderItem = useCallback(({ item }: { item: OrderHistoryItemData }) => (
    <OrderHistoryItem
      order={item}
      onPress={() => handleOrderPress(item.id)}
      onDelete={() => handleOrderDelete(item)}
    />
  ), [handleOrderPress, handleOrderDelete]);

  const keyExtractorClients = useCallback((item: ClientListItemData) => item.id, []);
  const keyExtractorOrders = useCallback((item: OrderHistoryItemData) => item.id, []);

  // Get active filters to display as chips
  const getActiveFilters = useMemo(() => {
    const active: Array<{ id: string; label: string; type: string }> = [];
    
    if (activeTab === 'orders') {
      if (orderStatusFilter !== 'all') {
        active.push({ id: 'orderStatus', label: t('orders.filters.' + orderStatusLabelId(orderStatusFilter)), type: 'orderStatus' });
      }
      if (paymentStatusFilter !== 'all') {
        const key = paymentStatusFilter === 'fully_paid' ? 'fullyPaid' : paymentStatusFilter === 'partially_paid' ? 'partiallyPaid' : 'unpaid';
        active.push({ id: 'paymentStatus', label: t('orders.filters.' + key), type: 'paymentStatus' });
      }
      if (orderDateRangeFilter !== 'all') {
        active.push({ id: 'orderDate', label: t('orders.filters.dateLabel', { label: t('orders.filters.' + orderDateRangeFilter) }), type: 'orderDate' });
      }
      if (totalAmountFilter !== 'all') {
        active.push({ id: 'totalAmount', label: t('orders.filters.totalLabel', { label: t('orders.filters.' + amountRangeLabelId(totalAmountFilter)) }), type: 'totalAmount' });
      }
      if (advanceAmountFilter !== 'all') {
        active.push({ id: 'advanceAmount', label: t('orders.filters.advanceLabel', { label: t('orders.filters.' + amountRangeLabelId(advanceAmountFilter)) }), type: 'advanceAmount' });
      }
    } else {
      if (clientOrderFilter !== 'all') {
        const key = clientOrderFilter === '0' ? 'noOrders' : clientOrderFilter === '1' ? '1orders' : clientOrderFilter === '5' ? '5orders' : '10orders';
        active.push({ id: 'clientOrders', label: t('orders.filters.' + key), type: 'clientOrders' });
      }
      if (clientDateRangeFilter !== 'all') {
        active.push({ id: 'clientDate', label: t('orders.filters.dateLabel', { label: t('orders.filters.' + clientDateRangeFilter) }), type: 'clientDate' });
      }
    }
    
    return active;
  }, [
    t,
    activeTab,
    orderStatusFilter,
    paymentStatusFilter,
    orderDateRangeFilter,
    totalAmountFilter,
    advanceAmountFilter,
    clientOrderFilter,
    clientDateRangeFilter,
  ]);

  const removeFilter = useCallback((type: string) => {
    switch (type) {
      case 'orderStatus':
        setOrderStatusFilter('all');
        break;
      case 'paymentStatus':
        setPaymentStatusFilter('all');
        break;
      case 'orderDate':
        setOrderDateRangeFilter('all');
        break;
      case 'totalAmount':
        setTotalAmountFilter('all');
        break;
      case 'advanceAmount':
        setAdvanceAmountFilter('all');
        break;
      case 'clientOrders':
        setClientOrderFilter('all');
        break;
      case 'clientDate':
        setClientDateRangeFilter('all');
        break;
    }
  }, []);

  const resetAllFilters = useCallback(() => {
    setOrderStatusFilter('all');
    setClientOrderFilter('all');
    setPaymentStatusFilter('all');
    setOrderDateRangeFilter('all');
    setTotalAmountFilter('all');
    setAdvanceAmountFilter('all');
    setClientDateRangeFilter('all');
  }, []);

  const currentFilterState: OrderFilterState = useMemo(
    () => ({
      orderStatusFilter,
      clientOrderFilter,
      paymentStatusFilter,
      orderDateRangeFilter,
      totalAmountFilter,
      advanceAmountFilter,
      clientDateRangeFilter,
    }),
    [
      orderStatusFilter,
      clientOrderFilter,
      paymentStatusFilter,
      orderDateRangeFilter,
      totalAmountFilter,
      advanceAmountFilter,
      clientDateRangeFilter,
    ]
  );

  const applyPreset = useCallback(
    (preset: (typeof ORDER_FILTER_PRESETS)[number]) => {
      const v = preset.values;
      setOrderStatusFilter(v.orderStatusFilter);
      setClientOrderFilter(v.clientOrderFilter);
      setPaymentStatusFilter(v.paymentStatusFilter);
      setOrderDateRangeFilter(v.orderDateRangeFilter);
      setTotalAmountFilter(v.totalAmountFilter);
      setAdvanceAmountFilter(v.advanceAmountFilter);
      setClientDateRangeFilter(v.clientDateRangeFilter);
    },
    []
  );

  const isPresetActive = useCallback(
    (preset: (typeof ORDER_FILTER_PRESETS)[number]) => {
      const v = preset.values;
      return (
        currentFilterState.orderStatusFilter === v.orderStatusFilter &&
        currentFilterState.clientOrderFilter === v.clientOrderFilter &&
        currentFilterState.paymentStatusFilter === v.paymentStatusFilter &&
        currentFilterState.orderDateRangeFilter === v.orderDateRangeFilter &&
        currentFilterState.totalAmountFilter === v.totalAmountFilter &&
        currentFilterState.advanceAmountFilter === v.advanceAmountFilter &&
        currentFilterState.clientDateRangeFilter === v.clientDateRangeFilter
      );
    },
    [currentFilterState]
  );

  const hasFilters = orderStatusFilter !== 'all' || clientOrderFilter !== 'all' ||
    paymentStatusFilter !== 'all' || orderDateRangeFilter !== 'all' ||
    totalAmountFilter !== 'all' || advanceAmountFilter !== 'all' || clientDateRangeFilter !== 'all';

  const inkColor = colors.textPrimary;
  const ink3 = colors.ink3 ?? colors.textSecondary;
  const ink4 = colors.ink4 ?? colors.textTertiary;
  const brassColor = colors.brass;
  const bg = colors.paper;
  const cardBg = colors.card;
  const ruleColor = colors.rule ?? colors.border;

  return (
    <ScreenContainer noPadding style={{ backgroundColor: bg }}>
      {error ? (
        <View style={styles.errorBanner}>
          <ErrorText>{error}</ErrorText>
        </View>
      ) : null}

      {/* Search Bar and tabs only when there are clients */}
      {clients.length > 0 ? (
        <>
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: cardBg, borderColor: ruleColor }]}>
          <Search size={18} color={ink3} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: inkColor }]}
            placeholder={t('orders.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={ink4}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Filter size={18} color={hasFilters ? brassColor : ink3} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: brassColor }]}
          onPress={() => router.push('/new-order')}
          disabled={!canCreateOrder}
          activeOpacity={0.85}
        >
          <Plus size={20} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {clients.length > 0 && getActiveFilters.length > 0 && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {getActiveFilters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, { backgroundColor: `${brassColor}18`, borderColor: `${brassColor}40` }]}
                onPress={() => removeFilter(filter.type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: brassColor }]}>{filter.label}</Text>
                <X size={12} color={brassColor} strokeWidth={2.5} style={styles.filterChipIcon} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.resetFiltersChip, { borderColor: ruleColor }]}
              onPress={resetAllFilters}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetFiltersChipText, { color: ink3 }]}>{t('orders.filterReset')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.paperDeep ?? colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && [styles.activeTab, { backgroundColor: cardBg }]]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, { color: ink4 }, activeTab === 'orders' && { color: brassColor }]}>
            {t('orders.tabs.orderHistory')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && [styles.activeTab, { backgroundColor: cardBg }]]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[styles.tabText, { color: ink4 }, activeTab === 'clients' && { color: brassColor }]}>
            {t('orders.tabs.clients')}
          </Text>
        </TouchableOpacity>
      </View>
        </>
      ) : null}

      {/* No clients empty state */}
      {!loading && !refreshing && clients.length === 0 ? (
        <View style={styles.noClientsContainer}>
          <View style={[styles.noClientsCard, { backgroundColor: cardBg }, AtelierShadow.card]}>
            <Text style={[styles.noClientsTitle, { color: inkColor }]}>{t('orders.noClients.title')}</Text>
            <Text style={[styles.noClientsSubtitle, { color: ink3 }]}>
              {t('orders.noClients.subtitle')}
            </Text>
            {!canCreateClient && <Text style={[styles.limitHint, { color: ink3 }]}>{limitMsgs.clientLimitReached}</Text>}
            <TouchableOpacity
              style={[styles.addClientButton, { backgroundColor: brassColor }, !canCreateClient && styles.addClientButtonDisabled]}
              onPress={() => canCreateClient && router.push('/clients/new')}
              disabled={!canCreateClient}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.addClientButtonText}>{t('orders.noClients.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.content}>
          <ListSkeletonLoader variant="row" count={8} />
        </View>
      ) : activeTab === 'clients' ? (
        <FlatList
          data={filteredClients}
          keyExtractor={keyExtractorClients}
          renderItem={renderClientItem}
          style={styles.content}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brassColor} />
          }
          ListEmptyComponent={<Text style={[styles.emptyText, { color: ink4 }]}>{t('orders.emptyClients')}</Text>}
          windowSize={5}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={keyExtractorOrders}
          renderItem={renderOrderItem}
          style={styles.content}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brassColor} />
          }
          ListEmptyComponent={<Text style={[styles.emptyText, { color: ink4 }]}>{t('orders.emptyOrders')}</Text>}
          windowSize={5}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: ruleColor }]}>
            <Text style={[styles.modalTitle, { color: inkColor }]}>{t('orders.filterTitle')}</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeButton}>
              <X size={22} color={inkColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'orders' ? (
              <>
                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.presetsLabel')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {ORDER_FILTER_PRESETS.map((preset) => {
                    const active = isPresetActive(preset);
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.filterOption,
                          { backgroundColor: cardBg, borderColor: ruleColor },
                          active && { backgroundColor: brassColor, borderColor: brassColor },
                        ]}
                        onPress={() => applyPreset(preset)}
                      >
                        <Text style={[styles.filterOptionText, { color: ink3 }, active && { color: '#FFF' }]}>
                          {t('orders.filters.' + preset.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.orderStatus')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {ORDER_STATUS_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        orderStatusFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setOrderStatusFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, orderStatusFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + orderStatusLabelId(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.paymentStatus')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {PAYMENT_STATUS_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        paymentStatusFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setPaymentStatusFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, paymentStatusFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + (id === 'fully_paid' ? 'fullyPaid' : id === 'partially_paid' ? 'partiallyPaid' : 'unpaid'))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.orderDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        orderDateRangeFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setOrderDateRangeFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, orderDateRangeFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + id)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.totalAmount')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {AMOUNT_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        totalAmountFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setTotalAmountFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, totalAmountFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + amountRangeLabelId(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.advance')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {AMOUNT_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        advanceAmountFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setAdvanceAmountFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, advanceAmountFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + amountRangeLabelId(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.orderCount')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {CLIENT_ORDER_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        clientOrderFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setClientOrderFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, clientOrderFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + (id === 'all' ? 'all' : id === '0' ? 'noOrders' : id === '1' ? '1orders' : id === '5' ? '5orders' : '10orders'))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: ink3 }]}>{t('orders.filters.registrationDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        { backgroundColor: cardBg, borderColor: ruleColor },
                        clientDateRangeFilter === id && { backgroundColor: brassColor, borderColor: brassColor },
                      ]}
                      onPress={() => setClientDateRangeFilter(id)}
                    >
                      <Text style={[styles.filterOptionText, { color: ink3 }, clientDateRangeFilter === id && { color: '#FFF' }]}>
                        {t('orders.filters.' + id)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: cardBg, borderColor: ruleColor }]}
                onPress={resetAllFilters}
              >
                <Text style={[styles.resetButtonText, { color: ink3 }]}>{t('orders.filterReset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: brassColor }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.applyButtonText, { color: '#FFF' }]}>{t('common.apply')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <DeleteConfirmModal
        visible={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === 'client' ? t('orders.deleteClient') : t('orders.deleteOrder')}
        message={
          deleteTarget
            ? deleteTarget.type === 'client'
              ? t('orders.deleteClientMessage', { name: deleteTarget.name })
              : t('orders.deleteOrderMessage', { name: deleteTarget.clientName })
            : ''
        }
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noClientsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.pagePad,
  },
  noClientsCard: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    gap: AtelierSpacing.sm,
  },
  noClientsTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  noClientsSubtitle: {
    ...AtelierType.uiSm,
    textAlign: 'center',
    lineHeight: 20,
  },
  limitHint: {
    ...AtelierType.uiXs,
    textAlign: 'center',
  },
  addClientButton: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
    marginTop: AtelierSpacing.sm,
  },
  addClientButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#FFF',
  },
  addClientButtonDisabled: { opacity: 0.5 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: AtelierRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: AtelierSpacing.pagePad,
    marginTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
    gap: AtelierSpacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
    paddingHorizontal: AtelierSpacing.md,
    minHeight: 40,
  },
  searchIcon: { marginRight: AtelierSpacing.sm },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: 14,
    paddingVertical: 0,
    minHeight: 40,
  },
  filterButton: { marginLeft: AtelierSpacing.sm },
  activeFiltersContainer: {
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.sm,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: 4,
    borderRadius: AtelierRadius.xs,
    borderWidth: 1,
    gap: 4,
  },
  filterChipText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  filterChipIcon: { marginLeft: 2 },
  resetFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: 4,
    borderRadius: AtelierRadius.xs,
    borderWidth: 1,
    alignSelf: 'center',
  },
  resetFiltersChipText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#3F362A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  tabText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  content: { flex: 1 },
  listContainer: {
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingBottom: AtelierSpacing.md,
  },
  errorBanner: {
    marginHorizontal: AtelierSpacing.pagePad,
    marginBottom: AtelierSpacing.sm,
  },
  emptyText: {
    ...AtelierType.uiSm,
    textAlign: 'center',
    paddingVertical: AtelierSpacing.xxl,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingVertical: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
  },
  closeButton: { padding: 4 },
  modalContent: {
    flex: 1,
    padding: AtelierSpacing.pagePad,
  },
  inputLabel: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: AtelierSpacing.sm,
    marginTop: AtelierSpacing.md,
  },
  filterSelector: { marginBottom: AtelierSpacing.md },
  filterOption: {
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: 8,
    borderRadius: AtelierRadius.xs,
    marginRight: AtelierSpacing.sm,
    borderWidth: 1,
  },
  filterOptionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    marginTop: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.lg,
  },
  resetButton: {
    flex: 1,
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  resetButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
  },
  applyButton: {
    flex: 1,
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#FFF',
  },
});