/**
 * PDF export (classic/custom), download/share, and related UI state for order details.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import {
  shareOrderPDF,
  downloadOrderPDF,
  saveOrderPdfToFolderAsync,
  type PDFLabels,
} from '@/utils';
import { generatePdf, saveCustomPdfBlobToFile, arrayBufferToBase64, listDocumentTemplates } from '@/lib/services/pdfService';
import type { PdfDocumentTemplateRecord } from '@/lib/services/pdfService';
import { savePdfToFolderAsync } from '@/utils/androidPdfSave';
import { ApiError, ApiErrorCode, getStoredAccessToken } from '@/lib/api';
import type { OrderDetailsData } from '@/types/orderDetails';
import type { OrderDetailsCompanyData } from '@/types/orderDetails';
import type { MeasurementDefinition } from '@/constants/garments';

export interface UseOrderPdfOptions {
  displayDefinitionsByGarment: Record<string, MeasurementDefinition[]>;
  orderGarmentIdsSorted: string[];
  garmentDisplayNamesForPDF: Record<string, string>;
  isPro: boolean;
  t: (key: string) => string;
}

export interface UseOrderPdfResult {
  isExporting: boolean;
  downloadModeModalVisible: boolean;
  setDownloadModeModalVisible: (v: boolean) => void;
  pdfDownloadMode: 'classic' | 'custom';
  setPdfDownloadMode: (v: 'classic' | 'custom') => void;
  pdfDocumentTemplates: PdfDocumentTemplateRecord[];
  selectedPdfTemplateId: string | null;
  setSelectedPdfTemplateId: (v: string | null) => void;
  showPdfUpgradeModal: boolean;
  setShowPdfUpgradeModal: (v: boolean) => void;
  doDownloadPdf: (mode: 'classic' | 'custom') => Promise<void>;
  doSavePdfToFolder: (mode: 'classic' | 'custom') => Promise<void>;
  handleExportPDF: () => Promise<void>;
  handleSharePDF: () => Promise<void>;
}

const CLASSIC_PDF_TIMEOUT_MS = 120000;

export function useOrderPdf(
  orderId: string | undefined,
  orderData: OrderDetailsData | null,
  companyData: OrderDetailsCompanyData | null,
  options: UseOrderPdfOptions
): UseOrderPdfResult {
  const {
    displayDefinitionsByGarment,
    orderGarmentIdsSorted,
    garmentDisplayNamesForPDF,
    isPro,
    t,
  } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [downloadModeModalVisible, setDownloadModeModalVisible] = useState(false);
  const [pdfDownloadMode, setPdfDownloadMode] = useState<'classic' | 'custom'>('custom');
  const [pdfDocumentTemplates, setPdfDocumentTemplates] = useState<PdfDocumentTemplateRecord[]>([]);
  const [selectedPdfTemplateId, setSelectedPdfTemplateId] = useState<string | null>(null);
  const [showPdfUpgradeModal, setShowPdfUpgradeModal] = useState(false);

  const pdfLabels: PDFLabels = useMemo(
    () => ({
      orderNumber: t('pdf.orderNumber'),
      orderDate: t('pdf.orderDate'),
      deliveryDate: t('pdf.deliveryDate'),
      client: t('pdf.client'),
      phone: t('pdf.phone'),
      email: t('pdf.email'),
      specialInstructions: t('pdf.specialInstructions'),
      generatedOn: t('pdf.generatedOn'),
      shareDialogTitle: t('pdf.shareDialogTitle'),
    }),
    [t]
  );

  useEffect(() => {
    if (!downloadModeModalVisible || !isPro) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getStoredAccessToken();
        if (!token || cancelled) return;
        const list = await listDocumentTemplates(token);
        if (cancelled) return;
        setPdfDocumentTemplates(list);
        const defaultOrFirst = list.find((tmpl) => tmpl.isDefault) ?? list[0];
        setSelectedPdfTemplateId(defaultOrFirst?.id ?? null);
      } catch {
        setPdfDocumentTemplates([]);
        setSelectedPdfTemplateId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [downloadModeModalVisible, isPro]);

  const measurementDefinitionsForPdf = useMemo(
    () =>
      displayDefinitionsByGarment
        ? Object.fromEntries(
            Object.entries(displayDefinitionsByGarment).map(([gid, defs]) => [
              gid,
              defs.map((d) => ({
                key: d.key,
                label: d.label,
                displayOrder: d.displayOrder,
                inputType: d.inputType,
                options: d.options,
              })),
            ])
          )
        : undefined,
    [displayDefinitionsByGarment]
  );

  const doDownloadPdf = useCallback(
    async (mode: 'classic' | 'custom') => {
      if (!orderId || !orderData) return;
      if (mode === 'classic') {
        if (!companyData) return;
        setIsExporting(true);
        try {
          const pdfOrderData = {
            orderNumber: orderData.orderNumber,
            id: orderData.id,
            clientName: orderData.clientName,
            clientPhone: orderData.clientPhone,
            clientEmail: orderData.clientEmail,
            orderDate: orderData.orderDate,
            total: orderData.total,
            advance: orderData.advance,
            measurements: orderData.measurements,
            measurementDefinitionsByGarment: measurementDefinitionsForPdf,
            garmentOrder: orderGarmentIdsSorted,
            notes: orderData.notes ?? undefined,
          };
          const pdfPromise = downloadOrderPDF(pdfOrderData, companyData, garmentDisplayNamesForPDF, pdfLabels);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('PDF generation timed out')), CLASSIC_PDF_TIMEOUT_MS);
          });
          await Promise.race([pdfPromise, timeoutPromise]);
          Alert.alert(t('common.success'), t('orderDetails.pdfGenerated'));
        } catch {
          Alert.alert(t('common.error'), t('orderDetails.pdfError'));
        } finally {
          setIsExporting(false);
        }
        return;
      }
      setIsExporting(true);
      try {
        const result = await generatePdf(orderId, {
          mode: 'custom',
          templateId: selectedPdfTemplateId ?? undefined,
          responseFormat: 'pdf',
        });
        const timestamp = Date.now();
        const uniqueSuffix = Math.random().toString(36).slice(2, 10);
        const baseName = `order-${orderData.orderNumber ?? orderId}`;
        const filename = `${baseName}-${timestamp}-${uniqueSuffix}.pdf`;
        const uri = await saveCustomPdfBlobToFile(result.arrayBuffer, filename);
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          const dialogTitle =
            pdfLabels.shareDialogTitle != null
              ? pdfLabels.shareDialogTitle.replace(/\{\{number\}\}/g, String(orderData.orderNumber ?? orderId))
              : `Order ${orderData.orderNumber ?? orderId}`;
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
        }
        Alert.alert(t('common.success'), t('orderDetails.pdfGenerated'));
      } catch (err) {
        if (err instanceof ApiError && err.code === ApiErrorCode.CUSTOM_PDF_PRO_ONLY) {
          setShowPdfUpgradeModal(true);
        } else {
          const message =
            err instanceof ApiError && err.messageKey
              ? (t as (key: string, params?: Record<string, string | number>) => string)(err.messageKey, err.messageParams as Record<string, string>)
              : t('orderDetails.pdfError');
          Alert.alert(t('common.error'), message);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [
      orderId,
      orderData,
      companyData,
      measurementDefinitionsForPdf,
      orderGarmentIdsSorted,
      garmentDisplayNamesForPDF,
      pdfLabels,
      selectedPdfTemplateId,
      t,
    ]
  );

  const doSavePdfToFolder = useCallback(
    async (mode: 'classic' | 'custom') => {
      if (!orderId || !orderData || Platform.OS !== 'android') return;
      if (mode === 'classic') {
        if (!companyData) return;
        setIsExporting(true);
        try {
          const pdfOrderData = {
            orderNumber: orderData.orderNumber,
            id: orderData.id,
            clientName: orderData.clientName,
            clientPhone: orderData.clientPhone,
            clientEmail: orderData.clientEmail,
            orderDate: orderData.orderDate,
            total: orderData.total,
            advance: orderData.advance,
            measurements: orderData.measurements,
            measurementDefinitionsByGarment: measurementDefinitionsForPdf,
            garmentOrder: orderGarmentIdsSorted,
            notes: orderData.notes ?? undefined,
          };
          await saveOrderPdfToFolderAsync(pdfOrderData, companyData, garmentDisplayNamesForPDF, pdfLabels);
          Alert.alert(t('common.success'), t('orderDetails.pdfGenerated'));
        } catch {
          Alert.alert(t('common.error'), t('orderDetails.pdfError'));
        } finally {
          setIsExporting(false);
        }
        return;
      }
      setIsExporting(true);
      try {
        const result = await generatePdf(orderId, {
          mode: 'custom',
          templateId: selectedPdfTemplateId ?? undefined,
          responseFormat: 'pdf',
        });
        const timestamp = Date.now();
        const uniqueSuffix = Math.random().toString(36).slice(2, 10);
        const baseName = `order-${orderData.orderNumber ?? orderId}`;
        const filename = `${baseName}-${timestamp}-${uniqueSuffix}.pdf`;
        const base64 = arrayBufferToBase64(result.arrayBuffer);
        await savePdfToFolderAsync(base64, filename);
        Alert.alert(t('common.success'), t('orderDetails.pdfGenerated'));
      } catch (err) {
        if (err instanceof ApiError && err.code === ApiErrorCode.CUSTOM_PDF_PRO_ONLY) {
          setShowPdfUpgradeModal(true);
        } else {
          const message =
            err instanceof ApiError && err.messageKey
              ? (t as (key: string, params?: Record<string, string | number>) => string)(err.messageKey, err.messageParams as Record<string, string>)
              : t('orderDetails.pdfError');
          Alert.alert(t('common.error'), message);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [
      orderId,
      orderData,
      companyData,
      measurementDefinitionsForPdf,
      orderGarmentIdsSorted,
      garmentDisplayNamesForPDF,
      pdfLabels,
      selectedPdfTemplateId,
      t,
    ]
  );

  const handleExportPDF = useCallback(async () => {
    if (!orderData || !companyData) return;
    if (isPro) {
      setDownloadModeModalVisible(true);
    } else {
      await doDownloadPdf('classic');
    }
  }, [orderData, companyData, isPro, doDownloadPdf]);

  const handleSharePDF = useCallback(async () => {
    if (!orderData || !companyData) return;
    setIsExporting(true);
    try {
      const pdfOrderData = {
        orderNumber: orderData.orderNumber,
        id: orderData.id,
        clientName: orderData.clientName,
        clientPhone: orderData.clientPhone,
        clientEmail: orderData.clientEmail,
        orderDate: orderData.orderDate,
        total: orderData.total,
        advance: orderData.advance,
        measurements: orderData.measurements,
        measurementDefinitionsByGarment: measurementDefinitionsForPdf,
      };
      await shareOrderPDF(pdfOrderData, companyData, garmentDisplayNamesForPDF, pdfLabels);
    } catch {
      Alert.alert(t('common.error'), t('orderDetails.shareError'));
    } finally {
      setIsExporting(false);
    }
  }, [
    orderData,
    companyData,
    measurementDefinitionsForPdf,
    garmentDisplayNamesForPDF,
    pdfLabels,
    t,
  ]);

  return {
    isExporting,
    downloadModeModalVisible,
    setDownloadModeModalVisible,
    pdfDownloadMode,
    setPdfDownloadMode,
    pdfDocumentTemplates,
    selectedPdfTemplateId,
    setSelectedPdfTemplateId,
    showPdfUpgradeModal,
    setShowPdfUpgradeModal,
    doDownloadPdf,
    doSavePdfToFolder,
    handleExportPDF,
    handleSharePDF,
  };
}
