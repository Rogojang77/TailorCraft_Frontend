import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getOrderStatusDisplayConfig } from '@/lib/api';
import { api, apiFetch, getLocalizedApiMessage, uploadImage } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { ErrorText } from '@/components/ui/ErrorText';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { FittingStatusModal } from '@/components/FittingStatusModal';
import { AiPreviewSection } from '@/components/AiPreviewSection';
import { AtelierSpacing } from '@/constants/atelierDesign';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { FITTING_STATUSES, getFittingStatusDisplayConfig, type FittingStatus, type FittingPayloadSource, toFittingPayload } from '@/lib/fittings';
import type { GarmentTypeRecord } from '@/types/templates';
import {
  OrderHeader,
  OrderStatusSection,
  OrderStatusModal,
  OrderMeasurements,
  OrderCatalog,
  OrderPdfActions,
  OrderFittingsSection,
  OrderSketchesSection,
  OrderEditItemModal,
  OrderEditOrderInfoModal,
} from '@/components/order-details';
import {
  useOrderDetails,
  useOrderMeasurements,
  useOrderStatus,
  useOrderInfoEdit,
  useOrderPdf,
  useOrderDelete,
} from '@/hooks';

function getGarmentDisplayName(garment: GarmentTypeRecord, fallback: string): string {
  const name = (garment.label ?? garment.name ?? '').trim();
  return name || fallback;
}

