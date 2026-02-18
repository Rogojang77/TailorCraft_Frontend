import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard as Edit3, Share, User, Phone, Calendar, CreditCard, Package, Trash2, Save, X, Check, FileEdit } from 'lucide-react-native';
import {
  shareOrderPDF,
  downloadOrderPDF,
  getSnapshotEntriesInDefinitionOrder,
  getSnapshotDisplayLabel,
  type PDFLabels,
} from '@/utils';
import { generatePdf, saveCustomPdfBlobToFile } from '@/lib/services/pdfService';
import { ApiError, ApiErrorCode } from '@/lib/api';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePremium } from '@/contexts/PremiumContext';
import * as Sharing from 'expo-sharing';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { ErrorText } from '@/components/ui/ErrorText';
import { MeasurementForm } from '@/components/MeasurementForm';
import { api, apiFetch } from '@/lib/api';
import { fetchCompanySettings, fetchGarmentTypesList } from '@/lib/apiCache';
import { orderStatusToLabel, formatDate, customerFullName, getAllOrderStatuses, normalizeGarmentTypeRecord, definitionRecordToFormDefinition } from '@/lib/api-mappers';
import { filterDefinitionsWithValidKey } from '@/lib/measurementDefensive';
import { storageToMeasurementValue, measurementValueToStorage } from '@/lib/measurementValues';
import type { MeasurementValue } from '@/types/measurement';
import type { MeasurementDefinition } from '@/constants/garments';
import { getUnitDisplay } from '@/constants/units';
import { getDisplayUnit } from '@/hooks/useResolvedDefinition';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { InlineSpinner } from '@/components/InlineSpinner';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useI18n } from '@/lib/i18n';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius, CardStyles, StatusStyles } from '@/constants/design';
import { AppFloatingFooter } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/PaywallModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDIT_MODAL_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

