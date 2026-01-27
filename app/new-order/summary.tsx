import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Share, CreditCard, Calendar, CheckCircle } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { OrderStepNav } from '@/components/OrderStepNav';
import { PaywallModal } from '@/components/PaywallModal';
import { api, apiFetch, getErrorMessage } from '@/lib/api';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

export default function SummaryScreen() {
  const router = useRouter();
  const { draftOrder, updatePayment, updateDueDate, clearDraft } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription } = useSubscription();
  
  const [totalAmount, setTotalAmount] = useState(draftOrder.payment.totalAmount.toString() || '');
  const [paidAmount, setPaidAmount] = useState(draftOrder.payment.paidAmount.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | undefined>(
    draftOrder.payment.paymentMethod
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const paymentMethods: Array<{ label: string; value: 'cash' | 'card' | 'transfer' }> = [
    { label: 'Numerar', value: 'cash' },
    { label: 'Card', value: 'card' },
    { label: 'Transfer bancar', value: 'transfer' },
  ];

  const remaining = parseFloat(totalAmount) - parseFloat(paidAmount || '0');

  // Get items from measurements
  const items: string[] = [];
  if (draftOrder.measurements.jacket) {
    const j = draftOrder.measurements.jacket;
    const size = j.size ? ` Mărime ${j.size}` : '';
    const model = j.model ? `, ${j.model}` : '';
    items.push(`Sacou${size}${model}`);
  }
  if (draftOrder.measurements.vest) {
    const v = draftOrder.measurements.vest;
    const model = v.model ? `, ${v.model}` : '';
    items.push(`Vestă${model}`);
  }
  if (draftOrder.measurements.pants) {
    const p = draftOrder.measurements.pants;
    const size = p.size ? ` Mărime ${p.size}` : '';
    const model = p.model ? `, ${p.model}` : '';
    items.push(`Pantaloni${size}${model}`);
  }

  const formatDate = (isoDate?: string): string => {
    if (!isoDate) return '—';
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('ro-RO');
    } catch {
      return '—';
    }
  };

  const handleFinalize = async () => {
    // Validate required fields
    if (!draftOrder.customer.id) {
      Alert.alert('Eroare', 'Selectați sau creați un client');
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      Alert.alert('Eroare', 'Introduceți suma totală a comenzii');
      return;
    }
    if (!draftOrder.dueDate) {
      Alert.alert('Eroare', 'Introduceți data de preluare');
      return;
    }

    setIsLoading(true);
    try {
      // Update payment in context
      updatePayment({
        totalAmount: parseFloat(totalAmount),
        paidAmount: parseFloat(paidAmount || '0'),
        paymentMethod: paymentMethod,
      });

      // Build measurements object (only include non-empty measurements)
      const measurements: Record<string, any> = {};
      if (draftOrder.measurements.jacket) {
        measurements.jacket = draftOrder.measurements.jacket;
      }
      if (draftOrder.measurements.vest) {
        measurements.vest = draftOrder.measurements.vest;
      }
      if (draftOrder.measurements.pants) {
        measurements.pants = draftOrder.measurements.pants;
      }

      // Map payment method to backend format
      const paymentMethodMap: Record<'cash' | 'card' | 'transfer', string> = {
        cash: 'Numerar',
        card: 'Card',
        transfer: 'Transfer bancar',
      };

      // Build order payload
      const orderPayload = {
        customerId: draftOrder.customer.id,
        totalAmount: parseFloat(totalAmount),
        paidAmount: parseFloat(paidAmount || '0'),
        dueDate: draftOrder.dueDate,
        notes: draftOrder.notes || undefined,
        paymentMethod: paymentMethod ? paymentMethodMap[paymentMethod] : undefined,
        measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
      };

      // Check if we're editing an existing order or creating a new one
      const isEditing = !!draftOrder.orderId;
      
      let order: { id: string; orderNumber: string };
      if (isEditing) {
        // Update existing order
        order = await apiFetch<{ id: string; orderNumber: string }>(api.orders(draftOrder.orderId), {
          method: 'PUT',
          body: JSON.stringify(orderPayload),
        });
      } else {
        // Create new order
        try {
          order = await apiFetch<{ id: string; orderNumber: string }>(api.orders(), {
            method: 'POST',
            body: JSON.stringify(orderPayload),
          });
        } catch (error: any) {
          // Check if it's a subscription limit error
          console.log('Order creation error:', { code: error.code, message: error.message });
          if (error.code === 'SUBSCRIPTION_LIMIT_REACHED' ||
              error.message?.includes('Free plan allows only') || 
              error.message?.includes('SUBSCRIPTION_LIMIT_REACHED')) {
            console.log('Subscription limit reached - showing paywall');
            setShowPaywall(true);
            setIsLoading(false);
            return;
          }
          throw error;
        }
      }

      // Clear draft
      clearDraft();

      Alert.alert(
        'Succes',
        isEditing
          ? `Comanda #${order.orderNumber} a fost actualizată cu succes!`
          : `Comanda #${order.orderNumber} a fost creată cu succes!`,
        [
          {
            text: 'OK',
            onPress: () => router.replace(`/order-details/${order.id}`),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Eroare',
        getErrorMessage(
          error,
          draftOrder.orderId ? 'Nu s-a putut actualiza comanda' : 'Nu s-a putut crea comanda'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const success = await upgradeToPro();
      if (success) {
        await refreshSubscription();
        setShowPaywall(false);
        Alert.alert('Succes', 'Cont upgradeat la Pro! Acum puteți crea comenzi nelimitate.');
      } else {
        Alert.alert('Eroare', 'Nu s-a putut face upgrade-ul. Vă rugăm încercați din nou.');
      }
    } catch (error) {
      Alert.alert('Eroare', getErrorMessage(error, 'Nu s-a putut face upgrade-ul'));
    } finally {
      setIsUpgrading(false);
    }
  };

  const canFinalize = 
    draftOrder.customer.id && 
    totalAmount && 
    parseFloat(totalAmount) > 0 && 
    draftOrder.dueDate;

  return (
    <>
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
        <Text style={styles.title}>Sumar Comandă</Text>
        <TouchableOpacity 
          style={styles.shareButton} 
          onPress={() => Alert.alert('Partajare', 'Funcționalitatea de partajare va fi disponibilă în curând')}
          activeOpacity={0.7}
        >
          <Share size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informații Comandă</Text>
          
          <View style={styles.summaryCard}>
            <Text style={styles.clientName}>{draftOrder.customer.name || '—'}</Text>
            <Text style={styles.clientPhone}>{draftOrder.customer.phone || '—'}</Text>
            <Text style={styles.orderDate}>
              Data comenzii: {new Date().toLocaleDateString('ro-RO')}
            </Text>
          </View>

          {items.length > 0 ? (
            <View style={styles.itemsList}>
              <Text style={styles.itemsTitle}>Articole comandate:</Text>
              {items.map((item, index) => (
                <Text key={index} style={styles.itemText}>• {item}</Text>
              ))}
            </View>
          ) : (
            <View style={styles.itemsList}>
              <Text style={styles.itemsTitle}>Nu există articole selectate</Text>
            </View>
          )}
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Plată</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Comandă (RON)</Text>
            <TextInput
              style={styles.priceInput}
              value={totalAmount}
              onChangeText={(text) => {
                setTotalAmount(text);
                updatePayment({ totalAmount: parseFloat(text) || 0 });
              }}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Avans (RON)</Text>
            <TextInput
              style={styles.priceInput}
              value={paidAmount}
              onChangeText={(text) => {
                setPaidAmount(text);
                updatePayment({ paidAmount: parseFloat(text) || 0 });
              }}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {remaining > 0 && (
            <View style={styles.remainingContainer}>
              <Text style={styles.remainingLabel}>De plătit la ridicare:</Text>
              <Text style={styles.remainingAmount}>{remaining.toFixed(2)} RON</Text>
            </View>
          )}

          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Metoda de plată avans</Text>
            <View style={styles.optionRow}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method.value && styles.selectedOption,
                  ]}
                  onPress={() => {
                    setPaymentMethod(method.value);
                    updatePayment({ paymentMethod: method.value });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    paymentMethod === method.value && styles.selectedOptionText,
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Pickup Date */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Data Ridicare</Text>
          </View>

          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {formatDate(draftOrder.dueDate)}
            </Text>
            {draftOrder.dueDate && (
              <CheckCircle size={20} color={Colors.success} />
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.finishButton, !canFinalize && styles.finishButtonDisabled]} 
            onPress={handleFinalize}
            disabled={!canFinalize || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text style={styles.finishButtonText}>
                {draftOrder.orderId ? 'Salvează Modificările' : 'Finalizează Comanda'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>

      <OrderStepNav
        showPrev
        showNext={false}
        onPrev={() => router.push('/new-order/pants')}
        onNext={() => {}}
        prevLabel="Înapoi"
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />
    </>
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
  shareButton: {
    ...ButtonStyles.primaryIcon,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginLeft: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  clientName: {
    ...Typography.h3,
    marginBottom: Spacing.xs,
  },
  clientPhone: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  orderDate: {
    ...Typography.caption,
  },
  itemsList: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  itemsTitle: {
    ...Typography.bodyBold,
    marginBottom: Spacing.sm,
  },
  itemText: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  priceInput: {
    ...Typography.h3,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'right',
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  remainingLabel: {
    ...Typography.captionBold,
    color: Colors.primaryDark,
  },
  remainingAmount: {
    ...Typography.h3,
    color: Colors.primaryDark,
  },
  optionGroup: {
    marginBottom: Spacing.md,
  },
  optionLabel: {
    ...Typography.captionBold,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  selectedOptionText: {
    color: Colors.textInverse,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  dateText: {
    ...Typography.bodyBold,
  },
  actionsContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  finishButton: {
    ...ButtonStyles.primary,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
});
