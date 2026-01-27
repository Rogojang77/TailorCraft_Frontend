import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface JacketMeasurements {
  chest?: string;
  waist?: string;
  hips?: string;
  frontLength?: string;
  backLength?: string;
  shoulderToShoulder?: string;
  sleeveLength?: string;
  backWidth?: string;
  lapelType?: string;
  model?: string;
  slit?: string;
  pockets?: string;
  lining?: string;
  buttonholes?: string;
  buttons?: string;
  materialCode?: string;
  customization?: string;
  observations?: string;
  size?: string;
}

export interface VestMeasurements {
  chest?: string;
  waist?: string;
  hips?: string;
  frontLength?: string;
  backLength?: string;
  model?: string;
  lining?: string;
  buttons?: string;
  materialCode?: string;
  observations?: string;
}

export interface PantsMeasurements {
  size?: string;
  model?: string;
  waist?: string;
  hips?: string;
  upperLeg?: string;
  knee?: string;
  hem?: string;
  frontCircumference?: string;
  backCircumference?: string;
  interiorLength?: string;
  exteriorLength?: string;
  materialCode?: string;
  observations?: string;
}

export interface DraftOrder {
  orderId?: string; // ID of the order being edited (if any)
  customer: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  measurements: {
    jacket?: JacketMeasurements;
    vest?: VestMeasurements;
    pants?: PantsMeasurements;
  };
  payment: {
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: 'cash' | 'card' | 'transfer';
  };
  dueDate?: string; // ISO date string
  notes?: string;
}

interface OrderDraftContextType {
  draftOrder: DraftOrder;
  updateCustomer: (customer: Partial<DraftOrder['customer']>) => void;
  updateMeasurements: (type: 'jacket' | 'vest' | 'pants', measurements: any) => void;
  updatePayment: (payment: Partial<DraftOrder['payment']>) => void;
  updateDueDate: (dueDate: string | undefined) => void;
  updateNotes: (notes: string | undefined) => void;
  loadOrderData: (orderData: {
    id: string;
    customer?: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
    measurements?: Record<string, Record<string, unknown>> | null;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: string | null;
    dueDate?: string | null;
    notes?: string | null;
  }) => void;
  clearDraft: () => void;
}

const defaultDraftOrder: DraftOrder = {
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

export function OrderDraftProvider({ children }: { children: ReactNode }) {
  const [draftOrder, setDraftOrder] = useState<DraftOrder>(defaultDraftOrder);

  const updateCustomer = (customer: Partial<DraftOrder['customer']>) => {
    setDraftOrder((prev) => ({
      ...prev,
      customer: { ...prev.customer, ...customer },
    }));
  };

  const updateMeasurements = (type: 'jacket' | 'vest' | 'pants', measurements: any) => {
    setDraftOrder((prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [type]: measurements,
      },
    }));
  };

  const updatePayment = (payment: Partial<DraftOrder['payment']>) => {
    setDraftOrder((prev) => ({
      ...prev,
      payment: { ...prev.payment, ...payment },
    }));
  };

  const updateDueDate = (dueDate: string | undefined) => {
    setDraftOrder((prev) => ({
      ...prev,
      dueDate,
    }));
  };

  const updateNotes = (notes: string | undefined) => {
    setDraftOrder((prev) => ({
      ...prev,
      notes,
    }));
  };

  const loadOrderData = (orderData: {
    id: string;
    customer?: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
    measurements?: Record<string, Record<string, unknown>> | null;
    totalAmount: number;
    paidAmount: number;
    paymentMethod?: string | null;
    dueDate?: string | null;
    notes?: string | null;
  }) => {
    // Helper to convert unknown to string
    const str = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      return String(v);
    };

    // Map payment method from backend format to draft format
    const paymentMethodMap: Record<string, 'cash' | 'card' | 'transfer'> = {
      'Numerar': 'cash',
      'Card': 'card',
      'Transfer bancar': 'transfer',
    };

    const customer = orderData.customer;
    const measurements = orderData.measurements ?? {};
    
    setDraftOrder({
      orderId: orderData.id,
      customer: customer
        ? {
            id: customer.id,
            name: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '',
            phone: customer.phone || '',
            email: customer.email || undefined,
          }
        : defaultDraftOrder.customer,
      measurements: {
        jacket: measurements.jacket
          ? Object.fromEntries(
              Object.entries(measurements.jacket).map(([k, v]) => [k, str(v)])
            ) as JacketMeasurements
          : undefined,
        vest: measurements.vest
          ? Object.fromEntries(
              Object.entries(measurements.vest).map(([k, v]) => [k, str(v)])
            ) as VestMeasurements
          : undefined,
        pants: measurements.pants
          ? Object.fromEntries(
              Object.entries(measurements.pants).map(([k, v]) => [k, str(v)])
            ) as PantsMeasurements
          : undefined,
      },
      payment: {
        totalAmount: orderData.totalAmount || 0,
        paidAmount: orderData.paidAmount || 0,
        paymentMethod: orderData.paymentMethod
          ? paymentMethodMap[orderData.paymentMethod] || undefined
          : undefined,
      },
      dueDate: orderData.dueDate || undefined,
      notes: orderData.notes || undefined,
    });
  };

  const clearDraft = () => {
    setDraftOrder(defaultDraftOrder);
  };

  return (
    <OrderDraftContext.Provider
      value={{
        draftOrder,
        updateCustomer,
        updateMeasurements,
        updatePayment,
        updateDueDate,
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