function getGarmentDisplayName(garment: GarmentTypeRecord, fallback: string): string {
  const name = (garment.label ?? garment.name ?? '').trim();
  return name || fallback;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { upgradeToPro } = useSubscription();
  const { isPremium: isPro } = usePremium();
  const [isExporting, setIsExporting] = useState(false);
  const [downloadModeModalVisible, setDownloadModeModalVisible] = useState(false);
  const [pdfDownloadMode, setPdfDownloadMode] = useState<'classic' | 'custom'>('custom');
  const [showPdfUpgradeModal, setShowPdfUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [orderData, setOrderData] = useState<{
    id: string;
    orderNumber?: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    orderDate: string;
    total: number;
    advance: number;
    status: string;
    rawStatus: string;
    measurements?: Record<string, Record<string, string>>;
    lastUpdated?: string;
    notes?: string | null;
  } | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTotal, setEditTotal] = useState('');
  const [editAdvance, setEditAdvance] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editMeasurements, setEditMeasurements] = useState<Record<string, Record<string, string>>>({});
  const [editSelectedGarmentIds, setEditSelectedGarmentIds] = useState<string[]>([]);
  const [editDefinitionsByGarment, setEditDefinitionsByGarment] = useState<Record<string, MeasurementDefinition[]>>({});
  const [editDefinitionErrors, setEditDefinitionErrors] = useState<Record<string, boolean>>({});
  const [editDefinitionsLoading, setEditDefinitionsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [companyData, setCompanyData] = useState<{
    name: string;
    owner: string;
    phone: string;
    email: string;
    address: string;
    logo?: string;
  } | null>(null);
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeRecord[]>([]);
  const [displayDefinitionsByGarment, setDisplayDefinitionsByGarment] = useState<Record<string, MeasurementDefinition[]>>({});
  const [displayDefinitionErrors, setDisplayDefinitionErrors] = useState<Record<string, boolean>>({});

  // Track component mount state for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const insets = useSafeAreaInsets();
  const FOOTER_BASE_HEIGHT = 52;
  const FOOTER_VERTICAL_PADDING = 16 * 2;
  const FOOTER_HEIGHT = FOOTER_BASE_HEIGHT + FOOTER_VERTICAL_PADDING + insets.bottom;

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    try {
      const [order, company, rawGarments] = await Promise.all([
        apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          measurements: Record<string, Record<string, unknown>> | null;
          customer?: { firstName: string; lastName: string; phone: string; email: string | null };
          updatedAt?: string;
          notes?: string | null;
        }>(api.orders(id)),
        fetchCompanySettings(),
        fetchGarmentTypesList().catch(() => []),
      ]);
      const list = Array.isArray(rawGarments)
        ? rawGarments.map((g: unknown) => normalizeGarmentTypeRecord(g as Parameters<typeof normalizeGarmentTypeRecord>[0]))
        : [];
      if (isMountedRef.current) setGarmentTypes(list);
      const m = order.measurements ?? {};
      // Convert all measurements to string records dynamically
      const measurements: Record<string, Record<string, string>> = {};
      for (const [garmentId, garmentData] of Object.entries(m)) {
        if (garmentData && typeof garmentData === 'object') {
          const out: Record<string, string> = {};
          for (const k of Object.keys(garmentData)) {
            out[k] = str(garmentData[k]);
          }
          if (Object.keys(out).length > 0) {
            measurements[garmentId] = out;
          }
        }
      }
      
      setOrderData({
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: order.customer ? customerFullName(order.customer.firstName, order.customer.lastName) : '—',
        clientPhone: order.customer?.phone ?? '—',
        clientEmail: order.customer?.email ?? undefined,
        orderDate: formatDate(order.orderDate),
        total: order.totalAmount,
        advance: order.paidAmount,
        status: orderStatusToLabel(order.status),
        rawStatus: order.status,
        measurements,
        lastUpdated: order.updatedAt ? formatDate(order.updatedAt) : undefined,
        notes: order.notes ?? undefined,
      });
      setCompanyData(
        company
          ? {
              name: company.name ?? '',
              owner: company.owner ?? '',
              phone: company.phone ?? '',
              email: company.email ?? '',
              address: company.address ?? '',
              logo: company.logoUrl ?? undefined,
            }
          : null
      );
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        setOrderData(null);
        setCompanyData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  // Cleanup on unmount
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
    if (isMountedRef.current) {
      fetchData();
    }
    return () => {
      // Cleanup on id change or unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Load measurement definitions for read view (to show units next to values)
  useEffect(() => {
    const measurementGarmentIds = orderData?.measurements ? Object.keys(orderData.measurements) : [];
    if (measurementGarmentIds.length === 0) {
      setDisplayDefinitionsByGarment({});
      setDisplayDefinitionErrors({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next: Record<string, MeasurementDefinition[]> = {};
      const errors: Record<string, boolean> = {};
      await Promise.all(
        measurementGarmentIds.map(async (garmentId) => {
          try {
            const defsRes = await apiFetch<
              | MeasurementDefinitionRecord[]
              | { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] }
            >(api.garmentTypeDefinitions(garmentId));
            const raw = Array.isArray(defsRes)
              ? defsRes
              : (defsRes as { measurementDefinitions?: MeasurementDefinitionRecord[] }).measurementDefinitions
                ?? (defsRes as { definitions?: MeasurementDefinitionRecord[] }).definitions
                ?? (defsRes as { measurements?: MeasurementDefinitionRecord[] }).measurements
                ?? [];
            const defs = Array.isArray(raw)
              ? raw
                  .map((d: MeasurementDefinitionRecord & { order?: number }) => definitionRecordToFormDefinition(d))
                  .sort((a, b) => a.displayOrder - b.displayOrder)
              : [];
            if (!cancelled) next[garmentId] = filterDefinitionsWithValidKey(defs);
          } catch {
            if (!cancelled) {
              next[garmentId] = [];
              errors[garmentId] = true;
            }
          }
        })
      );
      if (!cancelled) {
        setDisplayDefinitionsByGarment(next);
        setDisplayDefinitionErrors(errors);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderData?.measurements ? Object.keys(orderData.measurements).sort().join(',') : '']);

  const handleEdit = () => {
    if (!orderData) return;
    if (orderData.rawStatus === 'COMPLETED') {
      Alert.alert(t('common.error'), t('orderDetails.orderAlreadyCompleted'));
      return;
    }
    const initialGarmentIds = orderData.measurements ? Object.keys(orderData.measurements) : [];
    setEditTotal(String(orderData.total));
    setEditAdvance(String(orderData.advance));
    setEditStatus(orderData.rawStatus);
    setEditNotes(orderData.notes ?? '');
    setEditMeasurements(
      orderData.measurements
        ? Object.fromEntries(
            Object.entries(orderData.measurements).map(([gid, m]) => [gid, { ...m }])
          )
        : {}
    );
    setEditSelectedGarmentIds(initialGarmentIds);
    setEditDefinitionsByGarment({});
    setEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    if (saveLoading) return;
    setEditModalVisible(false);
    setEditTotal('');
    setEditAdvance('');
    setEditStatus('');
    setEditNotes('');
    setEditMeasurements({});
    setEditSelectedGarmentIds([]);
    setEditDefinitionsByGarment({});
    setEditDefinitionErrors({});
  };

  // Load measurement definitions when edit modal opens (for selected garments)
  useEffect(() => {
    if (!editModalVisible || editSelectedGarmentIds.length === 0) {
      setEditDefinitionsByGarment({});
      setEditDefinitionErrors({});
      return;
    }
    let cancelled = false;
    setEditDefinitionsLoading(true);
    const loadDefs = async () => {
      const next: Record<string, MeasurementDefinition[]> = {};
      const errors: Record<string, boolean> = {};
      for (const garmentId of editSelectedGarmentIds) {
        try {
          const defsRes = await apiFetch<
            | MeasurementDefinitionRecord[]
            | { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] }
          >(api.garmentTypeDefinitions(garmentId));
          const raw = Array.isArray(defsRes)
            ? defsRes
            : (defsRes as { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] }).measurementDefinitions
              ?? (defsRes as { definitions?: MeasurementDefinitionRecord[] }).definitions
              ?? (defsRes as { measurements?: MeasurementDefinitionRecord[] }).measurements
              ?? [];
          const defs = Array.isArray(raw)
            ? raw
                .map((d: MeasurementDefinitionRecord & { order?: number }) => definitionRecordToFormDefinition(d))
                .sort((a, b) => a.displayOrder - b.displayOrder)
            : [];
          if (!cancelled) next[garmentId] = filterDefinitionsWithValidKey(defs);
        } catch {
          if (!cancelled) {
            next[garmentId] = [];
            errors[garmentId] = true;
          }
        }
      }
      if (!cancelled) {
        setEditDefinitionsByGarment(next);
        setEditDefinitionErrors(errors);
        setEditDefinitionsLoading(false);
      }
    };
    loadDefs();
    return () => {
      cancelled = true;
    };
  }, [editModalVisible, editSelectedGarmentIds.join(',')]);

  const enabledGarmentIdsForEdit = new Set(
    garmentTypes.filter((g) => g.status === 'active').map((g) => g.id)
  );
  const toggleEditGarment = (garmentId: string) => {
    if (!enabledGarmentIdsForEdit.has(garmentId)) return;
    setEditSelectedGarmentIds((prev) =>
      prev.includes(garmentId) ? prev.filter((id) => id !== garmentId) : [...prev, garmentId]
    );
    if (!editSelectedGarmentIds.includes(garmentId)) {
      setEditMeasurements((prev) => ({ ...prev, [garmentId]: {} }));
    }
  };

  const updateEditMeasurementValue = (garmentId: string, key: string, value: MeasurementValue) => {
    setEditMeasurements((prev) => ({
      ...prev,
      [garmentId]: {
        ...(prev[garmentId] ?? {}),
        [key]: measurementValueToStorage(value),
      },
    }));
  };

  const handleSaveEdit = async () => {
    if (!id || !orderData) return;
    if (editSelectedGarmentIds.length === 0) {
      Alert.alert(t('common.error'), t('newOrder.summary.selectItems'));
      return;
    }
    const totalNum = parseFloat(editTotal);
    const advanceNum = parseFloat(editAdvance);
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
    const measurementsToSend: Record<string, Record<string, string>> = {};
    for (const gid of editSelectedGarmentIds) {
      if (!enabledGarmentIdsForEdit.has(gid)) continue;
      const m = editMeasurements[gid];
      if (m && Object.keys(m).length > 0) measurementsToSend[gid] = m;
      else measurementsToSend[gid] = {};
    }
    setSaveLoading(true);
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
        notes?: string | null;
      }>(api.orders(id), {
        method: 'PUT',
        body: JSON.stringify({
          totalAmount: totalNum,
          paidAmount: advanceNum,
          status: editStatus || orderData.rawStatus,
          notes: editNotes.trim() || null,
          measurements: Object.keys(measurementsToSend).length > 0 ? measurementsToSend : undefined,
        }),
      });
      const normalizedMeasurements: Record<string, Record<string, string>> | undefined =
        updated.measurements == null
          ? undefined
          : (() => {
              const out: Record<string, Record<string, string>> = {};
              for (const [gid, m] of Object.entries(updated.measurements)) {
                if (m && typeof m === 'object') {
                  const row: Record<string, string> = {};
                  for (const k of Object.keys(m)) row[k] = str(m[k]);
                  if (Object.keys(row).length > 0) out[gid] = row;
                }
              }
              return Object.keys(out).length > 0 ? out : undefined;
            })();
      setOrderData({
        ...orderData,
        total: updated.totalAmount,
        advance: updated.paidAmount,
        status: orderStatusToLabel(updated.status),
        rawStatus: updated.status,
        notes: updated.notes ?? undefined,
        measurements: normalizedMeasurements,
      });
      setEditModalVisible(false);
      setEditTotal('');
      setEditAdvance('');
      setEditStatus('');
      setEditNotes('');
      setEditMeasurements({});
      Alert.alert(t('common.success'), t('orderDetails.editSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.editError'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRequest = () => setDeleteModalVisible(true);

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await apiFetch(api.orders(id), { method: 'DELETE' });
      setDeleteModalVisible(false);
      Alert.alert(t('common.success'), t('orderDetails.deleteSuccess'));
      router.back();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.deleteError'));
    } finally {
      setDeleteLoading(false);
    }
  };


  const garmentUnavailableLabel = t('orderDetails.garmentDeleted');
  const pdfLabels: PDFLabels = {
    orderNumber: t('pdf.orderNumber'),
    orderDate: t('pdf.orderDate'),
    deliveryDate: t('pdf.deliveryDate'),
    client: t('pdf.client'),
    phone: t('pdf.phone'),
    email: t('pdf.email'),
    specialInstructions: t('pdf.specialInstructions'),
    generatedOn: t('pdf.generatedOn'),
    shareDialogTitle: t('pdf.shareDialogTitle'),
  };
  const garmentDisplayNamesForPDF = (() => {
    const out: Record<string, string> = {};
    for (const g of garmentTypes) {
      out[g.id] = getGarmentDisplayName(g, garmentUnavailableLabel);
    }
    return out;
  })();

  const doDownloadPdf = async (mode: 'classic' | 'custom') => {
    if (!id || !orderData) return;
    if (mode === 'classic') {
      if (!companyData) return;
      setIsExporting(true);
      const CLASSIC_PDF_TIMEOUT_MS = 120000;
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
          measurementDefinitionsByGarment: displayDefinitionsByGarment
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
      const result = await generatePdf(id, { mode: 'custom' });
      const filename = `order-${orderData.orderNumber ?? id}.pdf`;
      const uri = await saveCustomPdfBlobToFile(result.arrayBuffer, filename);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      }
      Alert.alert(t('common.success'), t('orderDetails.pdfGenerated'));
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.CUSTOM_PDF_PRO_ONLY) {
        setShowPdfUpgradeModal(true);
      } else {
        const message = err instanceof ApiError && err.messageKey
          ? t(err.messageKey, err.messageParams as Record<string, string>)
          : t('orderDetails.pdfError');
        Alert.alert(t('common.error'), message);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!orderData || !companyData) return;
    if (isPro) {
      setDownloadModeModalVisible(true);
    } else {
      await doDownloadPdf('classic');
    }
  };

  const handleSharePDF = async () => {
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
        measurementDefinitionsByGarment: displayDefinitionsByGarment
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
      };
      await shareOrderPDF(pdfOrderData, companyData, garmentDisplayNamesForPDF, pdfLabels);
    } catch {
      Alert.alert(t('common.error'), t('orderDetails.shareError'));
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'În lucru': return Colors.warning;
      case 'Finalizat':
      case 'Livrat': return Colors.success;
      case 'În așteptare': return Colors.textSecondary;
      case 'Anulat': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <ScreenContainer noPadding>
        <Header title={t('orderDetails.title')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <FullScreenLoader message={t('orderDetails.loading')} />
      </ScreenContainer>
    );
  }

  if (!orderData) {
    return (
      <ScreenContainer noPadding>
        <Header title={t('orderDetails.title')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <View style={styles.loadingContainer}>
          <ErrorText variant="dark">{t('orderDetails.orderNotFound')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  const remaining = orderData.total - orderData.advance;

  const handleExportPDFWithCompany = async () => {
    if (!companyData) {
      Alert.alert(t('orderDetails.companyDataMissing'), t('orderDetails.companyDataMessage'));
      return;
    }
    await handleExportPDF();
  };

  const handleSharePDFWithCompany = async () => {
    if (!companyData) {
      Alert.alert(t('orderDetails.companyDataMissing'), t('orderDetails.companyDataMessage'));
      return;
    }
    await handleSharePDF();
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || !orderData) return;
    
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
      }>(api.orders(id), {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      setOrderData({
        ...orderData,
        status: orderStatusToLabel(updated.status),
        rawStatus: updated.status,
      });
      
      setStatusModalVisible(false);
      Alert.alert(t('common.success'), t('orderDetails.statusUpdated'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.statusUpdateError'));
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <ScreenContainer noPadding>
      <Header
        title={t('orderDetails.title')}
        onBack={() => router.back()}
        backAccessibilityLabel={t('common.back')}
        rightActions={
          <>
            <Button variant="dangerIcon" onPress={handleDeleteRequest} accessibilityLabel={t('common.delete')}>
              <Trash2 size={18} color={Colors.error} strokeWidth={2.5} />
            </Button>
            <Button variant="primaryIcon" onPress={handleEdit} accessibilityLabel={t('common.edit')}>
              <Edit3 size={18} color={Colors.textInverse} strokeWidth={2.5} />
            </Button>
          </>
        }
      />

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT }]}
        >
        <View style={styles.statusContainer}>
          <Text style={styles.orderNumber}>
            {t('orderDetails.orderNumber', { number: orderData.orderNumber ?? orderData.id })}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('orderDetails.clientInfo')}</Text>
          </View>
          <View style={styles.clientCard}>
            <View style={styles.clientRow}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{orderData.clientName}</Text>
                <View style={styles.contactRow}>
                  <Phone size={16} color={Colors.textSecondary} />
                  <Text style={styles.contactText}>{orderData.clientPhone}</Text>
                </View>
                {orderData.clientEmail ? (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactText}>{orderData.clientEmail}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Calendar size={16} color={Colors.textSecondary} />
                <Text style={styles.dateLabel}>{t('orderDetails.orderDateLabel', { date: orderData.orderDate })}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setStatusModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderData.status) }]}>
                  <Text style={styles.statusText}>{orderData.status}</Text>
                </View>
              </TouchableOpacity>
            </View>
            {orderData.lastUpdated ? (
              <Text style={styles.lastUpdated}>{t('common.lastUpdated')}: {orderData.lastUpdated}</Text>
            ) : null}
          </View>
        </View>

        {/* Render garment sections from snapshot only — no live config */}
        {orderData.measurements && (() => {
          const garmentNameById = new Map<string, string>();
          const garmentById = new Set<string>();
          for (const g of garmentTypes) {
            garmentNameById.set(g.id, getGarmentDisplayName(g, garmentUnavailableLabel));
            garmentById.add(g.id);
          }
          return Object.entries(orderData.measurements).map(([garmentId, measurements]) => {
            const displayName = garmentNameById.get(garmentId) ?? garmentUnavailableLabel;
            const canNavigate = garmentById.has(garmentId);
            const defsLoadFailed = displayDefinitionErrors[garmentId];
            const defs = displayDefinitionsByGarment[garmentId] ?? [];
            const entries = getSnapshotEntriesInDefinitionOrder(measurements, defs);
            if (entries.length === 0) return null;

            const title = t('orderDetails.measurementsForGarment', { name: displayName });
            return (
              <View key={garmentId} style={styles.section}>
                <View style={styles.sectionHeader}>
                  {canNavigate ? (
                    <TouchableOpacity
                      onPress={() => router.push(`/garments/${garmentId}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sectionTitle, styles.sectionTitleLink]}>{title}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.sectionTitle}>{title}</Text>
                  )}
                </View>
                {defsLoadFailed ? (
                  <ErrorText style={styles.measurementsLoadError}>
                    {t('orderDetails.definitionsLoadError')}
                  </ErrorText>
                ) : (
                  <View style={styles.measurementsGrid}>
                    {entries.map(([key, value]) => {
                      const def = defs.find((d) => d.key === key);
                      let unit = def ? getDisplayUnit(def) : undefined;
                      if (unit == null && /^-?\d*\.?\d+$/.test(String(value).trim())) {
                        unit = getUnitDisplay('cm') ?? 'cm';
                      }
                      const valueWithUnit = unit ? `${value} ${unit}` : value;
                      return (
                        <View key={key} style={styles.measurementItem}>
                          <Text style={styles.measurementLabel}>{getSnapshotDisplayLabel(key, def)}</Text>
                          <Text style={styles.measurementValue}>{valueWithUnit}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          });
        })()}

        {/* Payment Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('orderDetails.paymentInfo')}</Text>
          </View>
          
          <View style={styles.paymentGrid}>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>{t('orderDetails.totalOrder')}</Text>
              <Text style={styles.paymentValue}>{orderData.total} RON</Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>{t('orderDetails.advancePaid')}</Text>
              <Text style={styles.paymentValue}>{orderData.advance} RON</Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>{t('orderDetails.toPay')}</Text>
              <Text style={[styles.paymentValue, styles.remainingAmount]}>{remaining} RON</Text>
            </View>
          </View>
        </View>

      </ScrollView>

        <AppFloatingFooter
          primaryLabel={isExporting ? t('orderDetails.generatingPdf') : t('orderDetails.downloadPdf')}
          onPrimaryPress={handleExportPDFWithCompany}
          primaryDisabled={isExporting}
          primaryLoading={isExporting}
          secondaryLabel={t('orderDetails.share')}
          onSecondaryPress={handleSharePDFWithCompany}
          secondaryDisabled={isExporting}
          secondaryIcon={<Share size={20} color={Colors.textSecondary} strokeWidth={2.5} />}
          secondaryBordered
        />
      </View>

      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => !deleteLoading && setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        title={t('orders.deleteOrder')}
        message={orderData ? t('orders.deleteOrderMessage', { name: orderData.clientName }) : ''}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
      />

      {/* Download as: Custom / Classic (Pro only) */}
      <Modal
        visible={downloadModeModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDownloadModeModalVisible(false)}
      >
        <View style={styles.editModalRoot}>
          <TouchableWithoutFeedback onPress={() => setDownloadModeModalVisible(false)}>
            <View style={styles.editModalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.editModalCentered} pointerEvents="box-none">
            <View style={[styles.editModalCard, { maxWidth: EDIT_MODAL_MAX_WIDTH }]}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t('orderDetails.downloadAs')}</Text>
                <TouchableOpacity
                  style={styles.editModalCloseBtn}
                  onPress={() => setDownloadModeModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <X size={22} color={Colors.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <TouchableOpacity
                  style={[styles.downloadModeOption, pdfDownloadMode === 'custom' && styles.downloadModeOptionSelected]}
                  onPress={() => setPdfDownloadMode('custom')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, pdfDownloadMode === 'custom' && styles.radioOuterSelected]}>
                    {pdfDownloadMode === 'custom' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.downloadModeLabel}>{t('orderDetails.downloadCustomTemplate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.downloadModeOption, pdfDownloadMode === 'classic' && styles.downloadModeOptionSelected]}
                  onPress={() => setPdfDownloadMode('classic')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, pdfDownloadMode === 'classic' && styles.radioOuterSelected]}>
                    {pdfDownloadMode === 'classic' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.downloadModeLabel}>{t('orderDetails.downloadClassicTemplate')}</Text>
                </TouchableOpacity>
                <Button
                  variant="primary"
                  size='lg'
                  onPress={async () => {
                    setDownloadModeModalVisible(false);
                    await doDownloadPdf(pdfDownloadMode);
                  }}
                  style={{ marginTop: 16 }}
                >
                  {t('orderDetails.downloadPdf')}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <PaywallModal
        visible={showPdfUpgradeModal}
        onClose={() => setShowPdfUpgradeModal(false)}
        onUpgrade={async (plan) => {
          const result = await upgradeToPro(plan);
          if (result.success) setShowPdfUpgradeModal(false);
          else if (result.errorMessage) Alert.alert(t('common.error'), result.errorMessage);
        }}
      />

      {/* Edit Order Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.editModalRoot}>
          <TouchableWithoutFeedback onPress={handleCloseEditModal}>
            <View style={styles.editModalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.editModalCentered} pointerEvents="box-none">
            <View style={styles.editModalCard}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t('orderDetails.editTitle')}</Text>
                <TouchableOpacity
                  style={styles.editModalCloseBtn}
                  onPress={handleCloseEditModal}
                  disabled={saveLoading}
                  activeOpacity={0.7}
                >
                  <X size={22} color={Colors.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <KeyboardAwareScrollView
                style={styles.editModalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Garment selection (same as new-order index) */}
                <Text style={styles.editModalSectionTitle}>{t('newOrder.summary.itemsOrdered')}</Text>
                <View style={styles.editModalGarmentList}>
                  {garmentTypes.filter((g) => g.status === 'active').map((garment) => {
                    const selected = editSelectedGarmentIds.includes(garment.id);
                    const displayName = getGarmentDisplayName(garment, garmentUnavailableLabel);
                    return (
                      <TouchableOpacity
                        key={garment.id}
                        style={[styles.editModalGarmentCard, selected && styles.editModalGarmentCardSelected]}
                        onPress={() => toggleEditGarment(garment.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.editModalCheckbox, selected && styles.editModalCheckboxSelected]}>
                          {selected ? <Check size={18} color={Colors.textInverse} strokeWidth={2.5} /> : null}
                        </View>
                        <Text style={styles.editModalGarmentCardTitle} numberOfLines={1}>{displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {editSelectedGarmentIds.length === 0 && (
                  <Text style={styles.editModalSelectOneHint}>{t('newOrder.summary.noItemsSelected')}</Text>
                )}

                {/* Measurements (same as new-order measurements – MeasurementForm per garment) */}
                {editSelectedGarmentIds.length > 0 && (
                  <>
                    <View style={styles.editModalMeasurementsSection}>
                      <FileEdit size={18} color={Colors.primary} />
                      <Text style={styles.editModalSectionTitle}>{t('orderDetails.measurementsSection')}</Text>
                    </View>
                    {editDefinitionsLoading ? (
                      <View style={styles.editModalLoadingDefs}>
                        <InlineSpinner size="small" />
                        <Text style={styles.editModalLoadingDefsText}>{t('common.loading')}</Text>
                      </View>
                    ) : (
                      editSelectedGarmentIds.map((garmentId) => {
                        const defs = editDefinitionsByGarment[garmentId];
                        const displayName = garmentTypes.find((g) => g.id === garmentId)
                          ? getGarmentDisplayName(garmentTypes.find((g) => g.id === garmentId)!, garmentUnavailableLabel)
                          : garmentUnavailableLabel;
                        const existing = editMeasurements[garmentId] ?? {};
                        const formValues: Record<string, MeasurementValue> = {};
                        if (defs) {
                          for (const d of defs) {
                            if (d.inputType === 'calculated') continue;
                            formValues[d.key] = storageToMeasurementValue(existing[d.key], d.inputType ?? 'text');
                          }
                        }
                        return (
                          <View key={garmentId} style={styles.editModalGarmentBlock}>
                            <Text style={styles.editModalGarmentTitle}>
                              {t('orderDetails.measurementsForGarment', { name: displayName })}
                            </Text>
                            {editDefinitionErrors[garmentId] ? (
                              <ErrorText style={styles.editModalDefsError}>
                                {t('orderDetails.definitionsLoadError')}
                              </ErrorText>
                            ) : defs && defs.length > 0 ? (
                              <MeasurementForm
                                definitions={defs}
                                values={formValues}
                                onChange={(key, value) => updateEditMeasurementValue(garmentId, key, value)}
                                twoColumns
                                compact
                              />
                            ) : (
                              <Text style={styles.editModalNoDefsHint}>{t('orderDetails.measurementsSection')} —</Text>
                            )}
                          </View>
                        );
                      })
                    )}
                  </>
                )}

                {/* Payment (same labels as new-order summary) */}
                <View style={styles.editModalSection}>
                  <View style={styles.editModalPaymentHeader}>
                    <CreditCard size={20} color={Colors.primary} />
                    <Text style={styles.editModalSectionTitle}>{t('newOrder.summary.paymentSection')}</Text>
                  </View>
                  <Input
                    label={t('newOrder.summary.totalLabelRon')}
                    value={editTotal}
                    onChangeText={setEditTotal}
                    placeholder={t('newOrder.summary.amountPlaceholder')}
                    keyboardType="numeric"
                    containerStyle={styles.editModalInput}
                  />
                  <Input
                    label={t('newOrder.summary.paidAmount') + ' (RON)'}
                    value={editAdvance}
                    onChangeText={setEditAdvance}
                    placeholder={t('newOrder.summary.amountPlaceholder')}
                    keyboardType="numeric"
                    containerStyle={styles.editModalInput}
                  />
                </View>

                {/* Status */}
                <Text style={styles.editModalFieldLabel}>{t('orderDetails.updateStatusModal')}</Text>
                <View style={styles.editModalStatusRow}>
                  {getAllOrderStatuses().map((statusOption) => (
                    <TouchableOpacity
                      key={statusOption.code}
                      style={[
                        styles.editModalStatusOption,
                        editStatus === statusOption.code && styles.editModalStatusOptionSelected,
                      ]}
                      onPress={() => setEditStatus(statusOption.code)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.editModalStatusBadge,
                          { backgroundColor: getStatusColor(statusOption.label) },
                        ]}
                      >
                        <Text style={styles.editModalStatusBadgeText}>{statusOption.label}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes (same as creation) */}
                <Input
                  label={t('orderDetails.notesLabel')}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder={t('orderDetails.notesPlaceholder')}
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  optional
                  containerStyle={styles.editModalInput}
                />
              </KeyboardAwareScrollView>
              <View style={styles.editModalActions}>
                <Button
                  variant="secondary"
                  onPress={handleCloseEditModal}
                  disabled={saveLoading}
                  style={styles.editModalCancelBtn}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSaveEdit}
                  disabled={saveLoading}
                  loading={saveLoading}
                  leftIcon={saveLoading ? undefined : <Save size={18} color={Colors.textInverse} strokeWidth={2.5} />}
                  style={styles.editModalSaveBtn}
                >
                  {t('common.save')}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !statusUpdating && setStatusModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('orderDetails.updateStatusModal')}</Text>
            <TouchableOpacity
              onPress={() => !statusUpdating && setStatusModalVisible(false)}
              style={styles.closeButton}
              disabled={statusUpdating}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>
              Selectează noul status pentru comanda #{orderData?.orderNumber ?? orderData?.id}
            </Text>

            {getAllOrderStatuses().map((statusOption) => {
              const isSelected = orderData?.rawStatus === statusOption.code;
              return (
                <TouchableOpacity
                  key={statusOption.code}
                  style={[
                    styles.statusOption,
                    isSelected && styles.statusOptionSelected,
                  ]}
                  onPress={() => !statusUpdating && handleStatusUpdate(statusOption.code)}
                  disabled={statusUpdating || isSelected}
                >
                  <View style={styles.statusOptionContent}>
                    <View
                      style={[
                        styles.statusOptionBadge,
                        { backgroundColor: getStatusColor(statusOption.label) },
                      ]}
                    >
                      <Text style={styles.statusOptionBadgeText}>{statusOption.label}</Text>
                    </View>
                    {isSelected && (
                      <Text style={styles.statusOptionSelectedText}>{t('orderDetails.currentStatus')}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {statusUpdating && (
              <View style={styles.statusUpdatingContainer}>
                <InlineSpinner size="small" />
                <Text style={styles.statusUpdatingText}>{t('orderDetails.updating')}</Text>
              </View>
            )}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  orderNumber: {
    ...Typography.bodyBold,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  section: {
    ...CardStyles.cardElevated,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  sectionTitleLink: {
    color: Colors.primaryDark,
  },
  clientCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...Typography.bodyBold,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    ...Typography.caption,
    marginLeft: Spacing.xs + 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs + 2,
  },
  lastUpdated: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: Spacing.xs + 2,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  measurementItem: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minWidth: '30%',
    flex: 1,
  },
  measurementLabel: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  measurementValue: {
    ...Typography.bodyBold,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  measurementsLoadError: {
    marginTop: Spacing.sm,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  paymentItem: {
    ...StatusStyles.success,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
  },
  paymentLabel: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.successText,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  paymentValue: {
    ...Typography.bodyBold,
    fontWeight: '700',
    color: Colors.successText,
    textAlign: 'center',
  },
  remainingAmount: {
    color: Colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h3,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalSubtitle: {
    ...Typography.caption,
    marginBottom: Spacing.lg,
  },
  statusOption: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  statusOptionSelected: {
    ...StatusStyles.success,
    opacity: 0.7,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOptionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusOptionBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  statusOptionSelectedText: {
    ...Typography.small,
    color: Colors.success,
    fontWeight: '600',
  },
  statusUpdatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  statusUpdatingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Edit order modal (like client details edit)
  editModalRoot: {
    flex: 1,
  },
  editModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayModal,
  },
  editModalCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  editModalCard: {
    width: '100%',
    maxWidth: EDIT_MODAL_MAX_WIDTH,
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.xl,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  editModalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  editModalCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  downloadModeOptionSelected: {
    backgroundColor: Colors.primary + '14',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  downloadModeLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  editModalScroll: {
    maxHeight: 500,
    paddingHorizontal: Spacing.lg,
  },
  editModalSection: {
    marginBottom: Spacing.md,
  },
  editModalGarmentList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editModalGarmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  editModalGarmentCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  editModalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalCheckboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  editModalGarmentCardTitle: {
    ...Typography.small,
    color: Colors.textPrimary,
    flex: 1,
  },
  editModalSelectOneHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  editModalMeasurementsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  editModalLoadingDefs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  editModalLoadingDefsText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  editModalNoDefsHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  editModalDefsError: {
    marginTop: Spacing.sm,
  },
  editModalPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  editModalInput: {
    marginBottom: Spacing.md,
  },
  editModalFieldLabel: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  editModalSectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  editModalGarmentBlock: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editModalGarmentTitle: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  editModalStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editModalStatusOption: {
    padding: 2,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  editModalStatusOptionSelected: {
    borderColor: Colors.primary,
  },
  editModalStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  editModalStatusBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editModalCancelBtn: {
    flex: 1,
  },
  editModalSaveBtn: {
    flex: 1,
  },
});