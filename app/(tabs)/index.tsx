import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ClientCard } from '@/components/ClientCard';
import { OrderCard } from '@/components/OrderCard';
import { api, apiFetch } from '@/lib/api';
import {
  orderStatusToLabel,
  orderItemsFromMeasurements,
  formatDate,
  customerFullName,
} from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows } from '@/constants/design';
import { ProBadge } from '@/components/ProBadge';

const { width } = Dimensions.get('window');

type ClientCardData = { id: string; name: string; phone: string; lastOrder: string };
type OrderCardData = {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  status: string;
  pickupDate: string;
};

export default function HomeTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentClients, setRecentClients] = useState<ClientCardData[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderCardData[]>([]);
  
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
      const [customersRes, ordersRes] = await Promise.all([
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
          dueDate: string | null;
          orderDate: string;
          measurements: Record<string, unknown> | null;
          customer?: { id: string; firstName: string; lastName: string; phone: string };
        }> }>(`${api.orders()}?limit=20`),
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
        status: orderStatusToLabel(o.status),
        pickupDate: formatDate(o.dueDate ?? o.orderDate),
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
      
      // Only update state if component is still mounted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setRecentClients(clients);
      }
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

  const onRefresh = () => fetchData(true);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Bună ziua!</Text>
              <ProBadge size="sm" style={{ marginLeft: 12 }} />
            </View>
            <Text style={styles.welcomeText}>Bine ați venit în TailorCraft</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/new-order')}
            activeOpacity={0.8}
          >
            <Plus size={22} color={Colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Recent Clients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Clienți Recenți</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.seeAllText}>Vezi toți</Text>
            </TouchableOpacity>
          </View>
          {recentClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Niciun client găsit.</Text>
            </View>
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
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Comenzi Recente</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.seeAllText}>Vezi toate</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nicio comandă recentă.</Text>
            </View>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  greeting: {
    ...Typography.h1,
    fontSize: 28,
  },
  welcomeText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addButton: {
    ...ButtonStyles.primaryIcon,
  },
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  seeAllText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
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
  errorBanner: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
  },
  emptyState: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});