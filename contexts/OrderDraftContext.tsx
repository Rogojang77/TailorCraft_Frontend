import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Measurements are key → value only; no fixed schema. Updates are merged so unknown keys are preserved.
export type GarmentMeasurements = Record<string, string>;

/** Catalog selections per garment: categoryCode -> itemId(s) */
export type GarmentCatalogSelections = Record<string, string | string[]>;

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
    gender?: 'male' | 'female' | null;
    referenceImage?: string | null;
  };
  measurements: Record<string, GarmentMeasurements>; // Generic: garmentId -> measurements
  catalogSelections: Record<string, GarmentCatalogSelections>; // garmentId -> categoryCode -> itemId(s)
  payment: {
    totalAmount: number;
    paidAmount: number;
  };
  deliveryDate?: string; // ISO date string for expected delivery date
  fittings?: Array<{
    id?: string;
    scheduledAt: string;
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
    notes?: string | null;
    photos?: string[];
  }>;
  wantsOrderSketch: boolean;
  sketchDraftUri?: string;
  notes?: string;
}

interface OrderDraftContextType {
  draftOrder: DraftOrder;
  /** Explicit mode: create | edit. Set once in new-order layout. */
  orderMode: OrderMode;
  /** When orderMode === 'edit', the order id to load. Undefined in create mode. */
  orderIdToEdit: string | undefined;
  setSelectedGarmentIds: (ids: string[]) => void;
  updateCustomer: (customer: Partial<DraftOrder['customer']>) => void;
  updateMeasurements: (garmentId: string, measurements: GarmentMeasurements) => void;
  updateCatalogSelections: (garmentId: string, categoryCode: string, itemIds: string | string[]) => void;
  updatePayment: (payment: Partial<DraftOrder['payment']>) => void;
  updateDeliveryDate: (date: string | undefined) => void;
  updateFittings: (fittings: Array<{ id?: string; scheduledAt: string; status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED'; notes?: string | null; photos?: string[] }>) => void;
  updateWantsOrderSketch: (wants: boolean) => void;
  updateSketchDraftUri: (uri: string | undefined) => void;
  updateNotes: (notes: string | undefined) => void;
  loadOrderData: (orderData: {
    id: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      email: string | null;
      gender?: 'male' | 'female' | null;
      referenceImage?: string | null;
    };
    measurements?: Record<string, Record<string, unknown>> | null;
    catalogSelections?: Record<string, GarmentCatalogSelections> | null;
    totalAmount: number;
    paidAmount: number;
    deliveryDate?: string | null;
    fittings?: Array<{
      id?: string;
      scheduledAt: string;
      status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
      notes?: string | null;
      photos?: string[];
    }> | null;
    sketches?: Array<{ id: string; imageUrl: string; title?: string | null }> | null;
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
  catalogSelections: {},
  payment: {
    totalAmount: 0,
    paidAmount: 0,
  },
  fittings: [],
  wantsOrderSketch: false,
};

const OrderDraftContext = createContext<OrderDraftContextType | undefined>(undefined);

export interface OrderDraftProviderProps {
  children: ReactNode;
  /** Explicit mode: create | edit. Set once when entering /new-order. */
  orderMode: OrderMode;
  /** When orderMode === 'edit', the order id to load. Omit or undefined in create mode. */
  orderIdToEdit?: string;
}

export function OrderDraftProvider({
  children,
  orderMode,
  orderIdToEdit,
}: OrderDraftProviderProps) {
  // In-memory only: an unfinished order is discarded when the flow is left.
  const [draftOrder, setDraftOrder] = useState<DraftOrder>(defaultDraftOrder);

  const setSelectedGarmentIds = useCallback((ids: string[]) => {
    setDraftOrder((prev) => {
      const idSet = new Set(ids);
      const nextMeasurements = { ...prev.measurements };
      const nextCatalogSelections = { ...prev.catalogSelections };
      for (const garmentId of Object.keys(nextMeasurements)) {
        if (!idSet.has(garmentId)) delete nextMeasurements[garmentId];
      }
      for (const garmentId of Object.keys(nextCatalogSelections)) {
        if (!idSet.has(garmentId)) delete nextCatalogSelections[garmentId];
      }
      return {
        ...prev,
        selectedGarmentIds: ids,
        measurements: nextMeasurements,
        catalogSelections: nextCatalogSelections,
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

  const updateCatalogSelections = useCallback((garmentId: string, categoryCode: string, itemIds: string | string[]) => {
    setDraftOrder((prev) => {
      const existing = prev.catalogSelections[garmentId] || {};
      return {
        ...prev,
        catalogSelections: {
          ...prev.catalogSelections,
          [garmentId]: { ...existing, [categoryCode]: itemIds },
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

  const updateDeliveryDate = useCallback((date: string | undefined) => {
    setDraftOrder((prev) => ({
      ...prev,
      deliveryDate: date,
    }));
  }, []);

  const updateFittings = useCallback((fittings: Array<{ id?: string; scheduledAt: string; status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED'; notes?: string | null; photos?: string[] }>) => {
    setDraftOrder((prev) => ({
      ...prev,
      fittings,
    }));
  }, []);

  const updateWantsOrderSketch = useCallback((wants: boolean) => {
    setDraftOrder((prev) => ({
      ...prev,
      wantsOrderSketch: wants,
      sketchDraftUri: wants ? prev.sketchDraftUri : undefined,
    }));
  }, []);

  const updateSketchDraftUri = useCallback((uri: string | undefined) => {
    setDraftOrder((prev) => ({
      ...prev,
      sketchDraftUri: uri,
    }));
  }, []);

  const updateNotes = useCallback((notes: string | undefined) => {
    setDraftOrder((prev) => ({
      ...prev,
      notes,
    }));
  }, []);

  const loadOrderData = (orderData: {
    id: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      email: string | null;
      gender?: 'male' | 'female' | null;
      referenceImage?: string | null;
    };
    measurements?: Record<string, Record<string, unknown>> | null;
    catalogSelections?: Record<string, GarmentCatalogSelections> | null;
    totalAmount: number;
    paidAmount: number;
    deliveryDate?: string | null;
    fittings?: Array<{
      id?: string;
      scheduledAt: string;
      status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
      notes?: string | null;
      photos?: string[];
    }> | null;
    paymentMethod?: string | null;
    sketches?: Array<{ id: string; imageUrl: string; title?: string | null }> | null;
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
    const catalogSelections = orderData.catalogSelections ?? {};
    
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
            gender: customer.gender ?? undefined,
            referenceImage: customer.referenceImage ?? undefined,
          }
        : defaultDraftOrder.customer,
      measurements: convertedMeasurements,
      catalogSelections,
      payment: {
        totalAmount: orderData.totalAmount || 0,
        paidAmount: orderData.paidAmount || 0,
      },
      deliveryDate: orderData.deliveryDate || undefined,
      fittings: orderData.fittings ?? [],
      wantsOrderSketch: (orderData.sketches?.length ?? 0) > 0,
      notes: orderData.notes || undefined,
    });
  };

  const clearDraft = useCallback(() => {
    // Set a fresh object so React and all consumers see a clear update; reusing defaultDraftOrder
    // can leave client details visible if reference equality prevents a proper re-render.
    setDraftOrder({
      selectedGarmentIds: [],
      customer: { name: '', phone: '' },
      measurements: {},
      catalogSelections: {},
      payment: { totalAmount: 0, paidAmount: 0 },
      fittings: [],
      wantsOrderSketch: false,
      sketchDraftUri: undefined,
    });
  }, []);

  return (
    <OrderDraftContext.Provider
      value={{
        draftOrder,
        orderMode,
        orderIdToEdit: orderMode === 'edit' ? orderIdToEdit : undefined,
        setSelectedGarmentIds,
        updateCustomer,
        updateMeasurements,
        updateCatalogSelections,
        updatePayment,
        updateDeliveryDate,
        updateFittings,
        updateWantsOrderSketch,
        updateSketchDraftUri,
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
