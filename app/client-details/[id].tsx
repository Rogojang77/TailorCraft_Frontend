import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard as Edit3, Plus, Phone, Mail, Calendar, Package, TrendingUp, Trash2, Save, X } from 'lucide-react-native';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { api, apiFetch } from '@/lib/api';
import { orderStatusToLabel, orderItemsFromMeasurements, formatDate, customerFullName } from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

type ClientData = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string | null;
  registrationDate: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  notes: string | null;
};

type OrderHistoryEntry = {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  advance: number;
  status: string;
  orderDate: string;
  pickupDate: string;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  
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
      const [customer, ordersRes] = await Promise.all([
        apiFetch<{
          id: string;
          firstName: string;
          lastName: string;
          email: string | null;
          phone: string;
          notes: string | null;
          createdAt: string;
          _count?: { orders: number };
        }>(api.customers(id)),
        apiFetch<{ orders: Array<{
          id: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          dueDate: string | null;
          measurements: Record<string, unknown> | null;
          customer?: { firstName: string; lastName: string };
        }> }>(api.customerOrders(id)),
      ]);
      const orders = ordersRes.orders ?? [];
      let totalSpent = 0;
      let lastOrder = '';
      for (const o of orders) {
        totalSpent += o.totalAmount;
        if (!lastOrder || (o.orderDate && o.orderDate > lastOrder)) lastOrder = o.orderDate;
      }
      setClientData({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customerFullName(customer.firstName, customer.lastName),
        phone: customer.phone,
        email: customer.email,
        registrationDate: formatDate(customer.createdAt),
        totalOrders: customer._count?.orders ?? orders.length,
        totalSpent,
        lastOrder: formatDate(lastOrder || null),
        notes: customer.notes,
      });
      setOrderHistory(
        orders.map((o) => ({
          id: o.id,
          clientName: customerFullName(customer.firstName, customer.lastName),
          items: orderItemsFromMeasurements(o.measurements),
          total: o.totalAmount,
          advance: o.paidAmount,
          status: orderStatusToLabel(o.status),
          orderDate: formatDate(o.orderDate),
          pickupDate: formatDate(o.dueDate ?? o.orderDate),
        }))
      );
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        setClientData(null);
        setOrderHistory([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  // Cleanup on unmount
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  React.useEffect(() => {
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

  const handleEdit = () => {
    if (!clientData) return;
    setEditFirstName(clientData.firstName);
    setEditLastName(clientData.lastName);
    setEditPhone(clientData.phone);
    setEditEmail(clientData.email || '');
    setEditNotes(clientData.notes || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFirstName('');
    setEditLastName('');
    setEditPhone('');
    setEditEmail('');
    setEditNotes('');
  };

  const handleSave = async () => {
    if (!clientData || !id) return;
    
    // Validation
    if (!editFirstName.trim() || !editLastName.trim() || !editPhone.trim()) {
      Alert.alert('Eroare', 'Numele și telefonul sunt obligatorii.');
      return;
    }

    setSaveLoading(true);
    try {
      const requestBody: {
        firstName: string;
        lastName: string;
        phone: string;
        email?: string | null;
        notes?: string | null;
      } = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim(),
      };

      // Include email - send null if empty to clear it
      const emailTrimmed = editEmail.trim();
      requestBody.email = emailTrimmed || null;

      // Always include notes - send null if empty to delete it
      const notesTrimmed = editNotes.trim();
      requestBody.notes = notesTrimmed || null;

      const updated = await apiFetch<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
        notes: string | null;
        createdAt: string;
        _count?: { orders: number };
      }>(api.customers(id), {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      // Update local state
      setClientData({
        ...clientData,
        firstName: updated.firstName,
        lastName: updated.lastName,
        name: customerFullName(updated.firstName, updated.lastName),
        phone: updated.phone,
        email: updated.email,
        notes: updated.notes,
      });

      // Update order history client name
      setOrderHistory(prev => prev.map(order => ({
        ...order,
        clientName: customerFullName(updated.firstName, updated.lastName),
      })));

      setIsEditing(false);
      Alert.alert('Succes', 'Informațiile clientului au fost actualizate.');
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut actualiza clientul.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRequest = () => setDeleteModalVisible(true);

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await apiFetch(api.customers(id), { method: 'DELETE' });
      setDeleteModalVisible(false);
      Alert.alert('Succes', 'Clientul și toate comenzile au fost șterse.');
      router.back();
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut șterge clientul.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleNewOrder = () => {
    if (clientData) {
      router.push({
        pathname: '/new-order/client-data',
        params: {
          clientId: clientData.id,
          clientName: clientData.name,
          clientPhone: clientData.phone,
          clientEmail: clientData.email || '',
          ...(clientData.notes ? { clientNotes: clientData.notes } : {}),
        },
      });
    } else {
      router.push('/new-order');
    }
  };
  const handleOrderPress = (orderId: string) => router.push(`/order-details/${orderId}`);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalii Client</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!clientData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Detalii Client</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Client negăsit.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.title}>Detalii Client</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCancelEdit}
                activeOpacity={0.7}
                disabled={saveLoading}
              >
                <X size={18} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Save size={18} color={Colors.textInverse} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.clientHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {clientData.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              {isEditing ? (
                <View style={styles.nameInputs}>
                  <TextInput
                    style={styles.nameInput}
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    placeholder="Prenume"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    style={styles.nameInput}
                    value={editLastName}
                    onChangeText={setEditLastName}
                    placeholder="Nume"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ) : (
                <Text style={styles.clientName}>{clientData.name}</Text>
              )}
            </View>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Phone size={16} color="#6B7280" />
              {isEditing ? (
                <TextInput
                  style={styles.contactInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Telefon"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.contactText}>{clientData.phone}</Text>
              )}
            </View>
            {isEditing ? (
              <View style={styles.contactRow}>
                <Mail size={16} color="#6B7280" />
                <TextInput
                  style={styles.contactInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email (opțional)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            ) : clientData.email ? (
              <View style={styles.contactRow}>
                <Mail size={16} color="#6B7280" />
                <Text style={styles.contactText}>{clientData.email}</Text>
              </View>
            ) : null}
            <View style={styles.contactRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.contactText}>Client din: {clientData.registrationDate}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>Note Client</Text>
              <TextInput
                style={styles.notesInput}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Note despre client (opțional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          ) : clientData.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>Note Client</Text>
              <Text style={styles.notesText}>{clientData.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Statistici Client</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Package size={20} color="#D4AF37" />
              <Text style={styles.statValue}>{clientData.totalOrders}</Text>
              <Text style={styles.statLabel}>Comenzi Total</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.statValue}>{clientData.totalSpent} RON</Text>
              <Text style={styles.statLabel}>Valoare Total</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar size={20} color="#3B82F6" />
              <Text style={styles.statValue}>{clientData.lastOrder}</Text>
              <Text style={styles.statLabel}>Ultima Comandă</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Istoricul Comenzilor</Text>
            <TouchableOpacity style={styles.newOrderButton} onPress={handleNewOrder}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.newOrderText}>Comandă Nouă</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={orderHistory}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OrderHistoryItem
                order={item}
                onPress={() => handleOrderPress(item.id)}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyOrders}>Nicio comandă.</Text>}
            contentContainerStyle={styles.ordersList}
            // Performance optimizations
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            removeClippedSubviews={false} // Small list, no need to clip
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => !deleteLoading && setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        title="Șterge client"
        message={`Sigur ștergi „${clientData.name}"? Toate comenzile clientului vor fi șterse.`}
        confirmLabel="Șterge"
        loading={deleteLoading}
      />
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
  saveButton: {
    ...ButtonStyles.primaryIcon,
  },
  cancelButton: {
    ...ButtonStyles.back,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    flex: 1,
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
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  nameInputs: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  nameInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  contactInfo: {
    gap: 8,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  contactInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  notes: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  notesInput: {
    fontSize: 14,
    color: '#92400E',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statsSection: {
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
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  newOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  newOrderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ordersList: {
    gap: 12,
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
  emptyOrders: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
});