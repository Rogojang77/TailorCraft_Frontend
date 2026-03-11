/**
 * Edit order info (total, advance, notes) modal state and save.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { api, apiFetch } from '@/lib/api';
import type { OrderDetailsData } from '@/types/orderDetails';

export interface UseOrderInfoEditArgs {
  orderId: string | undefined;
  orderData: OrderDetailsData | null;
  onOrderUpdated: (updater: (prev: OrderDetailsData) => OrderDetailsData) => void;
  t: (key: string) => string;
}

export interface UseOrderInfoEditResult {
  editOrderInfoModalVisible: boolean;
  setEditOrderInfoModalVisible: (v: boolean) => void;
  editOrderInfoTotal: string;
  setEditOrderInfoTotal: (v: string) => void;
  editOrderInfoAdvance: string;
  setEditOrderInfoAdvance: (v: string) => void;
  editOrderInfoNotes: string;
  setEditOrderInfoNotes: (v: string) => void;
  saveOrderInfoLoading: boolean;
  openEditOrderInfoModal: () => void;
  handleCloseEditOrderInfoModal: () => void;
  handleSaveOrderInfo: () => Promise<void>;
}

export function useOrderInfoEdit({
  orderId,
  orderData,
  onOrderUpdated,
  t,
}: UseOrderInfoEditArgs): UseOrderInfoEditResult {
  const [editOrderInfoModalVisible, setEditOrderInfoModalVisible] = useState(false);
  const [editOrderInfoTotal, setEditOrderInfoTotal] = useState('');
  const [editOrderInfoAdvance, setEditOrderInfoAdvance] = useState('');
  const [editOrderInfoNotes, setEditOrderInfoNotes] = useState('');
  const [saveOrderInfoLoading, setSaveOrderInfoLoading] = useState(false);

  const openEditOrderInfoModal = useCallback(() => {
    if (!orderData) return;
    setEditOrderInfoTotal(String(orderData.total));
    setEditOrderInfoAdvance(String(orderData.advance));
    setEditOrderInfoNotes(orderData.notes ?? '');
    setEditOrderInfoModalVisible(true);
  }, [orderData]);

  const handleCloseEditOrderInfoModal = useCallback(() => {
    if (saveOrderInfoLoading) return;
    setEditOrderInfoModalVisible(false);
  }, [saveOrderInfoLoading]);

  const handleSaveOrderInfo = useCallback(async () => {
    if (!orderId || !orderData) return;
    const totalNum = parseFloat(editOrderInfoTotal);
    const advanceNum = parseFloat(editOrderInfoAdvance);
    if (Number.isNaN(totalNum) || totalNum <= 0) {
      Alert.alert(t('common.error'), t('orderDetails.editTotalRequired'));
      return;
    }
    if (Number.isNaN(advanceNum) || advanceNum < 0) {
      Alert.alert(t('common.error'), t('orderDetails.editAdvanceInvalid'));
      return;
    }
    if (advanceNum > totalNum) {
      Alert.alert(t('common.error'), t('orderDetails.editAdvanceExceedsTotal'));
      return;
    }
    setSaveOrderInfoLoading(true);
    try {
      const updated = await apiFetch<{
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        paidAmount: number;
        orderDate: string;
        measurements: Record<string, Record<string, unknown>> | null;
        catalogSelections: Record<string, Record<string, string | string[]>> | null;
        notes?: string | null;
      }>(api.orders(orderId), {
        method: 'PUT',
        body: JSON.stringify({
          totalAmount: totalNum,
          paidAmount: advanceNum,
          status: orderData.rawStatus,
          notes: editOrderInfoNotes.trim() || null,
          measurements: orderData.measurements ?? undefined,
          catalogSelections: orderData.catalogSelections ?? undefined,
        }),
      });
      onOrderUpdated((prev) => ({
        ...prev,
        total: updated.totalAmount,
        advance: updated.paidAmount,
        notes: updated.notes ?? undefined,
      }));
      handleCloseEditOrderInfoModal();
      Alert.alert(t('common.success'), t('orderDetails.editSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.editError'));
    } finally {
      setSaveOrderInfoLoading(false);
    }
  }, [
    orderId,
    orderData,
    editOrderInfoTotal,
    editOrderInfoAdvance,
    editOrderInfoNotes,
    onOrderUpdated,
    t,
  ]);

  return {
    editOrderInfoModalVisible,
    setEditOrderInfoModalVisible,
    editOrderInfoTotal,
    setEditOrderInfoTotal,
    editOrderInfoAdvance,
    setEditOrderInfoAdvance,
    editOrderInfoNotes,
    setEditOrderInfoNotes,
    saveOrderInfoLoading,
    openEditOrderInfoModal,
    handleCloseEditOrderInfoModal,
    handleSaveOrderInfo,
  };
}
