import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

type ClientListItemData = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  lastOrder: string;
};

type OrderHistoryItemData = {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  advance: number;
  status: string;
  orderDate: string;
  pickupDate: string;
  rawOrderDate: string; // ISO date for filtering
  rawPickupDate: string; // ISO date for filtering
  rawStatus: string; // Original status for filtering
};

const ORDER_STATUSES = [
  { id: 'all', label: 'Toate' },
  { id: 'PENDING', label: 'În așteptare' },
  { id: 'IN_PROGRESS', label: 'În lucru' },
  { id: 'COMPLETED', label: 'Finalizat' },
  { id: 'DELIVERED', label: 'Finalizat' },
  { id: 'CANCELLED', label: 'Anulat' },
];

const CLIENT_ORDER_FILTERS = [
  { id: 'all', label: 'Toți' },
  { id: '0', label: 'Fără comenzi' },
  { id: '1', label: '1+ comenzi' },
  { id: '5', label: '5+ comenzi' },
  { id: '10', label: '10+ comenzi' },
];

const PAYMENT_STATUS_FILTERS = [
  { id: 'all', label: 'Toate' },
  { id: 'fully_paid', label: 'Plătite complet' },
  { id: 'partially_paid', label: 'Plătite parțial' },
  { id: 'unpaid', label: 'Neplătite' },
];

const DATE_RANGE_FILTERS = [
  { id: 'all', label: 'Toate' },
  { id: 'today', label: 'Astăzi' },
  { id: 'week', label: 'Ultima săptămână' },
  { id: 'month', label: 'Ultima lună' },
  { id: '3months', label: 'Ultimele 3 luni' },
  { id: 'year', label: 'Ultimul an' },
];

const AMOUNT_RANGE_FILTERS = [
  { id: 'all', label: 'Toate' },
  { id: '0-500', label: '0 - 500 RON' },
  { id: '500-1000', label: '500 - 1000 RON' },
  { id: '1000-2000', label: '1000 - 2000 RON' },
  { id: '2000+', label: '2000+ RON' },
];

