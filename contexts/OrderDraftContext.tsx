import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveDraft,
  loadDraft,
  clearDraftStorage,
  isDraftNonEmpty,
} from '@/lib/orderDraftStorage';
import * as diagnostics from '@/lib/diagnostics';

// Measurements are key → value only; no fixed schema. Updates are merged so unknown keys are preserved.
export type GarmentMeasurements = Record<string, string>;

/** Draft lifecycle: none (no draft), active (user editing), restored (loaded from storage, show banner). */
export type DraftStatus = 'none' | 'active' | 'restored';

/** Explicit mode for new-order flow. Set once when entering /new-order. */
export type OrderMode = 'create' | 'edit';

export interface DraftOrder {
  orderId?: string; // ID of the order being edited (if any)
  /** Garment type ids the user chose to include in this order. Only these get forms and snapshots. */
  selectedGarmentIds: string[];
  customer: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  measurements: Record<string, GarmentMeasurements>; // Generic: garmentId -> measurements
  payment: {
    totalAmount: number;
    paidAmount: number;
  };
  notes?: string;
}

interface OrderDraftContextType {
  draftOrder: DraftOrder;
  /** Explicit mode: create (can restore drafts) | edit (never restore). Set once in new-order layout. */
  orderMode: OrderMode;
  /** When orderMode === 'edit', the order id to load. Undefined in create mode. */
  orderIdToEdit: string | undefined;
  /** Lifecycle: none | active | restored. Restored = loaded from storage; show banner until user acknowledges. */
  draftStatus: DraftStatus;
  /** Call after user taps "Continuă" on restored-draft banner; sets status to 'active'. */
  acknowledgeRestoredDraft: () => void;
  setSelectedGarmentIds: (ids: string[]) => void;
  updateCustomer: (customer: Partial<DraftOrder['customer']>) => void;
  updateMeasurements: (garmentId: string, measurements: GarmentMeasurements) => void;
  updatePayment: (payment: Partial<DraftOrder['payment']>) => void;
  updateNotes: (notes: string | undefined) => void;
  loadOrderData: (orderData: {
    id: string;
    customer?: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
    measurements?: Record<string, Record<string, unknown>> | null;
    totalAmount: number;
    paidAmount: number;
    notes?: string | null;
  }) => void;
  clearDraft: () => void;
}

const defaultDraftOrder: DraftOrder = {
  selectedGarmentIds: [],
  customer: {
    name: '',
    phone: '',
  },
  measurements: {},
  payment: {
    totalAmount: 0,
    paidAmount: 0,
  },
};

const OrderDraftContext = createContext<OrderDraftContextType | undefined>(undefined);

const PERSIST_DEBOUNCE_MS = 500;

export interface OrderDraftProviderProps {
  children: ReactNode;
  /** Explicit mode: create (can restore drafts) | edit (never restore). Set once when entering /new-order. */
  orderMode: OrderMode;
  /** When orderMode === 'edit', the order id to load. Omit or undefined in create mode. */
  orderIdToEdit?: string;
}

