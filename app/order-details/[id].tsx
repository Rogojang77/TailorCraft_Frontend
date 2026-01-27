import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard as Edit3, Download, Share, User, Phone, Calendar, CreditCard, Package, Shirt, Contact as PantsIcon, Trash2 } from 'lucide-react-native';
import { generateOrderPDF, shareOrderPDF, downloadOrderPDF } from '@/utils/pdfGenerator';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { api, apiFetch } from '@/lib/api';
import { orderStatusToLabel, formatDate, customerFullName, getAllOrderStatuses } from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isExporting, setIsExporting] = useState(false);
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
    pickupDate: string;
    total: number;
    advance: number;
    paymentMethod: string;
    status: string;
    rawStatus: string;
    jacket?: Record<string, string>;
    vest?: Record<string, string>;
    pants?: Record<string, string>;
  } | null>(null);
  const [companyData, setCompanyData] = useState<{
    name: string;
    owner: string;
    phone: string;
    email: string;
    address: string;
    logo?: string;
  } | null>(null);

  // Track component mount state for cleanup
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    try {
      const [order, company] = await Promise.all([
        apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          dueDate: string | null;
          paymentMethod: string | null;
          measurements: Record<string, Record<string, unknown>> | null;
          customer?: { firstName: string; lastName: string; phone: string; email: string | null };
        }>(api.orders(id)),
        apiFetch<{ name: string; owner: string; phone: string; email: string; address: string | null; logoUrl: string | null }>(api.settings.company).catch(() => null),
      ]);
      const m = order.measurements ?? {};
      const jacket = m.jacket as Record<string, unknown> | undefined;
      const vest = m.vest as Record<string, unknown> | undefined;
      const pants = m.pants as Record<string, unknown> | undefined;
      const toStrRecord = (o: Record<string, unknown> | undefined): Record<string, string> | undefined => {
        if (!o || typeof o !== 'object') return undefined;
        const out: Record<string, string> = {};
        for (const k of Object.keys(o)) out[k] = str(o[k]);
        return out;
      };
      setOrderData({
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: order.customer ? customerFullName(order.customer.firstName, order.customer.lastName) : '—',
        clientPhone: order.customer?.phone ?? '—',
        clientEmail: order.customer?.email ?? undefined,
        orderDate: formatDate(order.orderDate),
        pickupDate: formatDate(order.dueDate ?? order.orderDate),
        total: order.totalAmount,
        advance: order.paidAmount,
        paymentMethod: order.paymentMethod ?? '—',
        status: orderStatusToLabel(order.status),
        rawStatus: order.status,
        jacket: toStrRecord(jacket),
        vest: toStrRecord(vest),
        pants: toStrRecord(pants),
      });
      setCompanyData(
        company
          ? {
              name: company.name,
              owner: company.owner,
              phone: company.phone,
              email: company.email,
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

  const handleEdit = () => router.push(`/new-order?orderId=${id}`);

  const handleDeleteRequest = () => setDeleteModalVisible(true);

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await apiFetch(api.orders(id), { method: 'DELETE' });
      setDeleteModalVisible(false);
      Alert.alert('Succes', 'Comanda a fost ștearsă.');
      router.back();
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut șterge comanda.');
    } finally {
      setDeleteLoading(false);
    }
  };


  const handleExportPDF = async () => {
    if (!orderData || !companyData) return;
    setIsExporting(true);
    try {
      await downloadOrderPDF(orderData as any, companyData);
      Alert.alert('Succes', 'PDF-ul a fost generat și salvat!');
    } catch {
      Alert.alert('Eroare', 'Nu s-a putut genera PDF-ul. Încercați din nou.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePDF = async () => {
    if (!orderData || !companyData) return;
    setIsExporting(true);
    try {
      await shareOrderPDF(orderData as any, companyData);
    } catch {
      Alert.alert('Eroare', 'Nu s-a putut partaja PDF-ul. Încercați din nou.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'În lucru': return '#F59E0B';
      case 'Finalizat': return '#10B981';
      case 'În așteptare': return '#6B7280';
      case 'Anulat': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalii Comandă</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalii Comandă</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Comanda nu a fost găsită.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = orderData.total - orderData.advance;

  const handleExportPDFWithCompany = async () => {
    if (!companyData) {
      Alert.alert('Lipsesc datele firmei', 'Configurați datele firmei în Profil pentru a exporta PDF.');
      return;
    }
    await handleExportPDF();
  };

  const handleSharePDFWithCompany = async () => {
    if (!companyData) {
      Alert.alert('Lipsesc datele firmei', 'Configurați datele firmei în Profil pentru a partaja PDF.');
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
        dueDate: string | null;
        paymentMethod: string | null;
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
      Alert.alert('Succes', 'Statusul comenzii a fost actualizat.');
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut actualiza statusul comenzii.');
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.title}>Detalii Comandă</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.deleteHeaderBtn} 
            onPress={handleDeleteRequest}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={Colors.error} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <Edit3 size={18} color={Colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusContainer}>
          <Text style={styles.orderNumber}>
            Comanda #{orderData.orderNumber ?? orderData.id}
          </Text>
          <TouchableOpacity
            onPress={() => setStatusModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderData.status) }]}>
              <Text style={styles.statusText}>{orderData.status}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#D4AF37" />
            <Text style={styles.sectionTitle}>Informații Client</Text>
          </View>
          <View style={styles.clientCard}>
            <View style={styles.clientRow}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{orderData.clientName}</Text>
                <View style={styles.contactRow}>
                  <Phone size={16} color="#6B7280" />
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
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.dateLabel}>Comandă: {orderData.orderDate}</Text>
              </View>
              <View style={styles.dateItem}>
                <Calendar size={16} color="#D4AF37" />
                <Text style={styles.dateLabel}>Preluare: {orderData.pickupDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {orderData.jacket && Object.keys(orderData.jacket).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shirt size={20} color="#D4AF37" />
              <Text style={styles.sectionTitle}>Măsurători Sacou</Text>
            </View>
            
            <View style={styles.measurementsGrid}>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Bust</Text>
                <Text style={styles.measurementValue}>{orderData.jacket?.chest ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Talie</Text>
                <Text style={styles.measurementValue}>{orderData.jacket?.waist ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Șold</Text>
                <Text style={styles.measurementValue}>{orderData.jacket?.hips ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Lungime Față</Text>
                <Text style={styles.measurementValue}>{orderData.jacket?.frontLength ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Lungime Spate</Text>
                <Text style={styles.measurementValue}>{orderData.jacket?.backLength ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Mânecă</Text>
                <Text style={styles.measurementValue}>{orderData.jacket?.sleeveLength ?? '—'} cm</Text>
              </View>
            </View>
            <View style={styles.styleOptions}>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Model</Text>
                <Text style={styles.styleValue}>{orderData.jacket?.model ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Rever</Text>
                <Text style={styles.styleValue}>{orderData.jacket?.lapelType ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Mărime</Text>
                <Text style={styles.styleValue}>{orderData.jacket?.size ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Material</Text>
                <Text style={styles.styleValue}>{orderData.jacket?.materialCode ?? '—'}</Text>
              </View>
            </View>
            {orderData.jacket?.observations ? (
              <View style={styles.observations}>
                <Text style={styles.observationsTitle}>Observații</Text>
                <Text style={styles.observationsText}>{orderData.jacket.observations}</Text>
              </View>
            ) : null}
          </View>
        )}

        {orderData.vest && Object.keys(orderData.vest).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Package size={20} color="#D4AF37" />
              <Text style={styles.sectionTitle}>Măsurători Vestă</Text>
            </View>
            <View style={styles.measurementsGrid}>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Bust</Text>
                <Text style={styles.measurementValue}>{orderData.vest?.chest ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Talie</Text>
                <Text style={styles.measurementValue}>{orderData.vest?.waist ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Șold</Text>
                <Text style={styles.measurementValue}>{orderData.vest?.hips ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Lungime Față</Text>
                <Text style={styles.measurementValue}>{orderData.vest?.frontLength ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Lungime Spate</Text>
                <Text style={styles.measurementValue}>{orderData.vest?.backLength ?? '—'} cm</Text>
              </View>
            </View>
            <View style={styles.styleOptions}>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Model</Text>
                <Text style={styles.styleValue}>{orderData.vest?.model ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Căptușeală</Text>
                <Text style={styles.styleValue}>{orderData.vest?.lining ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Nasturi</Text>
                <Text style={styles.styleValue}>{orderData.vest?.buttons ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Material</Text>
                <Text style={styles.styleValue}>{orderData.vest?.materialCode ?? '—'}</Text>
              </View>
            </View>
            {orderData.vest?.observations ? (
              <View style={styles.observations}>
                <Text style={styles.observationsTitle}>Observații</Text>
                <Text style={styles.observationsText}>{orderData.vest.observations}</Text>
              </View>
            ) : null}
          </View>
        )}

        {orderData.pants && Object.keys(orderData.pants).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <PantsIcon size={20} color="#D4AF37" />
              <Text style={styles.sectionTitle}>Măsurători Pantaloni</Text>
            </View>
            <View style={styles.measurementsGrid}>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Mărime</Text>
                <Text style={styles.measurementValue}>{orderData.pants?.size ?? '—'}</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Talie</Text>
                <Text style={styles.measurementValue}>{orderData.pants?.waist ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Șold</Text>
                <Text style={styles.measurementValue}>{orderData.pants?.hips ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Picior Sus</Text>
                <Text style={styles.measurementValue}>{orderData.pants?.upperLeg ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Genunchi</Text>
                <Text style={styles.measurementValue}>{orderData.pants?.knee ?? '—'} cm</Text>
              </View>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementLabel}>Tiv</Text>
                <Text style={styles.measurementValue}>{orderData.pants?.hem ?? '—'} cm</Text>
              </View>
            </View>
            <View style={styles.styleOptions}>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Model</Text>
                <Text style={styles.styleValue}>{orderData.pants?.model ?? '—'}</Text>
              </View>
              <View style={styles.styleItem}>
                <Text style={styles.styleLabel}>Material</Text>
                <Text style={styles.styleValue}>{orderData.pants?.materialCode ?? '—'}</Text>
              </View>
            </View>
            {orderData.pants?.observations ? (
              <View style={styles.observations}>
                <Text style={styles.observationsTitle}>Observații</Text>
                <Text style={styles.observationsText}>{orderData.pants.observations}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Payment Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#D4AF37" />
            <Text style={styles.sectionTitle}>Informații Plată</Text>
          </View>
          
          <View style={styles.paymentGrid}>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Total Comandă</Text>
              <Text style={styles.paymentValue}>{orderData.total} RON</Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Avans Plătit</Text>
              <Text style={styles.paymentValue}>{orderData.advance} RON</Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>De Plătit</Text>
              <Text style={[styles.paymentValue, styles.remainingAmount]}>{remaining} RON</Text>
            </View>
            <View style={styles.paymentItem}>
              <Text style={styles.paymentLabel}>Metoda Plată</Text>
              <Text style={styles.paymentValue}>{orderData.paymentMethod}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSharePDFWithCompany}
              disabled={isExporting}
            >
              <Share size={20} color="#6B7280" />
              <Text style={styles.secondaryButtonText}>Partajează</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.primaryButton, isExporting && styles.disabledButton]}
              onPress={handleExportPDFWithCompany}
              disabled={isExporting}
            >
              <Download size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {isExporting ? 'Generez PDF...' : 'Descarcă PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => !deleteLoading && setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        title="Șterge comandă"
        message={orderData ? `Sigur ștergi comanda pentru „${orderData.clientName}"?` : ''}
        confirmLabel="Șterge"
        loading={deleteLoading}
      />

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !statusUpdating && setStatusModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Actualizează Status Comandă</Text>
            <TouchableOpacity
              onPress={() => !statusUpdating && setStatusModalVisible(false)}
              style={styles.closeButton}
              disabled={statusUpdating}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
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
                      <Text style={styles.statusOptionSelectedText}>Status actual</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {statusUpdating && (
              <View style={styles.statusUpdatingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.statusUpdatingText}>Se actualizează...</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    ...HeaderStyles.container,
  },
  backButton: {
    ...ButtonStyles.back,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 96,
  },
  headerActions: {
    ...HeaderStyles.actions,
  },
  deleteHeaderBtn: {
    ...ButtonStyles.dangerIcon,
  },
  editButton: {
    ...ButtonStyles.primaryIcon,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  clientCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
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
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  measurementItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    minWidth: '30%',
    flex: 1,
  },
  measurementLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  styleOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  styleItem: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
    flex: 1,
  },
  styleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  styleValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  observations: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  observationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  observationsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentItem: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 16,
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
    textAlign: 'center',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    textAlign: 'center',
  },
  remainingAmount: {
    color: '#DC2626',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    ...ButtonStyles.secondary,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  primaryButton: {
    ...ButtonStyles.primary,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  disabledButton: {
    opacity: 0.6,
  },
  bottomSpacer: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#B91C1C',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  statusOption: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  statusOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    opacity: 0.7,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusOptionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusOptionSelectedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  statusUpdatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  statusUpdatingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});