const FOOTER_BASE_HEIGHT = 52;
const FOOTER_VERTICAL_PADDING = 16 * 2;

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const pathname = usePathname();
  const rawId = params.id;
  const orderId =
    (typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined) ??
    (pathname ? pathname.replace(/^\/order-details\/?/, '').split('/')[0] || undefined : undefined);

  const { t, locale } = useI18n();
  const { colors, isDark } = useTheme();
  const { preferredUnit } = useSettings();
  const insets = useSafeAreaInsets();
  const FOOTER_HEIGHT = FOOTER_BASE_HEIGHT + FOOTER_VERTICAL_PADDING + insets.bottom;

  const { orderData, setOrderData, companyData, garmentTypes, loading } = useOrderDetails(orderId);
  const [showFittingDatePicker, setShowFittingDatePicker] = useState(false);
  const [selectedFittingIndex, setSelectedFittingIndex] = useState<number | null>(null);
  const [fittingsUpdating, setFittingsUpdating] = useState(false);
  const [uploadingPhotoFittingIndex, setUploadingPhotoFittingIndex] = useState<number | null>(null);
  const [pendingNewFittingDate, setPendingNewFittingDate] = useState<Date | null>(null);
  const [fittingStatusModalVisible, setFittingStatusModalVisible] = useState(false);
  const [selectedFittingStatusIndex, setSelectedFittingStatusIndex] = useState<number | null>(null);

  const onOrderUpdated = useMemo(
    () => (updater: (prev: NonNullable<typeof orderData>) => NonNullable<typeof orderData>) => {
      setOrderData((prev) => (prev ? updater(prev) : prev));
    },
    [setOrderData]
  );

  const measurements = useOrderMeasurements({
    orderData,
    garmentTypes,
    orderId,
    onOrderUpdated,
    t,
  });

  const status = useOrderStatus({
    orderId,
    orderData,
    onOrderUpdated,
    t,
  });

  const orderInfoEdit = useOrderInfoEdit({
    orderId,
    orderData,
    onOrderUpdated,
    t,
  });

  const garmentUnavailableLabel = t('orderDetails.garmentDeleted');

  const pdf = useOrderPdf(orderId, orderData, companyData, {
    t,
  });

  const deleteOrder = useOrderDelete({
    orderId,
    onDeleted: () => router.back(),
    t,
  });

  const getStatusDisplayConfig = (rawStatus: string | undefined | null) =>
    getOrderStatusDisplayConfig(rawStatus ?? 'PENDING', colors);

  const formatDeliveryDateDisplay = (date: Date): string =>
    date.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  const formatFittingDateTimeDisplay = (date: Date): string =>
    date.toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const formatFittingStatus = (value?: FittingStatus): string =>
    t(`orderDetails.fittings.status.${value ?? 'SCHEDULED'}`);
  const getFittingStatusConfig = (value?: FittingStatus) => getFittingStatusDisplayConfig(value, colors);
  const hasExplicitTime = (date: Date): boolean => date.getHours() !== 0 || date.getMinutes() !== 0;

  const handleExportPDFWithCompany = async () => {
    if (!companyData) {
      Alert.alert(t('orderDetails.companyDataMissing'), t('orderDetails.companyDataMessage'));
      return;
    }
    await pdf.handleExportPDF();
  };

  const handleSharePDFWithCompany = async () => {
    if (!companyData) {
      Alert.alert(t('orderDetails.companyDataMissing'), t('orderDetails.companyDataMessage'));
      return;
    }
    await pdf.handleSharePDF();
  };

  const saveFittings = async (
    nextFittings: FittingPayloadSource[]
  ) => {
    if (!orderId || !orderData) return;
    setFittingsUpdating(true);
    try {
      await apiFetch(api.orders(orderId), {
        method: 'PUT',
        body: JSON.stringify({
          fittings: nextFittings.map(toFittingPayload),
        }),
      });
      setOrderData((prev) => {
        if (!prev) return prev;
        const normalizedFittings = nextFittings.map((fitting, index) => ({
          id: fitting.id ?? prev.fittings?.[index]?.id ?? `${fitting.scheduledAt}-${index}`,
          scheduledAt: fitting.scheduledAt,
          status: fitting.status ?? 'SCHEDULED',
          notes: fitting.notes ?? null,
          photos: fitting.photos ?? [],
        }));
        return { ...prev, fittings: normalizedFittings };
      });
    } catch (error) {
      Alert.alert(t('common.error'), getLocalizedApiMessage(error, t, t('orderDetails.fittings.saveError')));
    } finally {
      setFittingsUpdating(false);
    }
  };

  const commitNewFitting = async (date: Date) => {
    if (!orderData) return;
    if (!hasExplicitTime(date)) {
      Alert.alert(t('orderDetails.fittings.timeRequiredTitle'), t('orderDetails.fittings.timeRequiredMessage'));
      return;
    }
    const next = [
      ...(orderData.fittings ?? []),
      { scheduledAt: date.toISOString(), status: 'SCHEDULED' as const, notes: null },
    ].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    await saveFittings(next);
  };

  const addFitting = async () => {
    if (!orderData) return;
    const baseDate = orderData.deliveryDate ? new Date(orderData.deliveryDate) : new Date();
    const suggestedDate = new Date(baseDate);
    suggestedDate.setDate(suggestedDate.getDate() - 7);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: suggestedDate,
        mode: 'date',
        onChange: async (event, date) => {
          if (event.type !== 'set' || !date) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: true,
            onChange: async (timeEvent, timeValue) => {
              if (timeEvent.type !== 'set' || !timeValue) return;
              const next = new Date(date);
              next.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
              if (!hasExplicitTime(next)) {
                Alert.alert(t('orderDetails.fittings.timeRequiredTitle'), t('orderDetails.fittings.timeRequiredMessage'));
                return;
              }
              await commitNewFitting(next);
            },
          });
        },
      });
      return;
    }
    setSelectedFittingIndex(null);
    setPendingNewFittingDate(suggestedDate);
    setShowFittingDatePicker(true);
  };

  const pickFittingPhoto = async (source: 'camera' | 'library'): Promise<string | null> => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(t('common.error'), t('orderDetails.fittings.photos.permissionDenied'));
      return null;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  };

  const uploadFittingPhoto = async (index: number, source: 'camera' | 'library') => {
    const localUri = await pickFittingPhoto(source);
    if (!localUri || !orderData?.fittings?.[index]) return;
    setUploadingPhotoFittingIndex(index);
    try {
      const url = await uploadImage(localUri);
      const next = [...(orderData.fittings ?? [])];
      next[index] = { ...next[index], photos: [...(next[index].photos ?? []), url] };
      await saveFittings(next);
    } catch (error) {
      Alert.alert(t('common.error'), getLocalizedApiMessage(error, t, t('orderDetails.fittings.photos.uploadError')));
    } finally {
      setUploadingPhotoFittingIndex(null);
    }
  };

  const addFittingPhoto = (index: number) => {
    Alert.alert(t('orderDetails.fittings.photos.add'), undefined, [
      { text: t('orderDetails.fittings.photos.takePhoto'), onPress: () => void uploadFittingPhoto(index, 'camera') },
      { text: t('orderDetails.fittings.photos.chooseFromLibrary'), onPress: () => void uploadFittingPhoto(index, 'library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const removeFittingPhoto = (index: number, photoIndex: number) => {
    Alert.alert(t('orderDetails.fittings.photos.remove'), t('orderDetails.fittings.photos.removeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          if (!orderData?.fittings?.[index]) return;
          const next = [...orderData.fittings];
          next[index] = { ...next[index], photos: (next[index].photos ?? []).filter((_, i) => i !== photoIndex) };
          void saveFittings(next);
        },
      },
    ]);
  };

  const removeFitting = async (index: number) => {
    if (!orderData) return;
    const next = (orderData.fittings ?? []).filter((_, i) => i !== index);
    await saveFittings(next);
  };

  const openFittingStatusPicker = (index: number) => {
    if (!orderData?.fittings?.[index]) return;
    setSelectedFittingStatusIndex(index);
    setFittingStatusModalVisible(true);
  };

  const handleSelectFittingStatusFromModal = async (statusValue: FittingStatus) => {
    if (!orderData || selectedFittingStatusIndex === null) return;
    const next = [...(orderData.fittings ?? [])];
    if (!next[selectedFittingStatusIndex]) return;
    next[selectedFittingStatusIndex] = { ...next[selectedFittingStatusIndex], status: statusValue };
    await saveFittings(next);
    setFittingStatusModalVisible(false);
    setSelectedFittingStatusIndex(null);
  };

  const openFittingDatePicker = (index: number) => {
    if (!orderData?.fittings?.[index]) return;
    const current = orderData.fittings[index];
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: new Date(current.scheduledAt),
        mode: 'date',
        onChange: async (event, date) => {
          if (event.type !== 'set' || !date || !orderData) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: true,
            onChange: async (timeEvent, timeValue) => {
              if (timeEvent.type !== 'set' || !timeValue || !orderData) return;
              const nextDate = new Date(date);
              nextDate.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
              if (!hasExplicitTime(nextDate)) {
                Alert.alert(t('orderDetails.fittings.timeRequiredTitle'), t('orderDetails.fittings.timeRequiredMessage'));
                return;
              }
              const next = [...(orderData.fittings ?? [])];
              if (!next[index]) return;
              next[index] = { ...next[index], scheduledAt: nextDate.toISOString() };
              next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
              await saveFittings(next);
            },
          });
        },
      });
      return;
    }
    setSelectedFittingIndex(index);
    setShowFittingDatePicker(true);
  };

  const onFittingDateChange = async (event: { type: string }, selectedDate?: Date) => {
    if (event.type !== 'set' || !selectedDate || selectedFittingIndex === null || !orderData) return;
    const next = [...(orderData.fittings ?? [])];
    if (!next[selectedFittingIndex]) return;
    next[selectedFittingIndex] = { ...next[selectedFittingIndex], scheduledAt: selectedDate.toISOString() };
    next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    await saveFittings(next);
  };

  const onFittingDateChangeIos = (event: { type: string }, selectedDate?: Date) => {
    if (event.type !== 'set' || !selectedDate || !orderData) return;
    if (selectedFittingIndex === null) {
      setPendingNewFittingDate(selectedDate);
      return;
    }
    const next = [...(orderData.fittings ?? [])];
    if (!next[selectedFittingIndex]) return;
    next[selectedFittingIndex] = { ...next[selectedFittingIndex], scheduledAt: selectedDate.toISOString() };
    next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    setOrderData((prev) => (prev ? { ...prev, fittings: next } : prev));
  };

  const closeFittingPicker = () => {
    setShowFittingDatePicker(false);
    setSelectedFittingIndex(null);
    setPendingNewFittingDate(null);
  };

  const confirmFittingPicker = async () => {
    if (!orderData) return;
    if (selectedFittingIndex === null) {
      if (pendingNewFittingDate) {
        if (!hasExplicitTime(pendingNewFittingDate)) {
          Alert.alert(t('orderDetails.fittings.timeRequiredTitle'), t('orderDetails.fittings.timeRequiredMessage'));
          return;
        }
        await commitNewFitting(pendingNewFittingDate);
      }
      closeFittingPicker();
      return;
    }
    const next = orderData.fittings ?? [];
    await saveFittings(next);
    closeFittingPicker();
  };

  if (loading) {
    return (
      <ScreenContainer noPadding>
        <ListSkeletonLoader variant="card" count={4} />
      </ScreenContainer>
    );
  }

  if (!orderData) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.loadingContainer}>
          <ErrorText variant="dark">{t('orderDetails.orderNotFound')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  const statusConfig = getStatusDisplayConfig(orderData.rawStatus);

  return (
    <ScreenContainer noPadding>
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: FOOTER_HEIGHT }]}
        >
          <OrderHeader
            orderData={orderData}
            onDeleteRequest={deleteOrder.handleDeleteRequest}
            onEditOrderInfo={orderInfoEdit.openEditOrderInfoModal}
            onStatusPress={() => status.setStatusModalVisible(true)}
            onMarkFullyPaid={status.handleMarkAsFullyPaid}
            markFullyPaidLoading={status.fullPayUpdating}
            markFullyPaidDisabled={status.statusUpdating || status.fullPayUpdating}
            statusConfig={statusConfig}
          />

          <OrderFittingsSection
            fittings={orderData.fittings ?? []}
            fittingsUpdating={fittingsUpdating}
            onAddFitting={addFitting}
            onOpenFittingDatePicker={openFittingDatePicker}
            onOpenFittingStatusPicker={openFittingStatusPicker}
            onRemoveFitting={removeFitting}
            onAddFittingPhoto={addFittingPhoto}
            onRemoveFittingPhoto={removeFittingPhoto}
            uploadingPhotoFittingIndex={uploadingPhotoFittingIndex}
            formatFittingDateTimeDisplay={formatFittingDateTimeDisplay}
            formatFittingStatus={formatFittingStatus}
            getFittingStatusDisplayConfig={getFittingStatusConfig}
            showFittingDatePicker={Platform.OS === 'ios' && showFittingDatePicker}
            selectedFittingIndex={selectedFittingIndex}
            pendingNewFittingDate={pendingNewFittingDate}
            onConfirmFittingPicker={confirmFittingPicker}
            onFittingDateChangeIos={onFittingDateChangeIos}
          />

          <OrderStatusSection
            orderData={orderData}
            deliveryDateUpdating={status.deliveryDateUpdating}
            onDeliveryDatePress={status.openDeliveryDatePicker}
            showDeliveryDatePicker={status.showDeliveryDatePicker}
            deliveryDateForPicker={status.deliveryDateForPicker}
            minDeliveryDate={status.minDeliveryDate}
            formatDeliveryDateDisplay={formatDeliveryDateDisplay}
            onDeliveryDateChange={status.handleDeliveryDateChange}
            onCloseDeliveryDatePicker={() => status.setShowDeliveryDatePicker(false)}
            isDark={isDark}
          />

          <OrderSketchesSection sketches={orderData.sketches ?? []} />

          {orderData.measurements && Object.keys(orderData.measurements).length > 0 && (
            <OrderMeasurements
              orderData={orderData}
              garmentTypes={garmentTypes}
              orderGarmentIdsSorted={measurements.orderGarmentIdsSorted}
              enabledGarmentIdsForEdit={measurements.enabledGarmentIdsForEdit}
              displayDefinitionsByGarment={measurements.displayDefinitionsByGarment}
              displayDefinitionErrors={measurements.displayDefinitionErrors}
              resolvedCatalogItems={measurements.resolvedCatalogItems}
              openEditMeasurementItemModal={measurements.openEditMeasurementItemModal}
              openEditCatalogItemModal={measurements.openEditCatalogItemModal}
              preferredUnit={preferredUnit}
              getGarmentDisplayName={getGarmentDisplayName}
              garmentUnavailableLabel={garmentUnavailableLabel}
            />
          )}

          <OrderCatalog
            orderData={orderData}
            garmentTypes={garmentTypes}
            orderGarmentIdsSorted={measurements.orderGarmentIdsSorted}
            enabledGarmentIdsForEdit={measurements.enabledGarmentIdsForEdit}
            resolvedCatalogItems={measurements.resolvedCatalogItems}
            resolvedCatalogCategoryLabels={measurements.resolvedCatalogCategoryLabels}
            catalogSectionsExpanded={measurements.catalogSectionsExpanded}
            onToggleSection={(garmentId) =>
              measurements.setCatalogSectionsExpanded((prev) => ({
                ...prev,
                [garmentId]: prev[garmentId] === false,
              }))
            }
            openEditCatalogItemModal={measurements.openEditCatalogItemModal}
            getGarmentDisplayName={getGarmentDisplayName}
            garmentUnavailableLabel={garmentUnavailableLabel}
          />

          <AiPreviewSection orderId={orderData.id} orderStatus={orderData.rawStatus} />
        </ScrollView>

        <OrderPdfActions
          onExportPDF={handleExportPDFWithCompany}
          onSharePDF={handleSharePDFWithCompany}
          isExporting={pdf.isExporting}
          t={t}
        />
      </View>

      <DeleteConfirmModal
        visible={deleteOrder.deleteModalVisible}
        onClose={() => !deleteOrder.deleteLoading && deleteOrder.setDeleteModalVisible(false)}
        onConfirm={deleteOrder.handleDeleteConfirm}
        title={t('orders.deleteOrder')}
        message={t('orders.deleteOrderMessage', { name: orderData.clientName })}
        confirmLabel={t('common.delete')}
        loading={deleteOrder.deleteLoading}
      />

      <OrderEditItemModal
        visible={!!measurements.editItemModal}
        editItemModal={measurements.editItemModal}
        editMeasurements={measurements.editMeasurements}
        editDefinitionsByGarment={measurements.editDefinitionsByGarment}
        editDefinitionErrors={measurements.editDefinitionErrors}
        editDefinitionsLoading={measurements.editDefinitionsLoading}
        editCatalogSelections={measurements.editCatalogSelections}
        editCategoriesByGarment={measurements.editCategoriesByGarment}
        editItemsByCategoryByGarment={measurements.editItemsByCategoryByGarment}
        editCatalogLoading={measurements.editCatalogLoading}
        saveLoading={measurements.saveLoading}
        garmentTypes={garmentTypes}
        onClose={measurements.handleCloseEditItemModal}
        onSave={measurements.handleSaveEditItem}
        updateEditMeasurementValue={measurements.updateEditMeasurementValue}
        handleEditCatalogSelectionChange={measurements.handleEditCatalogSelectionChange}
        getGarmentDisplayName={getGarmentDisplayName}
        garmentUnavailableLabel={garmentUnavailableLabel}
      />

      <OrderEditOrderInfoModal
        visible={orderInfoEdit.editOrderInfoModalVisible}
        total={orderInfoEdit.editOrderInfoTotal}
        advance={orderInfoEdit.editOrderInfoAdvance}
        notes={orderInfoEdit.editOrderInfoNotes}
        loading={orderInfoEdit.saveOrderInfoLoading}
        onClose={orderInfoEdit.handleCloseEditOrderInfoModal}
        onSave={orderInfoEdit.handleSaveOrderInfo}
        onTotalChange={orderInfoEdit.setEditOrderInfoTotal}
        onAdvanceChange={orderInfoEdit.setEditOrderInfoAdvance}
        onNotesChange={orderInfoEdit.setEditOrderInfoNotes}
      />

      <OrderStatusModal
        visible={status.statusModalVisible}
        onClose={() => !status.statusUpdating && status.setStatusModalVisible(false)}
        orderData={orderData}
        statusUpdating={status.statusUpdating}
        getStatusDisplayConfig={getStatusDisplayConfig}
        onStatusSelect={status.handleStatusUpdate}
      />

      <FittingStatusModal
        visible={fittingStatusModalVisible}
        onClose={() => {
          if (fittingsUpdating) return;
          setFittingStatusModalVisible(false);
          setSelectedFittingStatusIndex(null);
        }}
        statuses={FITTING_STATUSES}
        selectedStatus={
          selectedFittingStatusIndex !== null ? (orderData.fittings?.[selectedFittingStatusIndex]?.status as FittingStatus | undefined) : undefined
        }
        onSelect={handleSelectFittingStatusFromModal}
        getStatusLabel={formatFittingStatus}
        getStatusDisplayConfig={getFittingStatusConfig}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.lg,
  },
});
