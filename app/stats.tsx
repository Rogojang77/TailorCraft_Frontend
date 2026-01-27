import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, Users, TrendingUp, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { StatsCard } from '@/components/StatsCard';
import { api, apiFetch } from '@/lib/api';
import { Colors, Spacing, Typography, HeaderStyles } from '@/constants/design';
import { ProBadge } from '@/components/ProBadge';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.xl * 2 - Spacing.md) / 2;

type Stats = { 
  totalClients: number; 
  activeOrders: number; 
  monthlyRevenue: number; 
  completedOrders: number 
};

export default function StatsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  
  // Track component mount state for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    
    try {
      const statsRes = await apiFetch<Stats>(api.stats);
      
      // Only update state if component is still mounted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setStats(statsRes);
      }
    } catch (e) {
      // Ignore abort errors
      if (e instanceof Error && e.name !== 'AbortError' && isMountedRef.current) {
        setError(e.message || 'Eroare la încărcarea statisticilor.');
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
        fetchStats();
      }
      return () => {
        // Cleanup on blur
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [fetchStats])
  );

  const onRefresh = () => fetchStats(true);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Statistici</Text>
          <View style={styles.headerRight}>
            <ProBadge size="sm" />
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Statistici</Text>
        <View style={styles.headerRight}>
          <ProBadge size="sm" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.cardWrapper}>
            <StatsCard
              title="Clienți Total"
              value={stats?.totalClients?.toString() ?? '0'}
              icon={<Users size={20} color="#D4AF37" />}
              color="#D4AF37"
            />
          </View>
          <View style={styles.cardWrapper}>
            <StatsCard
              title="Comenzi Active"
              value={stats?.activeOrders?.toString() ?? '0'}
              icon={<Calendar size={20} color="#3B82F6" />}
              color="#3B82F6"
            />
          </View>
          <View style={styles.cardWrapper}>
            <StatsCard
              title="Venit Luna"
              value={`${stats?.monthlyRevenue ?? 0} RON`}
              icon={<TrendingUp size={20} color="#10B981" />}
              color="#10B981"
            />
          </View>
          <View style={styles.cardWrapper}>
            <StatsCard
              title="Comenzi Finalizate"
              value={stats?.completedOrders?.toString() ?? '0'}
              icon={<CheckCircle size={20} color="#8B5CF6" />}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Additional Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prezentare Generală</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Clienți</Text>
              <Text style={styles.infoValue}>{stats?.totalClients ?? 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Comenzi Active</Text>
              <Text style={styles.infoValue}>{stats?.activeOrders ?? 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Comenzi Finalizate</Text>
              <Text style={styles.infoValue}>{stats?.completedOrders ?? 0}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Venit Lunar</Text>
              <Text style={styles.infoValue}>{stats?.monthlyRevenue ?? 0} RON</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
    ...HeaderStyles.container,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  title: {
    ...Typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...Typography.h3,
    color: Colors.textPrimary,
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
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
  },
  bottomSpacer: {
    height: 40,
  },
});
