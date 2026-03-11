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
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Phone, Mail, Calendar, Trash2, Save, X, User, Camera, ImageIcon, ZoomIn } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { OrderHistoryItem } from '@/components/OrderHistoryItem';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { Section } from '@/components/ui/Section';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { api, apiFetch, getLocalizedApiMessage, uploadImage, API_BASE_URL } from '@/lib/api';
import { orderStatusToLabel, orderItemsFromMeasurements, formatDate, customerFullName } from '@/lib/api';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { useI18n } from '@/lib/i18n';
import { Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius, CardStyles, StatusStyles, CompactLayoutStyles } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';

type Gender = 'male' | 'female' | null;

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
  gender: Gender;
  referenceImage: string | null;
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
  rawOrderDate?: string;
  deliveryDate?: string | null;
};

export default function ClientDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();

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
  const [editGender, setEditGender] = useState<Gender>(null);
  const [editReferenceImage, setEditReferenceImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  
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
          gender: Gender;
          referenceImage: string | null;
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
          deliveryDate?: string | null;
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
        gender: customer.gender === 'male' || customer.gender === 'female' ? customer.gender : null,
        referenceImage: customer.referenceImage,
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
          rawOrderDate: o.orderDate,
          deliveryDate: o.deliveryDate ?? null,
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
    setEditGender(clientData.gender === 'male' || clientData.gender === 'female' ? clientData.gender : null);
    setEditReferenceImage(clientData.referenceImage);
    setEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    if (saveLoading || imageUploading) return;
    setEditModalVisible(false);
    setEditFirstName('');
    setEditLastName('');
    setEditPhone('');
    setEditEmail('');
    setEditNotes('');
    setEditGender(null);
    setEditReferenceImage(null);
  };

  const handlePickReferenceImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('clients.edit.photoPermissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUploading(true);
      try {
        const imageUrl = await uploadImage(result.assets[0].uri);
        setEditReferenceImage(imageUrl);
      } catch (e) {
        Alert.alert(t('common.error'), t('clients.edit.imageUploadError'));
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleRemoveReferenceImage = () => {
    setEditReferenceImage(null);
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
        gender?: Gender;
        referenceImage?: string | null;
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

      // Include gender and reference image
      requestBody.gender = editGender;
      requestBody.referenceImage = editReferenceImage;

      const updated = await apiFetch<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string;
        notes: string | null;
        gender: Gender;
        referenceImage: string | null;
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
        gender: updated.gender,
        referenceImage: updated.referenceImage,
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
      setEditGender(null);
      setEditReferenceImage(null);
      Alert.alert(t('common.success'), t('clientDetails.saveSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), getLocalizedApiMessage(e, t, t('clientDetails.saveError')));
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
        <ListSkeletonLoader variant="card" count={4} />
      </ScreenContainer>
    );
  }

  if (!clientData) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.loadingContainer}>
          <ErrorText variant="dark">{t('clientDetails.clientNotFound')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client details card (tappable to edit, like order-details payment card) */}
        <TouchableOpacity
          style={[styles.section, { backgroundColor: colors.surface }]}
          onPress={handleEdit}
          activeOpacity={0.9}
        >
          <View style={styles.clientHeaderRow}>
            <View style={styles.clientHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.textInverse }]}>
                  {clientData.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: colors.textPrimary }]}>{clientData.name}</Text>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <Button variant="dangerIcon" onPress={handleDeleteRequest} accessibilityLabel={t('common.delete')}>
                <Trash2 size={18} color={colors.error} strokeWidth={2.5} />
              </Button>
            </View>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Phone size={16} color={colors.textSecondary} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>{clientData.phone}</Text>
            </View>
            {clientData.email ? (
              <View style={styles.contactRow}>
                <Mail size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.textSecondary }]}>{clientData.email}</Text>
              </View>
            ) : null}
            <View style={styles.contactRow}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>{t('clientDetails.clientSince')}: {clientData.registrationDate}</Text>
            </View>
          </View>

          {clientData.notes ? (
            <View style={[styles.notes, { backgroundColor: colors.warningBg, borderLeftColor: colors.primary }]}>
              <Text style={[styles.notesTitle, { color: colors.warningText }]}>{t('clientDetails.notesTitle')}</Text>
              <Text style={[styles.notesText, { color: colors.warningText }]}>{clientData.notes}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <Section
          title={t('orders.tabs.orderHistory')}
          style={CompactLayoutStyles.compactSection}
          headerRight={
            <Button variant="primary" size="sm" onPress={handleNewOrder} leftIcon={<Plus size={16} color={colors.textInverse} />} style={styles.newOrderButton}>
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
            ListEmptyComponent={<Text style={[styles.emptyOrders, { color: colors.textSecondary }]}>{t('orders.emptyOrders')}</Text>}
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
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlayModal }]} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCentered} pointerEvents="box-none">
            <View style={[styles.editModalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>{t('clientDetails.editTitle')}</Text>
                <TouchableOpacity
                  style={styles.editModalCloseBtn}
                  onPress={handleCloseEditModal}
                  disabled={saveLoading}
                  activeOpacity={0.7}
                >
                  <X size={22} color={colors.textSecondary} strokeWidth={2.5} />
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
                  leftIcon={<User size={20} color={colors.textSecondary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.firstNamePlaceholder')}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder={t('clientDetails.firstNamePlaceholder')}
                  leftIcon={<User size={20} color={colors.textSecondary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.phonePlaceholder')}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder={t('clientDetails.phonePlaceholder')}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={colors.textSecondary} />}
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
                  leftIcon={<Mail size={20} color={colors.textTertiary} />}
                  containerStyle={styles.editModalInput}
                />
                <Input
                  label={t('clientDetails.notesTitle')}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder={t('clientDetails.notesPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  containerStyle={styles.editModalInput}
                />

                {/* Gender Selection */}
                <View style={styles.editModalInput}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('clients.edit.genderLabel')}</Text>
                  <View style={styles.genderSelector}>
                    {(['male', 'female'] as const).map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderOption,
                          { borderColor: colors.border, backgroundColor: colors.surface },
                          editGender === gender && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                        ]}
                        onPress={() => setEditGender(gender)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.genderOptionText,
                            { color: colors.textSecondary },
                            editGender === gender && { color: colors.primary },
                          ]}
                        >
                          {t(`clients.edit.gender.${gender}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Reference Image */}
                <View style={styles.editModalInput}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('clients.edit.referenceImageLabel')}</Text>
                  <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>{t('clients.edit.referenceImageHint')}</Text>
                  {editReferenceImage ? (
                    <View style={[styles.referenceImageContainer, { backgroundColor: colors.background }]}>
                      <TouchableOpacity
                        onPress={() => setImageViewerVisible(true)}
                        activeOpacity={0.9}
                        style={styles.referenceImageTouchable}
                      >
                        <Image
                          source={{
                            uri: editReferenceImage.startsWith('http')
                              ? editReferenceImage
                              : `${API_BASE_URL}${editReferenceImage}`,
                          }}
                          style={styles.referenceImage}
                          resizeMode="cover"
                        />
                        <View style={styles.zoomOverlay}>
                          <ZoomIn size={18} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.referenceImageActions}>
                        <TouchableOpacity
                          style={styles.changeImageBtn}
                          onPress={handlePickReferenceImage}
                          disabled={imageUploading}
                        >
                          <Camera size={16} color={colors.primary} />
                          <Text style={[styles.changeImageText, { color: colors.primary }]}>{t('clients.edit.changeImage')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={handleRemoveReferenceImage}
                          disabled={imageUploading}
                        >
                          <X size={16} color={colors.error} />
                          <Text style={[styles.removeImageText, { color: colors.error }]}>{t('clients.edit.removeImage')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.imagePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={handlePickReferenceImage}
                      disabled={imageUploading}
                      activeOpacity={0.7}
                    >
                      {imageUploading ? (
                        <Text style={[styles.imagePickerText, { color: colors.textTertiary }]}>{t('clients.edit.uploading')}</Text>
                      ) : (
                        <>
                          <ImageIcon size={32} color={colors.textTertiary} />
                          <Text style={[styles.imagePickerText, { color: colors.textTertiary }]}>{t('clients.edit.addReferenceImage')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </KeyboardAwareScrollView>
              <View style={[styles.editModalActions, { borderTopColor: colors.border }]}>
                <Button
                  variant="secondary"
                  onPress={handleCloseEditModal}
                  disabled={saveLoading || imageUploading}
                  style={styles.editModalCancelBtn}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSave}
                  disabled={saveLoading || imageUploading}
                  loading={saveLoading}
                  leftIcon={saveLoading ? undefined : <Save size={18} color={colors.textInverse} strokeWidth={2.5} />}
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

      <ZoomableImageViewer
        visible={imageViewerVisible}
        images={editReferenceImage ? [{
          uri: editReferenceImage.startsWith('http')
            ? editReferenceImage
            : `${API_BASE_URL}${editReferenceImage}`,
          title: t('clients.edit.referenceImageLabel'),
        }] : []}
        initialIndex={0}
        onClose={() => setImageViewerVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  clientHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...Typography.bodyBold,
    fontSize: 22,
    fontWeight: '700',
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
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  notesTitle: {
    ...Typography.captionBold,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  notesText: {
    ...Typography.caption,
    lineHeight: 20,
  },
  notesInput: {
    ...Typography.caption,
    borderWidth: 1,
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
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
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
  },
  editModalCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalScroll: {
    maxHeight: 450,
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
  },
  editModalCancelBtn: {
    flex: 1,
  },
  editModalSaveBtn: {
    flex: 1,
  },
  fieldLabel: {
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    ...Typography.small,
    marginBottom: Spacing.sm,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderOptionSelected: {
  },
  genderOptionText: {
    ...Typography.caption,
  },
  genderOptionTextSelected: {
    fontWeight: '600',
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imagePickerText: {
    ...Typography.caption,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  referenceImageContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  referenceImageTouchable: {
    position: 'relative',
  },
  referenceImage: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.lg,
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  referenceImageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  changeImageText: {
    ...Typography.small,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  removeImageText: {
    ...Typography.small,
  },
});