export default function OrdersTab() {
  const router = useRouter();
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
  const [pickupDateRangeFilter, setPickupDateRangeFilter] = useState<string>('all');
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
    const statusParam = orderStatusFilter !== 'all' ? orderStatusFilter : undefined;
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
          dueDate: string | null;
          measurements: Record<string, unknown> | null;
          customer?: { firstName: string; lastName: string };
        }> }>(
          `${api.orders()}?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}${statusParam ? `&status=${encodeURIComponent(statusParam)}` : ''}`
        ),
      ]);
      const cust = customersRes.customers ?? [];
      setClients(
        cust.map((c) => ({
          id: c.id,
          name: customerFullName(c.firstName, c.lastName),
          phone: c.phone,
          totalOrders: c._count?.orders ?? 0,
          lastOrder: '—',
        }))
      );
      const ord = ordersRes.orders ?? [];
      setOrders(
        ord.map((o) => ({
          id: o.id,
          clientName: o.customer
            ? customerFullName(o.customer.firstName, o.customer.lastName)
            : '—',
          items: orderItemsFromMeasurements(o.measurements),
          total: o.totalAmount,
          advance: o.paidAmount,
          status: orderStatusToLabel(o.status),
          orderDate: formatDate(o.orderDate),
          pickupDate: formatDate(o.dueDate ?? o.orderDate),
          rawOrderDate: o.orderDate,
          rawPickupDate: o.dueDate ?? o.orderDate,
          rawStatus: o.status,
        }))
      );
    } catch (e) {
      // Ignore abort errors
      if (e instanceof Error && e.name !== 'AbortError' && isMountedRef.current) {
        setError(e.message || 'Eroare la încărcarea datelor.');
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
      if (isMountedRef.current) {
        fetchData();
      }
      return () => {
        // Cleanup on blur
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [fetchData])
  );

  useEffect(() => {
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
  }, [searchQuery, orderStatusFilter, fetchData]);

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
        Alert.alert('Succes', 'Clientul și toate comenzile au fost șterse.');
      } else {
        await apiFetch(api.orders(deleteTarget.id), { method: 'DELETE' });
        Alert.alert('Succes', 'Comanda a fost ștearsă.');
      }
      setDeleteTarget(null);
      await fetchData(true);
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut șterge.');
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
    
    // Filter by pickup date range
    if (pickupDateRangeFilter !== 'all') {
      filtered = filtered.filter(order => isDateInRange(order.rawPickupDate, pickupDateRangeFilter));
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
  }, [orders, paymentStatusFilter, orderDateRangeFilter, pickupDateRangeFilter, totalAmountFilter, advanceAmountFilter]);

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
        const status = ORDER_STATUSES.find(s => s.id === orderStatusFilter);
        if (status) active.push({ id: 'orderStatus', label: status.label, type: 'orderStatus' });
      }
      if (paymentStatusFilter !== 'all') {
        const payment = PAYMENT_STATUS_FILTERS.find(p => p.id === paymentStatusFilter);
        if (payment) active.push({ id: 'paymentStatus', label: payment.label, type: 'paymentStatus' });
      }
      if (orderDateRangeFilter !== 'all') {
        const dateRange = DATE_RANGE_FILTERS.find(d => d.id === orderDateRangeFilter);
        if (dateRange) active.push({ id: 'orderDate', label: `Data: ${dateRange.label}`, type: 'orderDate' });
      }
      if (pickupDateRangeFilter !== 'all') {
        const dateRange = DATE_RANGE_FILTERS.find(d => d.id === pickupDateRangeFilter);
        if (dateRange) active.push({ id: 'pickupDate', label: `Ridicare: ${dateRange.label}`, type: 'pickupDate' });
      }
      if (totalAmountFilter !== 'all') {
        const amount = AMOUNT_RANGE_FILTERS.find(a => a.id === totalAmountFilter);
        if (amount) active.push({ id: 'totalAmount', label: `Total: ${amount.label}`, type: 'totalAmount' });
      }
      if (advanceAmountFilter !== 'all') {
        const amount = AMOUNT_RANGE_FILTERS.find(a => a.id === advanceAmountFilter);
        if (amount) active.push({ id: 'advanceAmount', label: `Avans: ${amount.label}`, type: 'advanceAmount' });
      }
    } else {
      if (clientOrderFilter !== 'all') {
        const filter = CLIENT_ORDER_FILTERS.find(f => f.id === clientOrderFilter);
        if (filter) active.push({ id: 'clientOrders', label: filter.label, type: 'clientOrders' });
      }
      if (clientDateRangeFilter !== 'all') {
        const dateRange = DATE_RANGE_FILTERS.find(d => d.id === clientDateRangeFilter);
        if (dateRange) active.push({ id: 'clientDate', label: `Data: ${dateRange.label}`, type: 'clientDate' });
      }
    }
    
    return active;
  }, [
    activeTab,
    orderStatusFilter,
    paymentStatusFilter,
    orderDateRangeFilter,
    pickupDateRangeFilter,
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
      case 'pickupDate':
        setPickupDateRangeFilter('all');
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Comenzi & Clienți</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/new-order')}
          activeOpacity={0.8}
        >
          <Plus size={22} color={Colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Caută după nume sau telefon..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
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
               pickupDateRangeFilter !== 'all' ||
               totalAmountFilter !== 'all' ||
               advanceAmountFilter !== 'all' ||
               clientDateRangeFilter !== 'all') 
                ? Colors.primary 
                : "#6B7280"
            } 
          />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Active Filters */}
      {getActiveFilters.length > 0 && (
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
            Clienți ({filteredClients.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text
            style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}
          >
            Istoricul Comenzilor ({filteredOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>Niciun client găsit.</Text>}
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
          ListEmptyComponent={<Text style={styles.emptyText}>Nicio comandă găsită.</Text>}
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
            <Text style={styles.modalTitle}>Filtrează</Text>
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
                <Text style={styles.inputLabel}>Status comandă</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {ORDER_STATUSES.map((status) => (
                    <TouchableOpacity
                      key={status.id}
                      style={[
                        styles.filterOption,
                        orderStatusFilter === status.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setOrderStatusFilter(status.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          orderStatusFilter === status.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Status plată</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {PAYMENT_STATUS_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        paymentStatusFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setPaymentStatusFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          paymentStatusFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Data comenzii</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        orderDateRangeFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setOrderDateRangeFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          orderDateRangeFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Data ridicării</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        pickupDateRangeFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setPickupDateRangeFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          pickupDateRangeFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Valoare totală</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {AMOUNT_RANGE_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        totalAmountFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setTotalAmountFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          totalAmountFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Avans</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {AMOUNT_RANGE_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        advanceAmountFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setAdvanceAmountFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          advanceAmountFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Număr comenzi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {CLIENT_ORDER_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        clientOrderFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setClientOrderFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          clientOrderFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Data înregistrării</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterSelector}>
                  {DATE_RANGE_FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterOption,
                        clientDateRangeFilter === filter.id && styles.activeFilterOption,
                      ]}
                      onPress={() => setClientDateRangeFilter(filter.id)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          clientDateRangeFilter === filter.id && styles.activeFilterOptionText,
                        ]}
                      >
                        {filter.label}
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
                  setPickupDateRangeFilter('all');
                  setTotalAmountFilter('all');
                  setAdvanceAmountFilter('all');
                  setClientDateRangeFilter('all');
                }}
              >
                <Text style={styles.resetButtonText}>Resetează filtrele</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.applyButtonText}>Aplică</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <DeleteConfirmModal
        visible={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === 'client' ? 'Șterge client' : 'Șterge comandă'}
        message={
          deleteTarget
            ? deleteTarget.type === 'client'
              ? `Sigur ștergi „${deleteTarget.name}"? Toate comenzile clientului vor fi șterse.`
              : `Sigur ștergi comanda pentru „${deleteTarget.clientName}"?`
            : ''
        }
        confirmLabel="Șterge"
        loading={deleteLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    ...HeaderStyles.container,
  },
  title: {
    ...Typography.h2,
  },
  addButton: {
    ...ButtonStyles.primaryIcon,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
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
    marginHorizontal: Spacing.xl,
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
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  errorBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
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