/**
 * Delete order modal and API call.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { api, apiFetch } from '@/lib/api';

export interface UseOrderDeleteArgs {
  orderId: string | undefined;
  onDeleted: () => void;
  t: (key: string) => string;
}

export interface UseOrderDeleteResult {
  deleteModalVisible: boolean;
  setDeleteModalVisible: (v: boolean) => void;
  deleteLoading: boolean;
  handleDeleteRequest: () => void;
  handleDeleteConfirm: () => Promise<void>;
}

export function useOrderDelete({
  orderId,
  onDeleted,
  t,
}: UseOrderDeleteArgs): UseOrderDeleteResult {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteRequest = useCallback(() => setDeleteModalVisible(true), []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!orderId) return;
    setDeleteLoading(true);
    try {
      await apiFetch(api.orders(orderId), { method: 'DELETE' });
      setDeleteModalVisible(false);
      Alert.alert(t('common.success'), t('orderDetails.deleteSuccess'));
      onDeleted();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  }, [orderId, onDeleted, t]);

  return {
    deleteModalVisible,
    setDeleteModalVisible,
    deleteLoading,
    handleDeleteRequest,
    handleDeleteConfirm,
  };
}
