import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Section } from '@/components/ui/Section';
import { Loader } from '@/components/ui/Loader';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Phone, Save, Search, X, ChevronDown, Mail } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/PaywallModal';
import { api, apiFetch, getErrorMessage, ApiError, ApiErrorCode } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { customerFullName } from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, BorderRadius, CompactLayoutStyles, Shadows } from '@/constants/design';

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
  const { t } = useI18n();
  const { draftOrder, updateCustomer, updateNotes } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription } = useSubscription();

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

  // Format phone number as user types: +40 7XX XXX XXX
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // If starts with 40, keep it; otherwise assume Romanian number
    let formatted = digits;
    if (digits.length > 0 && !digits.startsWith('40')) {
      formatted = '40' + digits;
    }
    
    // Format: +40 7XX XXX XXX
    if (formatted.length <= 2) {
      return formatted.length > 0 ? '+' + formatted : '';
    }
    if (formatted.length <= 5) {
      return '+' + formatted.slice(0, 2) + ' ' + formatted.slice(2);
    }
    if (formatted.length <= 8) {
      return '+' + formatted.slice(0, 2) + ' ' + formatted.slice(2, 5) + ' ' + formatted.slice(5);
    }
    // Max 10 digits after country code
    return '+' + formatted.slice(0, 2) + ' ' + formatted.slice(2, 5) + ' ' + formatted.slice(5, 8) + ' ' + formatted.slice(8, 11);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  // Extract digits only from formatted phone number
  const getPhoneDigits = (formatted: string): string => {
    return formatted.replace(/\D/g, '');
  };

  // Initialize form fields - check route params first, then draft order
  const getInitialFields = () => {
    if (params.clientId && params.clientName && params.clientPhone) {
      const { firstName, lastName } = parseName(params.clientName);
      return {
        firstName,
        lastName,
        phone: formatPhoneNumber(params.clientPhone),
        email: params.clientEmail || '',
      };
    }
    const nameParts = parseName(draftOrder.customer.name);
    return {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: draftOrder.customer.phone ? formatPhoneNumber(draftOrder.customer.phone) : '',
      email: draftOrder.customer.email || '',
    };
  };

  const initialFields = getInitialFields();
  const [firstName, setFirstName] = useState(initialFields.firstName);
  const [lastName, setLastName] = useState(initialFields.lastName);
  const [phone, setPhone] = useState(initialFields.phone);
  const [email, setEmail] = useState(initialFields.email);
  const [notes, setNotes] = useState(
    params.clientNotes ?? draftOrder.notes ?? ''
  );
  const [showNotes, setShowNotes] = useState(!!(params.clientNotes ?? draftOrder.notes));
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Sync context and local state when route params (client) change (e.g. same screen, different client)
  useEffect(() => {
    if (params.clientId && params.clientName && params.clientPhone) {
      updateCustomer({
        id: params.clientId,
        name: params.clientName,
        phone: params.clientPhone,
        email: params.clientEmail || undefined,
      });
      if (params.clientNotes) {
        updateNotes(params.clientNotes);
      }
      const { firstName: f, lastName: l } = parseName(params.clientName);
      setFirstName(f);
      setLastName(l);
      setPhone(formatPhoneNumber(params.clientPhone));
      setEmail(params.clientEmail || '');
      setNotes(params.clientNotes ?? '');
      setShowNotes(!!params.clientNotes);
    }
  }, [
    params.clientId,
    params.clientName,
    params.clientPhone,
    params.clientEmail,
    params.clientNotes,
    updateCustomer,
    updateNotes,
  ]);

  const loadInitialCustomers = useCallback(async () => {
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
  }, []);

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
    // Format phone number when selecting
    const formattedPhone = formatPhoneNumber(customer.phone);
    setPhone(formattedPhone);
    setEmail(customer.email || '');
    updateCustomer({
      id: customer.id,
      name: customerFullName(customer.firstName, customer.lastName),
      phone: customer.phone, // Keep original format for API
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
  }, [showCustomerSearch, loadInitialCustomers]);

  const saveClientData = async (): Promise<boolean> => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), t('newOrder.client.firstNameRequired'));
      return false;
    }
    const phoneDigits = getPhoneDigits(phone);
    if (!phoneDigits || phoneDigits.length < 10) {
      Alert.alert(t('common.error'), t('newOrder.client.phoneRequired'));
      return false;
    }

    setIsLoading(true);
    try {
      let customerId = draftOrder.customer.id;
      const phoneToSave = phoneDigits.startsWith('40') ? phoneDigits : '40' + phoneDigits;

      if (!customerId) {
        try {
          const searchResponse = await apiFetch<{ customers: Customer[] }>(
            `${api.customers()}?search=${encodeURIComponent(phoneToSave)}&limit=1`
          );
          const existing = searchResponse.customers?.find((c) => {
            const existingDigits = getPhoneDigits(c.phone);
            return existingDigits === phoneToSave;
          });
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
                phone: phoneToSave,
                email: email.trim() || undefined,
              }),
            });
            customerId = newCustomer.id;
          } catch (error: unknown) {
            const err = error instanceof ApiError ? error : (error as { code?: string; message?: string });
            console.log('Customer creation error:', { code: err.code, message: err.message });
            if (
              err.code === ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED ||
              (typeof err.message === 'string' &&
                (err.message.includes('Free plan allows only') || err.message.includes(ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED)))
            ) {
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
        phone: phoneToSave, // Save as digits only
        email: email.trim() || undefined,
      });

      if (notes.trim()) updateNotes(notes.trim());
      return true;
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error, t('newOrder.client.saveError')));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await saveClientData();
    if (ok) {
      Alert.alert(t('common.success'), t('newOrder.client.saveSuccess'), [
        { text: t('common.ok'), onPress: () => router.replace('/(tabs)/orders') },
      ]);
    }
  };

  const handleNext = async () => {
    const ok = await saveClientData();
    if (ok) {
      router.push('/new-order');
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    try {
      const result = await upgradeToPro(plan);
      if (result.success) {
        setShowPaywall(false);
      } else if (result.errorMessage) {
        Alert.alert(t('common.error'), result.errorMessage);
      }
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error, t('newOrder.client.checkoutError')));
    } finally {
      setIsUpgrading(false);
    }
  };

  const phoneDigits = getPhoneDigits(phone);
  const isValid = firstName.trim() && lastName.trim() && phoneDigits && phoneDigits.length >= 10;
  const insets = useSafeAreaInsets();
  // bottomOffset so KeyboardAwareScrollView keeps focused input above footer + keyboard (no padding hacks).
  const footerBottomOffset = FOOTER_CONTENT_HEIGHT + insets.bottom;

  return (
    <>
    <ScreenContainer noPadding>
      <Header
        title={t('newOrder.client.clientData')}
        onBack={() => router.replace('/(tabs)/orders')}
        backAccessibilityLabel={t('common.back')}
        rightActions={
          <Button
            variant="primaryIcon"
            onPress={handleSave}
            disabled={!isValid || isLoading}
            loading={isLoading}
            accessibilityLabel={t('common.save')}
          >
            <Save size={20} color={Colors.textInverse} />
          </Button>
        }
      />

      <View style={styles.contentWrapper}>
        <KeyboardAwareScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottomOffset }]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={footerBottomOffset}
        >
          <Section title={t('newOrder.client.existingCustomer')} style={StyleSheet.flatten([styles.searchSection, CompactLayoutStyles.compactSection])}>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => setShowCustomerSearch(true)}
              leftIcon={<Search size={18} color={Colors.primary} />}
              style={styles.searchButton}
            >
              {t('newOrder.client.searchExistingCustomer')}
            </Button>
          </Section>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('newOrder.client.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Section title={t('newOrder.client.newClientDataSection')} style={StyleSheet.flatten([styles.form, CompactLayoutStyles.compactSection])}>
            <Input
              label={t('newOrder.client.lastNameLabel')}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('newOrder.client.lastNamePlaceholder')}
              leftIcon={<User size={20} color={Colors.textSecondary} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.firstNameLabel')}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('newOrder.client.firstNamePlaceholder')}
              leftIcon={<User size={20} color={Colors.textSecondary} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.phoneLabel')}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={t('newOrder.client.phonePlaceholder')}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={Colors.textSecondary} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.emailOptionalLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('newOrder.client.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              optional
              leftIcon={<Mail size={20} color={Colors.textTertiary} />}
              containerStyle={styles.inputGroup}
            />

            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.notesHeader}
                onPress={() => setShowNotes(!showNotes)}
                activeOpacity={0.7}
              >
                <Text style={styles.notesLabelOptional}>{t('newOrder.client.notesOptionalLabel')}</Text>
                <ChevronDown
                  size={18}
                  color={Colors.textTertiary}
                  style={[styles.chevron, showNotes && styles.chevronRotated]}
                />
              </TouchableOpacity>
              {showNotes && (
                <Input
                  label=""
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('newOrder.client.notesPlaceholder')}
                  multiline
                  numberOfLines={3}
                  optional
                  containerStyle={styles.inputGroup}
                />
              )}
            </View>
          </Section>
        </KeyboardAwareScrollView>

        <AppFloatingFooter
          primaryLabel={t('newOrder.next')}
          onPrimaryPress={handleNext}
          primaryDisabled={!isValid || isLoading}
          primaryLoading={isLoading}
          secondaryLabel={t('newOrder.back')}
          onSecondaryPress={() => router.replace('/(tabs)/orders')}
        />
      </View>
    </ScreenContainer>

      {/* Customer Search Modal */}
      <Modal
        visible={showCustomerSearch}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCustomerSearch(false)}
      >
        <KeyboardAvoidingView style={styles.modalKeyboardAvoid} behavior="padding">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('newOrder.client.searchModalTitle')}</Text>
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
            <Input
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchCustomers(text);
              }}
              placeholder={t('newOrder.client.searchPlaceholder')}
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
                  <Text style={styles.emptyText}>{t('newOrder.client.emptySearchResults')}</Text>
                </View>
              ) : !isSearching && !isLoadingInitial && !searchQuery.trim() && initialCustomers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('newOrder.client.noClients')}</Text>
                </View>
              ) : null
            }
          />
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  searchButtonText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  form: {
    paddingHorizontal: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  notesLabelOptional: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textTertiary,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  modalKeyboardAvoid: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, 
    paddingTop: Platform.OS === 'ios' ? 64 : 0,
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
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  customerItem: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