export function OrderDraftProvider({
  children,
  orderMode,
  orderIdToEdit,
}: OrderDraftProviderProps) {
  const { user } = useAuth();
  const [draftOrder, setDraftOrder] = useState<DraftOrder>(defaultDraftOrder);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('none');
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoredRef = useRef(false);

  const skipRestore = orderMode === 'edit';

  // Restore draft on mount when same user and draft exists (create mode only). Edit mode never restores.
  useEffect(() => {
    if (!user?.id || skipRestore) {
      if (skipRestore) isRestoredRef.current = true;
      return;
    }

    let cancelled = false;

    (async () => {
      const loaded = await loadDraft(user.id);
      if (cancelled) return;
      if (loaded && isDraftNonEmpty(loaded)) {
        setDraftOrder(loaded);
        setDraftStatus('restored');
        diagnostics.recordDraftRestore();
      }
      isRestoredRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, skipRestore]);

  // Persist draft when it changes (debounced). Only in create mode — edit mode must not overwrite the create draft key.
  useEffect(() => {
    if (!user?.id || !isRestoredRef.current || orderMode === 'edit') return;

    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      persistTimeoutRef.current = null;
      if (isDraftNonEmpty(draftOrder)) {
        saveDraft(user.id, draftOrder);
      }
      // Do not clear storage when draft is empty - could be transient (e.g. edit flow before loadOrderData).
      // Storage is cleared only via clearDraft() (successful order creation or explicit cancel).
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [user?.id, draftOrder, orderMode]);

  const setSelectedGarmentIds = useCallback((ids: string[]) => {
    setDraftOrder((prev) => {
      const idSet = new Set(ids);
      const nextMeasurements = { ...prev.measurements };
      for (const garmentId of Object.keys(nextMeasurements)) {
        if (!idSet.has(garmentId)) delete nextMeasurements[garmentId];
      }
      return {
        ...prev,
        selectedGarmentIds: ids,
        measurements: nextMeasurements,
      };
    });
  }, []);

  const updateCustomer = useCallback((customer: Partial<DraftOrder['customer']>) => {
    setDraftOrder((prev) => ({
      ...prev,
      customer: { ...prev.customer, ...customer },
    }));
  }, []);

  const updateMeasurements = useCallback((garmentId: string, measurements: GarmentMeasurements) => {
    setDraftOrder((prev) => {
      const existing = prev.measurements[garmentId] || {};
      return {
        ...prev,
        measurements: {
          ...prev.measurements,
          [garmentId]: { ...existing, ...measurements },
        },
      };
    });
  }, []);

  const updatePayment = useCallback((payment: Partial<DraftOrder['payment']>) => {
    setDraftOrder((prev) => ({
      ...prev,
      payment: { ...prev.payment, ...payment },
    }));
  }, []);

  const updateNotes = useCallback((notes: string | undefined) => {
    setDraftOrder((prev) => ({
      ...prev,
      notes,
    }));
  }, []);

  const acknowledgeRestoredDraft = useCallback(() => {
    setDraftStatus('active');
  }, []);

  const loadOrderData = (orderData: {
    id: string;
    customer?: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
    measurements?: Record<string, Record<string, unknown>> | null;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: string | null;
    notes?: string | null;
  }) => {
    // Helper to convert unknown to string
    const str = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      return String(v);
    };

    const customer = orderData.customer;
    const measurements = orderData.measurements ?? {};
    
    // Convert measurements to generic structure; selected garments = those with snapshot data
    const convertedMeasurements: Record<string, GarmentMeasurements> = {};
    const selectedGarmentIds: string[] = [];
    for (const [garmentId, garmentData] of Object.entries(measurements)) {
      if (garmentData && typeof garmentData === 'object') {
        convertedMeasurements[garmentId] = Object.fromEntries(
          Object.entries(garmentData).map(([k, v]) => [k, str(v)])
        );
        selectedGarmentIds.push(garmentId);
      }
    }
    
    setDraftOrder({
      orderId: orderData.id,
      selectedGarmentIds,
      customer: customer
        ? {
            id: customer.id,
            name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '',
            phone: customer.phone || '',
            email: customer.email || undefined,
          }
        : defaultDraftOrder.customer,
      measurements: convertedMeasurements,
      payment: {
        totalAmount: orderData.totalAmount || 0,
        paidAmount: orderData.paidAmount || 0,
      },
      notes: orderData.notes || undefined,
    });
    setDraftStatus('active');
  };

  const clearDraft = useCallback(() => {
    setDraftOrder(defaultDraftOrder);
    setDraftStatus('none');
    if (user?.id) {
      clearDraftStorage(user.id);
    }
  }, [user?.id]);

  return (
    <OrderDraftContext.Provider
      value={{
        draftOrder,
        orderMode,
        orderIdToEdit: orderMode === 'edit' ? orderIdToEdit : undefined,
        draftStatus,
        acknowledgeRestoredDraft,
        setSelectedGarmentIds,
        updateCustomer,
        updateMeasurements,
        updatePayment,
        updateNotes,
        loadOrderData,
        clearDraft,
      }}
    >
      {children}
    </OrderDraftContext.Provider>
  );
}

export function useOrderDraft() {
  const context = useContext(OrderDraftContext);
  if (context === undefined) {
    throw new Error('useOrderDraft must be used within an OrderDraftProvider');
  }
  return context;
}
