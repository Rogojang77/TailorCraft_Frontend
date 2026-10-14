/**
 * Status update and delivery date state and handlers for order details.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { api, apiFetch } from '@/lib/api';
import { orderStatusToLabel } from '@/lib/api';
import type { OrderDetailsData } from '@/types/orderDetails';

export interface UseOrderStatusArgs {
  orderId: string | undefined;
  orderData: OrderDetailsData | null;
  onOrderUpdated: (updater: (prev: OrderDetailsData) => OrderDetailsData) => void;
  t: (key: string) => string;
}

export interface UseOrderStatusResult {
  statusModalVisible: boolean;
  setStatusModalVisible: (v: boolean) => void;
  statusUpdating: boolean;
  fullPayUpdating: boolean;
  showDeliveryDatePicker: boolean;
  setShowDeliveryDatePicker: (v: boolean) => void;
  deliveryDateUpdating: boolean;
  deliveryDateForPicker: Date;
  minDeliveryDate: Date;
  handleStatusUpdate: (newStatus: string) => Promise<void>;
  handleMarkAsFullyPaid: () => Promise<void>;
  openDeliveryDatePicker: () => void;
  saveDeliveryDate: (isoDate: string) => Promise<void>;
  handleDeliveryDateChange: (event: { type: string }, selectedDate?: Date) => void;
}

export function useOrderStatus({
  orderId,
  orderData,
  onOrderUpdated,
  t,
}: UseOrderStatusArgs): UseOrderStatusResult {
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [fullPayUpdating, setFullPayUpdating] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [deliveryDateUpdating, setDeliveryDateUpdating] = useState(false);

  const deliveryDateForPicker = orderData?.deliveryDate
    ? new Date(orderData.deliveryDate)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
      })();
  const minDeliveryDate = new Date();
  minDeliveryDate.setDate(minDeliveryDate.getDate() + 1);

  const handleStatusUpdate = useCallback(
    async (newStatus: string) => {
      if (!orderId || !orderData) return;
      setStatusUpdating(true);
      try {
        const updated = await apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          measurements: Record<string, Record<string, unknown>> | null;
          customer?: { firstName: string; lastName: string; phone: string; email: string | null };
        }>(api.orders(orderId), {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        onOrderUpdated((prev) => ({
          ...prev,
          status: orderStatusToLabel(updated.status),
          rawStatus: updated.status,
        }));
        setStatusModalVisible(false);
        Alert.alert(t('common.success'), t('orderDetails.statusUpdated'));
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.statusUpdateError'));
      } finally {
        setStatusUpdating(false);
      }
    },
    [orderId, orderData, onOrderUpdated, t]
  );

  const saveDeliveryDate = useCallback(
    async (isoDate: string) => {
      if (!orderId || !orderData) return;
      setDeliveryDateUpdating(true);
      try {
        const updated = await apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          deliveryDate: string | null;
          measurements: Record<string, Record<string, unknown>> | null;
        }>(api.orders(orderId), {
          method: 'PUT',
          body: JSON.stringify({ deliveryDate: isoDate }),
        });
        onOrderUpdated((prev) => ({ ...prev, deliveryDate: updated.deliveryDate ?? null }));
        setShowDeliveryDatePicker(false);
        Alert.alert(t('common.success'), t('orderDetails.deliveryDateUpdated'));
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.deliveryDateUpdateError'));
      } finally {
        setDeliveryDateUpdating(false);
      }
    },
    [orderId, orderData, onOrderUpdated, t]
  );

  const handleMarkAsFullyPaid = useCallback(async () => {
    if (!orderId || !orderData) return;
    setFullPayUpdating(true);
    try {
      const updated = await apiFetch<{
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        paidAmount: number;
        orderDate: string;
        measurements: Record<string, Record<string, unknown>> | null;
      }>(api.orders(orderId), {
        method: 'PUT',
        body: JSON.stringify({
          paidAmount: orderData.total,
        }),
      });
      onOrderUpdated((prev) => ({
        ...prev,
        total: updated.totalAmount,
        advance: updated.paidAmount,
        status: orderStatusToLabel(updated.status),
        rawStatus: updated.status,
      }));
      Alert.alert(t('common.success'), t('orderDetails.markFullyPaidSuccess'));
    } catch (e) {
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('orderDetails.markFullyPaidError')
      );
    } finally {
      setFullPayUpdating(false);
    }
  }, [orderId, orderData, onOrderUpdated, t]);

  const openDeliveryDatePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: deliveryDateForPicker,
        mode: 'date',
        minimumDate: minDeliveryDate,
        onChange: async (_event, date) => {
          if (date) await saveDeliveryDate(date.toISOString());
        },
      });
    } else {
      setShowDeliveryDatePicker(true);
    }
  }, [deliveryDateForPicker, minDeliveryDate, saveDeliveryDate]);

  const handleDeliveryDateChange = useCallback(
    (event: { type: string }, selectedDate?: Date) => {
      if (event.type === 'set' && selectedDate) {
        saveDeliveryDate(selectedDate.toISOString());
      }
      setShowDeliveryDatePicker(false);
    },
    [saveDeliveryDate]
  );

  return {
    statusModalVisible,
    setStatusModalVisible,
    statusUpdating,
    fullPayUpdating,
    showDeliveryDatePicker,
    setShowDeliveryDatePicker,
    deliveryDateUpdating,
    deliveryDateForPicker,
    minDeliveryDate,
    handleStatusUpdate,
    handleMarkAsFullyPaid,
    openDeliveryDatePicker,
    saveDeliveryDate,
    handleDeliveryDateChange,
  };
}
