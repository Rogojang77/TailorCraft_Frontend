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
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Search, Plus, Filter, X } from 'lucide-react-native';
import { ClientListItem } from '@/components/ClientListItem';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { api, apiFetch } from '@/lib/api';
import {
  orderStatusToLabel,
  orderItemsFromMeasurements,
  formatDate,
  customerFullName,
} from '@/lib/api-mappers';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius, StatusStyles } from '@/constants/design';

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
};

const ORDER_STATUS_IDS = ['all', 'PENDING', 'inProgress', 'COMPLETED', 'DELIVERED', 'CANCELLED'] as const;
const CLIENT_ORDER_IDS = ['all', '0', '1', '5', '10'] as const;
const PAYMENT_STATUS_IDS = ['all', 'fully_paid', 'partially_paid', 'unpaid'] as const;
const DATE_RANGE_IDS = ['all', 'today', 'week', 'month', '3months', 'year'] as const;
const AMOUNT_RANGE_IDS = ['all', '0-500', '500-1000', '1000-2000', '2000+'] as const;

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
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { checkCanCreateClient, checkCanCreateOrder, getLimitMessages } = useSubscription();
  const canCreateClient = checkCanCreateClient();
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();
  const [activeTab, setActiveTab] = useState<'clients' | 'orders'>('clients');
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

  return (
    <ScreenContainer noPadding>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('orders.title')}</Text>
        {clients.length > 0 ? (
          <Button
            variant="primaryIcon"
            onPress={() => router.push('/new-order')}
            disabled={!canCreateOrder}
            accessibilityLabel={t('home.addOrder')}
          >
            <Plus size={22} color={Colors.textInverse} strokeWidth={2.5} />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onPress={() => router.push('/clients/new')}
            disabled={!canCreateClient}
            leftIcon={<Plus size={22} color={Colors.textInverse} strokeWidth={2.5} />}
            accessibilityLabel={t('orders.addClient')}
          >
            {t('orders.addClient')}
          </Button>
        )}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <ErrorText>{error}</ErrorText>
        </View>
      ) : null}

      {/* Search Bar and tabs only when there are clients */}
      {clients.length > 0 ? (
        <>
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('orders.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textTertiary}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <Filter 
            size={20} 
            color={
              (orderStatusFilter !== 'all' || 
               clientOrderFilter !== 'all' || 
               paymentStatusFilter !== 'all' ||
               orderDateRangeFilter !== 'all' ||
               totalAmountFilter !== 'all' ||
               advanceAmountFilter !== 'all' ||
               clientDateRangeFilter !== 'all') 
                ? Colors.primary 
                : "#6B7280"
            } 
          />
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
                style={styles.filterChip}
                onPress={() => removeFilter(filter.type)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterChipText}>{filter.label}</Text>
                <X size={14} color="#FFFFFF" strokeWidth={2.5} style={styles.filterChipIcon} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.activeTab]}
          onPress={() => setActiveTab('clients')}
        >
          <Text
            style={[styles.tabText, activeTab === 'clients' && styles.activeTabText]}
          >
            {t('orders.tabs.clients')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text
            style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}
          >
            {t('orders.tabs.orderHistory')}
          </Text>
        </TouchableOpacity>
      </View>
        </>
      ) : null}

      {/* No clients empty state - block order creation and guide to add client */}
      {!loading && !refreshing && clients.length === 0 ? (
        <View style={styles.noClientsContainer}>
          <View style={styles.noClientsCard}>
            <Text style={styles.noClientsTitle}>{t('orders.noClients.title')}</Text>
            <Text style={styles.noClientsSubtitle}>
              {t('orders.noClients.subtitle')}
            </Text>
            {!canCreateClient && <Text style={styles.limitHint}>{limitMsgs.clientLimitReached}</Text>}
            <TouchableOpacity
              style={[styles.addClientButton, !canCreateClient && styles.addClientButtonDisabled]}
              onPress={() => canCreateClient && router.push('/clients/new')}
              disabled={!canCreateClient}
              activeOpacity={0.8}
            >
              <Plus size={20} color={Colors.textInverse} strokeWidth={2.5} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>{t('orders.emptyClients')}</Text>}
          // Performance optimizations for FlatList
          windowSize={5} // Render 5 screens worth of items (reduces memory)
          initialNumToRender={10} // Render 10 items initially
          maxToRenderPerBatch={8} // Render in smaller batches
          removeClippedSubviews={true} // Remove off-screen views from native hierarchy
          // Update cells less frequently for better performance
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>{t('orders.emptyOrders')}</Text>}
          // Performance optimizations for FlatList
          windowSize={5} // Render 5 screens worth of items (reduces memory)
          initialNumToRender={10} // Render 10 items initially
          maxToRenderPerBatch={8} // Render in smaller batches
          removeClippedSubviews={true} // Remove off-screen views from native hierarchy
          // Update cells less frequently for better performance
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('orders.filterTitle')}</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'orders' ? (
              <>
                <Text style={styles.inputLabel}>{t('orders.filters.orderStatus')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {ORDER_STATUS_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        orderStatusFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setOrderStatusFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          orderStatusFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + orderStatusLabelId(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>{t('orders.filters.paymentStatus')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {PAYMENT_STATUS_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        paymentStatusFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setPaymentStatusFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          paymentStatusFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + (id === 'fully_paid' ? 'fullyPaid' : id === 'partially_paid' ? 'partiallyPaid' : 'unpaid'))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>{t('orders.filters.orderDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        orderDateRangeFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setOrderDateRangeFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          orderDateRangeFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + id)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>{t('orders.filters.totalAmount')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {AMOUNT_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        totalAmountFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setTotalAmountFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          totalAmountFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + amountRangeLabelId(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>{t('orders.filters.advance')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {AMOUNT_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        advanceAmountFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setAdvanceAmountFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          advanceAmountFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + amountRangeLabelId(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>{t('orders.filters.orderCount')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {CLIENT_ORDER_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        clientOrderFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setClientOrderFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          clientOrderFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + (id === 'all' ? 'all' : id === '0' ? 'noOrders' : id === '1' ? '1orders' : id === '5' ? '5orders' : '10orders'))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>{t('orders.filters.registrationDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_IDS.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.filterOption,
                        clientDateRangeFilter === id && styles.activeFilterOption,
                      ]}
                      onPress={() => setClientDateRangeFilter(id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          clientDateRangeFilter === id && styles.activeFilterOptionText,
                        ]}
                      >
                        {t('orders.filters.' + id)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setOrderStatusFilter('all');
                  setClientOrderFilter('all');
                  setPaymentStatusFilter('all');
                  setOrderDateRangeFilter('all');
                  setTotalAmountFilter('all');
                  setAdvanceAmountFilter('all');
                  setClientDateRangeFilter('all');
                }}
              >
                <Text style={styles.resetButtonText}>{t('orders.filterReset')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.applyButtonText}>{t('common.apply')}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
  },
  noClientsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  noClientsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    maxWidth: 320,
    ...Shadows.md,
  },
  noClientsTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  noClientsSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  limitHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  addClientButton: {
    flexDirection: 'row',
    gap: Spacing.sm,
    ...ButtonStyles.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  addClientButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  addClientButtonDisabled: {
    opacity: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.md,
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  filterButton: {
    marginLeft: Spacing.md,
  },
  activeFiltersContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterChipIcon: {
    marginLeft: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: '#E5E7EB',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },
  tabText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  errorBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...StatusStyles.error,
    borderRadius: BorderRadius.sm,
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
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  filterSelector: {
    marginBottom: 24,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeFilterOption: {
    backgroundColor: '#D4AF37',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterOptionText: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});