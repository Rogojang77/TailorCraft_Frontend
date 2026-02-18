import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CreditCard as Edit3, Plus, Phone, Mail, Calendar, Trash2, Save, X, User } from 'lucide-react-native';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { ErrorText } from '@/components/ui/ErrorText';
import { Section } from '@/components/ui/Section';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { api, apiFetch } from '@/lib/api';
import { orderStatusToLabel, orderItemsFromMeasurements, formatDate, customerFullName } from '@/lib/api-mappers';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useI18n } from '@/lib/i18n';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius, CardStyles, StatusStyles, CompactLayoutStyles } from '@/constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDIT_MODAL_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

type ClientData = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string | null;
  registrationDate: string;
  notes: string | null;
};

type OrderHistoryEntry = {
  id: string;
  orderNumber: string;
  clientName: string;
  items: string[];
  total: number;
  advance: number;
  status: string;
  orderDate: string;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
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
          updatedAt?: string;
          _count?: { orders: number };
        }>(api.customers(id)),
        apiFetch<{ orders: Array<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          measurements: Record<string, unknown> | null;
          customer?: { firstName: string; lastName: string };
        }> }>(api.customerOrders(id)),
      ]);
      const orders = ordersRes.orders ?? [];
      setClientData({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customerFullName(customer.firstName, customer.lastName),
        phone: customer.phone,
        email: customer.email,
        registrationDate: formatDate(customer.createdAt),
        notes: customer.notes,
      });
      setOrderHistory(
        orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          clientName: customerFullName(customer.firstName, customer.lastName),
          items: orderItemsFromMeasurements(o.measurements),
          total: o.totalAmount,
          advance: o.paidAmount,
          status: o.status, // Pass raw status code for color-coding
          orderDate: formatDate(o.orderDate),
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
    setEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    if (saveLoading) return;
    setEditModalVisible(false);
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
      Alert.alert(t('common.error'), t('clientDetails.saveValidationRequired'));
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

      setEditModalVisible(false);
      setEditFirstName('');
      setEditLastName('');
      setEditPhone('');
      setEditEmail('');
      setEditNotes('');
      Alert.alert(t('common.success'), t('clientDetails.saveSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('clientDetails.saveError'));
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
      Alert.alert(t('common.success'), t('clientDetails.deleteSuccess'));
      router.back();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('clientDetails.deleteError'));
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
      <ScreenContainer noPadding>
        <Header title={t('clientDetails.title')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <FullScreenLoader message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  if (!clientData) {
    return (
      <ScreenContainer noPadding>
        <Header title={t('clientDetails.title')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <View style={styles.loadingContainer}>
          <ErrorText variant="dark">{t('clientDetails.clientNotFound')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <Header
        title={t('clientDetails.title')}
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.clientHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {clientData.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{clientData.name}</Text>
            </View>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Phone size={16} color={Colors.textSecondary} />
              <Text style={styles.contactText}>{clientData.phone}</Text>
            </View>
            {clientData.email ? (
              <View style={styles.contactRow}>
                <Mail size={16} color={Colors.textSecondary} />
                <Text style={styles.contactText}>{clientData.email}</Text>
              </View>
            ) : null}
            <View style={styles.contactRow}>
              <Calendar size={16} color={Colors.textSecondary} />
              <Text style={styles.contactText}>{t('clientDetails.clientSince')}: {clientData.registrationDate}</Text>
            </View>
          </View>

          {clientData.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>{t('clientDetails.notesTitle')}</Text>
              <Text style={styles.notesText}>{clientData.notes}</Text>
            </View>
          ) : null}
        </View>

        <Section
          title={t('orders.tabs.orderHistory')}
          style={CompactLayoutStyles.compactSection}
          headerRight={
            <Button variant="primary" size="sm" onPress={handleNewOrder} leftIcon={<Plus size={16} color={Colors.textInverse} />} style={styles.newOrderButton}>
              {t('newOrder.title')}
            </Button>
          }
        >
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
            ListEmptyComponent={<Text style={styles.emptyOrders}>{t('orders.emptyOrders')}</Text>}
            contentContainerStyle={styles.ordersList}
            // Performance optimizations
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            removeClippedSubviews={false} // Small list, no need to clip
          />
        </Section>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={handleCloseEditModal}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCentered} pointerEvents="box-none">
            <View style={styles.editModalCard}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t('clientDetails.editTitle')}</Text>
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
                <Input
                  label={t('clientDetails.lastNamePlaceholder')}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder={t('clientDetails.lastNamePlaceholder')}
                  leftIcon={<User size={20} color={Colors.textSecondary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.firstNamePlaceholder')}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder={t('clientDetails.firstNamePlaceholder')}
                  leftIcon={<User size={20} color={Colors.textSecondary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.phonePlaceholder')}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder={t('clientDetails.phonePlaceholder')}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={Colors.textSecondary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.emailOptionalPlaceholder')}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder={t('clientDetails.emailOptionalPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  optional
                  leftIcon={<Mail size={20} color={Colors.textTertiary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.notesTitle')}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder={t('clientDetails.notesPlaceholder')}
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
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
                  onPress={handleSave}
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

      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => !deleteLoading && setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        title={t('orders.deleteClient')}
        message={`Sigur ștergi „${clientData.name}"? Toate comenzile clientului vor fi șterse.`}
        confirmLabel={t('common.delete')}
        loading={deleteLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    ...CardStyles.cardElevated,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...Typography.bodyBold,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  contactInfo: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
  },
  notes: {
    ...StatusStyles.warning,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  notesTitle: {
    ...Typography.captionBold,
    fontWeight: '700',
    color: Colors.warningText,
    marginBottom: Spacing.sm,
  },
  notesText: {
    ...Typography.caption,
    color: Colors.warningText,
    lineHeight: 20,
  },
  notesInput: {
    ...Typography.caption,
    color: Colors.warningText,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  newOrderButton: {
    marginTop: 0,
  },
  ordersList: {
    gap: Spacing.md,
  },
  bottomSpacer: {
    height: Spacing.lg,
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
  emptyOrders: {
    ...Typography.caption,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  // Edit modal
  modalRoot: {
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayModal,
  },
  modalCentered: {
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
  editModalScroll: {
    maxHeight: 360,
    paddingHorizontal: Spacing.lg,
  },
  editModalInput: {
    marginBottom: Spacing.md,
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