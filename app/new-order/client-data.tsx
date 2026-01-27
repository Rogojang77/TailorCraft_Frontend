import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
// @ts-ignore - Package will be available after npm install
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, User, Phone, Calendar, Save, Search, X } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { OrderStepNav } from '@/components/OrderStepNav';
import { PaywallModal } from '@/components/PaywallModal';
import { api, apiFetch, getErrorMessage } from '@/lib/api';
import { customerFullName } from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}

export default function ClientDataScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientNotes?: string;
  }>();
  const { draftOrder, updateCustomer, updateDueDate, updateNotes } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription } = useSubscription();
  
  // Initialize date with today if not set
  const getInitialDate = (): Date => {
    if (draftOrder.dueDate) {
      try {
        return new Date(draftOrder.dueDate);
      } catch {
        return new Date();
      }
    }
    return new Date();
  };

  // Helper to parse name into first and last name
  const parseName = (fullName: string): { firstName: string; lastName: string } => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  };

  // Initialize form fields - check route params first, then draft order
  const getInitialFields = () => {
    if (params.clientId && params.clientName && params.clientPhone) {
      const { firstName, lastName } = parseName(params.clientName);
      return {
        firstName,
        lastName,
        phone: params.clientPhone,
        email: params.clientEmail || '',
      };
    }
    const nameParts = parseName(draftOrder.customer.name);
    return {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: draftOrder.customer.phone || '',
      email: draftOrder.customer.email || '',
    };
  };

  const initialFields = getInitialFields();
  const [firstName, setFirstName] = useState(initialFields.firstName);
  const [lastName, setLastName] = useState(initialFields.lastName);
  const [phone, setPhone] = useState(initialFields.phone);
  const [email, setEmail] = useState(initialFields.email);
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState(
    params.clientNotes ?? draftOrder.notes ?? ''
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Initialize customer data from route params if provided (only once on mount)
  useEffect(() => {
    if (params.clientId && params.clientName && params.clientPhone) {
      // Update context to ensure it's synced with route params
      updateCustomer({
        id: params.clientId,
        name: params.clientName,
        phone: params.clientPhone,
        email: params.clientEmail || undefined,
      });
      if (params.clientNotes) {
        updateNotes(params.clientNotes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Initialize dueDate in context if not set
  useEffect(() => {
    if (!draftOrder.dueDate) {
      const today = new Date();
      updateDueDate(today.toISOString());
    }
  }, []);

  const formatDateForDisplay = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      updateDueDate(date.toISOString());
    }
  };

  const loadInitialCustomers = async () => {
    setIsLoadingInitial(true);
    try {
      const response = await apiFetch<{ customers: Customer[] }>(
        `${api.customers()}?limit=20`
      );
      setInitialCustomers(response.customers || []);
    } catch (error) {
      console.error('Load initial customers error:', error);
      setInitialCustomers([]);
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await apiFetch<{ customers: Customer[] }>(
        `${api.customers()}?search=${encodeURIComponent(query)}&limit=10`
    );
      setSearchResults(response.customers || []);
    } catch (error) {
      console.error('Search customers error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    updateCustomer({
      id: customer.id,
      name: customerFullName(customer.firstName, customer.lastName),
      phone: customer.phone,
      email: customer.email || undefined,
    });
    setShowCustomerSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Load initial customers when modal opens
  useEffect(() => {
    if (showCustomerSearch) {
      loadInitialCustomers();
    }
  }, [showCustomerSearch]);

  const saveClientData = async (): Promise<boolean> => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Eroare', 'Numele și prenumele sunt obligatorii');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Eroare', 'Numărul de telefon este obligatoriu');
      return false;
    }

    setIsLoading(true);
    try {
      let customerId = draftOrder.customer.id;

      if (!customerId) {
        try {
          const searchResponse = await apiFetch<{ customers: Customer[] }>(
            `${api.customers()}?search=${encodeURIComponent(phone)}&limit=1`
          );
          const existing = searchResponse.customers?.find((c) => c.phone === phone);
          if (existing) customerId = existing.id;
        } catch (error) {
          console.error('Search error:', error);
        }

        if (!customerId) {
          try {
            const newCustomer = await apiFetch<Customer>(api.customers(), {
              method: 'POST',
              body: JSON.stringify({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
              }),
            });
            customerId = newCustomer.id;
          } catch (error: any) {
            // Check if it's a subscription limit error
            console.log('Customer creation error:', { code: error.code, message: error.message });
            if (error.code === 'SUBSCRIPTION_LIMIT_REACHED' ||
                error.message?.includes('Free plan allows only') || 
                error.message?.includes('SUBSCRIPTION_LIMIT_REACHED')) {
              console.log('Subscription limit reached - showing paywall');
              setShowPaywall(true);
              setIsLoading(false);
              return false;
            }
            throw error;
          }
        }
      }

      updateCustomer({
        id: customerId,
        name: customerFullName(firstName.trim(), lastName.trim()),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });

      if (notes.trim()) updateNotes(notes.trim());
      return true;
    } catch (error) {
      Alert.alert('Eroare', getErrorMessage(error, 'Nu s-a putut salva datele clientului'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await saveClientData();
    if (ok) {
      Alert.alert('Succes', 'Datele clientului au fost salvate', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleNext = async () => {
    const ok = await saveClientData();
    if (ok) router.push('/new-order/jacket');
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const success = await upgradeToPro();
      if (success) {
        await refreshSubscription();
        setShowPaywall(false);
        Alert.alert('Succes', 'Cont upgradeat la Pro! Acum puteți crea clienți nelimitați.');
      } else {
        Alert.alert('Eroare', 'Nu s-a putut face upgrade-ul. Vă rugăm încercați din nou.');
      }
    } catch (error) {
      Alert.alert('Eroare', getErrorMessage(error, 'Nu s-a putut face upgrade-ul'));
    } finally {
      setIsUpgrading(false);
    }
  };

  const isValid = firstName.trim() && lastName.trim() && phone.trim();

  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.title}>Date Client</Text>
        <TouchableOpacity 
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!isValid || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Save size={20} color={Colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Existing Customer */}
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowCustomerSearch(true)}
            activeOpacity={0.7}
          >
            <Search size={18} color={Colors.primary} />
            <Text style={styles.searchButtonText}>Caută client existent</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nume *</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Introduceți numele"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prenume *</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Introduceți prenumele"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon *</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+40 7XX XXX XXX"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (opțional)</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="client@email.com"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data Preluare Comandă</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <Text style={styles.dateText}>{formatDateForDisplay(selectedDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <>
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    style={styles.datePicker}
                  />
                </View>
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerActions}>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.datePickerButtonText}>Confirmă</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observații</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Adăugați observații speciale..."
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>

      <OrderStepNav
        showPrev
        showNext
        onPrev={() => router.back()}
        onNext={handleNext}
        nextDisabled={!isValid}
        nextLoading={isLoading}
        prevLabel="Înapoi"
        nextLabel="Înainte"
      />

      {/* Customer Search Modal */}
      <Modal
        visible={showCustomerSearch}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCustomerSearch(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Caută Client</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowCustomerSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setInitialCustomers([]);
              }}
            >
              <X size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchCustomers(text);
              }}
              placeholder="Caută după nume, telefon sau email..."
              placeholderTextColor={Colors.textTertiary}
              autoFocus
            />
          </View>

          {(isSearching || isLoadingInitial) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}

          <FlatList
            data={searchQuery.trim() ? searchResults : initialCustomers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerItem}
                onPress={() => selectCustomer(item)}
                activeOpacity={0.7}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {customerFullName(item.firstName, item.lastName)}
                  </Text>
                  <Text style={styles.customerPhone}>{item.phone}</Text>
                  {item.email && <Text style={styles.customerEmail}>{item.email}</Text>}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !isSearching && !isLoadingInitial && searchQuery.trim() ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nu s-au găsit clienți</Text>
                </View>
              ) : !isSearching && !isLoadingInitial && !searchQuery.trim() && initialCustomers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nu există clienți</Text>
                </View>
              ) : null
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />
    </>
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
  saveButton: {
    ...ButtonStyles.primaryIcon,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.sm,
  },
  searchButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  form: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    ...Typography.body,
  },
  dateText: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  datePickerContainer: {
    marginTop: Spacing.sm,
  },
  datePicker: {
    margin: 'auto',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  datePickerButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  datePickerButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h2,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    ...Typography.body,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  customerItem: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  customerInfo: {
    gap: Spacing.xs,
  },
  customerName: {
    ...Typography.bodyBold,
  },
  customerPhone: {
    ...Typography.caption,
  },
  customerEmail: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
