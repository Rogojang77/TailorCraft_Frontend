/**
 * Classic PDF export, download/share, and related UI state for order details.
 */

import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { type PDFLabels } from '@/utils';
import { generateClassicPdf, saveCustomPdfBlobToFile, arrayBufferToBase64 } from '@/lib/services/pdfService';
import { savePdfToFolderAsync } from '@/utils/androidPdfSave';
import type { OrderDetailsData } from '@/types/orderDetails';
import type { OrderDetailsCompanyData } from '@/types/orderDetails';
export interface UseOrderPdfOptions {
  t: (key: string) => string;
}

export interface UseOrderPdfResult {
  isExporting: boolean;
  doDownloadPdf: () => Promise<void>;
  doSavePdfToFolder: () => Promise<void>;
  handleExportPDF: () => Promise<void>;
  handleSharePDF: () => Promise<void>;
}

export function useOrderPdf(
  orderId: string | undefined,
  orderData: OrderDetailsData | null,
  companyData: OrderDetailsCompanyData | null,
  options: UseOrderPdfOptions
): UseOrderPdfResult {
  const { t } = options;

  const [isExporting, setIsExporting] = useState(false);

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

  const doDownloadPdf = useCallback(
    async () => {
      if (!orderId || !orderData || !companyData) return;
      setIsExporting(true);
      try {
        const result = await generateClassicPdf(orderId, {
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
      } catch {
        Alert.alert(t('common.error'), t('orderDetails.pdfError'));
      } finally {
        setIsExporting(false);
      }
    },
    [
      orderId,
      orderData,
      companyData,
      pdfLabels,
      t,
    ]
  );

  const doSavePdfToFolder = useCallback(
    async () => {
      if (!orderId || !orderData || Platform.OS !== 'android') return;
      if (!companyData) return;
      setIsExporting(true);
      try {
        const result = await generateClassicPdf(orderId, {
          responseFormat: 'pdf',
        });
        const timestamp = Date.now();
        const uniqueSuffix = Math.random().toString(36).slice(2, 10);
        const baseName = `order-${orderData.orderNumber ?? orderId}`;
        const filename = `${baseName}-${timestamp}-${uniqueSuffix}.pdf`;
        const base64 = arrayBufferToBase64(result.arrayBuffer);
        await savePdfToFolderAsync(base64, filename);
        Alert.alert(t('common.success'), t('orderDetails.pdfGenerated'));
      } catch {
        Alert.alert(t('common.error'), t('orderDetails.pdfError'));
      } finally {
        setIsExporting(false);
      }
    },
    [
      orderId,
      orderData,
      companyData,
      pdfLabels,
      t,
    ]
  );

  const handleExportPDF = useCallback(async () => {
    if (!orderData || !companyData) return;
    await doDownloadPdf();
  }, [orderData, companyData, doDownloadPdf]);

  const handleSharePDF = useCallback(async () => {
    if (!orderData || !companyData) return;
    setIsExporting(true);
    try {
      const result = await generateClassicPdf(orderId!, {
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
    } catch {
      Alert.alert(t('common.error'), t('orderDetails.shareError'));
    } finally {
      setIsExporting(false);
    }
  }, [
    orderData,
    companyData,
    pdfLabels,
    t,
  ]);

  return {
    isExporting,
    doDownloadPdf,
    doSavePdfToFolder,
    handleExportPDF,
    handleSharePDF,
  };
}
