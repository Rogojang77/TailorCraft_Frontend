import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Package, Shirt, Contact as PantsIcon, Check } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { api, apiFetch } from '@/lib/api';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

export default function NewOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { draftOrder, loadOrderData } = useOrderDraft();
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load order data if orderId is provided
  const fetchOrderData = useCallback(async () => {
    const orderId = params.orderId;
    if (!orderId || draftOrder.orderId === orderId) return; // Already loaded or no orderId

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const order = await apiFetch<{
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        paidAmount: number;
        orderDate: string;
        dueDate: string | null;
        paymentMethod: string | null;
        measurements: Record<string, Record<string, unknown>> | null;
        customer?: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
        notes?: string | null;
      }>(api.orders(orderId));

      if (isMountedRef.current) {
        loadOrderData({
          id: order.id,
          customer: order.customer,
          measurements: order.measurements,
          totalAmount: order.totalAmount,
          paidAmount: order.paidAmount,
          paymentMethod: order.paymentMethod,
          dueDate: order.dueDate,
          notes: order.notes,
        });
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load order data:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [params.orderId, draftOrder.orderId, loadOrderData]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current && params.orderId) {
      fetchOrderData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchOrderData, params.orderId]);

  // Check completion status
  const isClientCompleted = !!draftOrder.customer.id;
  const isJacketCompleted = !!draftOrder.measurements.jacket;
  const isVestCompleted = !!draftOrder.measurements.vest;
  const isPantsCompleted = !!draftOrder.measurements.pants;

  const orderSections = [
    {
      id: 'client',
      title: 'Date Client',
      description: 'Informații de contact și preferințe',
      icon: <User size={24} color={Colors.primary} />,
      route: 'client-data',
      completed: isClientCompleted,
    },
    {
      id: 'jacket',
      title: 'Sacou',
      description: 'Măsurători și specificații sacou',
      icon: <Shirt size={24} color={Colors.primary} />,
      route: 'jacket',
      completed: isJacketCompleted,
    },
    {
      id: 'vest',
      title: 'Vestă',
      description: 'Măsurători și specificații vestă',
      icon: <Package size={24} color={Colors.primary} />,
      route: 'vest',
      completed: isVestCompleted,
    },
    {
      id: 'pants',
      title: 'Pantaloni',
      description: 'Măsurători și specificații pantaloni',
      icon: <PantsIcon size={24} color={Colors.primary} />,
      route: 'pants',
      completed: isPantsCompleted,
    },
  ];

  const canAccessSummary = isClientCompleted && (
    isJacketCompleted || isVestCompleted || isPantsCompleted
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {params.orderId ? 'Editare Comandă' : 'Comandă Nouă'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă datele comenzii...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Selectează o secțiune pentru a începe configurarea comenzii
          </Text>

        <View style={styles.sectionsContainer}>
          {orderSections.map((section, index) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.sectionCard,
                section.completed && styles.completedCard,
              ]}
              onPress={() => router.push(`/new-order/${section.route}`)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={[
                  styles.iconContainer,
                  section.completed && styles.completedIcon,
                ]}>
                  {section.completed ? (
                    <Check size={24} color={Colors.success} />
                  ) : (
                    section.icon
                  )}
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionDescription}>{section.description}</Text>
                </View>
                <View style={[
                  styles.stepNumber,
                  section.completed && styles.stepNumberCompleted,
                ]}>
                  <Text style={[
                    styles.stepText,
                    section.completed && styles.stepTextCompleted,
                  ]}>
                    {index + 1}
                  </Text>
                </View>
              </View>
              {section.completed && (
                <View style={styles.completedIndicator}>
                  <Text style={styles.completedText}>✓ Completat</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Button */}
        <TouchableOpacity 
          style={[
            styles.summaryButton,
            !canAccessSummary && styles.summaryButtonDisabled,
          ]}
          onPress={() => {
            if (canAccessSummary) {
              router.push('/new-order/summary');
            }
          }}
          disabled={!canAccessSummary}
          activeOpacity={0.7}
        >
          <Text style={styles.summaryButtonText}>Vezi Sumar Comandă</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}
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
  backButton: {
    ...ButtonStyles.back,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  sectionsContainer: {
    paddingHorizontal: Spacing.xl,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  completedCard: {
    borderColor: Colors.success,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  completedIcon: {
    backgroundColor: Colors.success + '20',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    ...Typography.caption,
    lineHeight: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberCompleted: {
    backgroundColor: Colors.success,
  },
  stepText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  stepTextCompleted: {
    color: Colors.textInverse,
  },
  completedIndicator: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  completedText: {
    ...Typography.small,
    color: Colors.success,
    fontWeight: '600',
  },
  summaryButton: {
    ...ButtonStyles.primary,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
  },
  summaryButtonDisabled: {
    opacity: 0.5,
  },
  summaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
