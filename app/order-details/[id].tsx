import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSubscription, usePremium } from '@/contexts/SubscriptionContext';
import { getOrderStatusDisplayConfig } from '@/lib/api';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { ErrorText } from '@/components/ui/ErrorText';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { AiPreviewSection } from '@/components/AiPreviewSection';
import { PaywallModal } from '@/components/subscription';
import { Spacing } from '@/constants/design';
import type { GarmentTypeRecord } from '@/types/templates';
import {
  OrderHeader,
  OrderStatusSection,
  OrderStatusModal,
  OrderMeasurements,
  OrderCatalog,
  OrderPdfActions,
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
  const { upgradeToPro } = useSubscription();
  const { isPremium: isPro } = usePremium();
  const insets = useSafeAreaInsets();
  const FOOTER_HEIGHT = FOOTER_BASE_HEIGHT + FOOTER_VERTICAL_PADDING + insets.bottom;

  const { orderData, setOrderData, companyData, garmentTypes, loading } = useOrderDetails(orderId);

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
  const garmentDisplayNamesForPDF = useMemo(() => {
    const out: Record<string, string> = {};
    for (const g of garmentTypes) {
      out[g.id] = getGarmentDisplayName(g, garmentUnavailableLabel);
    }
    return out;
  }, [garmentTypes, garmentUnavailableLabel]);

  const pdf = useOrderPdf(orderId, orderData, companyData, {
    displayDefinitionsByGarment: measurements.displayDefinitionsByGarment,
    orderGarmentIdsSorted: measurements.orderGarmentIdsSorted,
    garmentDisplayNamesForPDF,
    isPro,
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

  const handleDownloadFromModal = async (mode: 'classic' | 'custom') => {
    pdf.setDownloadModeModalVisible(false);
    await pdf.doDownloadPdf(mode);
  };

  const handleSaveToFolderFromModal = async (mode: 'classic' | 'custom') => {
    pdf.setDownloadModeModalVisible(false);
    await pdf.doSavePdfToFolder(mode);
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
            statusConfig={statusConfig}
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
          downloadModeModalVisible={pdf.downloadModeModalVisible}
          setDownloadModeModalVisible={pdf.setDownloadModeModalVisible}
          pdfDownloadMode={pdf.pdfDownloadMode}
          setPdfDownloadMode={pdf.setPdfDownloadMode}
          pdfDocumentTemplates={pdf.pdfDocumentTemplates}
          selectedPdfTemplateId={pdf.selectedPdfTemplateId}
          setSelectedPdfTemplateId={pdf.setSelectedPdfTemplateId}
          onDownload={handleDownloadFromModal}
          onSaveToFolder={handleSaveToFolderFromModal}
          t={t}
          isAndroid={Platform.OS === 'android'}
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

      <PaywallModal
        visible={pdf.showPdfUpgradeModal}
        onClose={() => pdf.setShowPdfUpgradeModal(false)}
        onUpgrade={async (plan) => {
          const result = await upgradeToPro(plan);
          if (result.success) pdf.setShowPdfUpgradeModal(false);
          else if (result.errorMessage) Alert.alert(t('common.error'), result.errorMessage);
        }}
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
    padding: Spacing.lg,
  },
});
