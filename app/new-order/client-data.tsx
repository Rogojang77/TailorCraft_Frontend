import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
} from 'react-native';
import { KeyboardAwareScrollView, KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import { useCustomBack } from '@/contexts/PageTitleContext';
import { Section } from '@/components/ui/Section';
import { Loader } from '@/components/ui/Loader';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Phone, Save, Search, X, ChevronDown, Mail, Camera, ImageIcon, ZoomIn, Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/subscription';
import { api, apiFetch, getErrorMessage, ApiError, ApiErrorCode, uploadImage, API_BASE_URL } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { customerFullName } from '@/lib/api';
import { Spacing, Typography, ButtonStyles, HeaderStyles, BorderRadius, CompactLayoutStyles, Shadows } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';

const DEFAULT_DELIVERY_WEEKS = 3;
type Gender = 'male' | 'female' | 'neutral' | null;

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  referenceImage?: string | null;
}

export default function ClientDataScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientNotes?: string;
  }>();
  const { t, locale } = useI18n();
  const { draftOrder, updateCustomer, updateNotes, updateDeliveryDate } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription } = useSubscription();
  const { defaultPhonePrefix } = useSettings();

  // Helper to parse name into first and last name (safe for undefined/null)
  const parseName = (fullName: string | undefined | null): { firstName: string; lastName: string } => {
    const s = fullName != null ? String(fullName).trim() : '';
    const parts = s ? s.split(/\s+/) : [];
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

  // When opening from client-details ("New order"), URL params (clientId, clientName, clientPhone, clientEmail, clientNotes) are applied so the form is pre-filled.
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
    const customer = draftOrder.customer;
    const nameParts = parseName(customer?.name);
    return {
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      phone: customer?.phone ? formatPhoneNumber(customer.phone) : (defaultPhonePrefix || ''),
      email: customer?.email || '',
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
  const [gender, setGender] = useState<Gender>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const syncToDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Snapshot of client data when we loaded/selected an existing customer; used to detect edits and prompt save-to-client vs only-for-order */
  const originalCustomerRef = useRef<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    gender: Gender;
    referenceImage: string | null;
  } | null>(null);

  // Sync form fields (name, phone, email, notes) into the draft as the user types, so the draft persists client details even before they tap Next
  useEffect(() => {
    if (syncToDraftTimeoutRef.current) clearTimeout(syncToDraftTimeoutRef.current);
    syncToDraftTimeoutRef.current = setTimeout(() => {
      syncToDraftTimeoutRef.current = null;
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      const rawPhone = getPhoneDigits(phone);
      const phoneToStore = rawPhone.length >= 10 ? (rawPhone.startsWith('40') ? rawPhone : '40' + rawPhone) : phone || '';
      updateCustomer({
        name: fullName || undefined,
        phone: phoneToStore || undefined,
        email: email.trim() || undefined,
      });
      updateNotes(notes.trim() || undefined);
    }, 400);

    return () => {
      if (syncToDraftTimeoutRef.current) {
        clearTimeout(syncToDraftTimeoutRef.current);
        syncToDraftTimeoutRef.current = null;
      }
    };
  }, [firstName, lastName, phone, email, notes, updateCustomer, updateNotes]);

  // When draft is restored with customer info after mount (e.g. we were redirected to client-data before loadDraft resolved), sync draft -> form so the user sees saved client details
  const hasParamsOverride = !!(params.clientId && params.clientName && params.clientPhone);
  useEffect(() => {
    if (hasParamsOverride) return;
    const customer = draftOrder.customer;
    const hasDraftCustomer = (customer?.name?.trim() ?? '') !== '' || (customer?.phone?.trim() ?? '') !== '';
    const formLooksEmpty = !firstName.trim() && !lastName.trim() && getPhoneDigits(phone).length < 10 && !email.trim();
    if (!hasDraftCustomer || !formLooksEmpty) return;

    const nameParts = parseName(customer?.name);
    setFirstName(nameParts.firstName);
    setLastName(nameParts.lastName);
    setPhone(customer?.phone ? formatPhoneNumber(customer.phone) : (defaultPhonePrefix || ''));
    setEmail(customer?.email ?? '');
    if ((draftOrder.notes ?? '').trim()) {
      setNotes(draftOrder.notes ?? '');
      setShowNotes(true);
    }
  }, [draftOrder.customer?.name, draftOrder.customer?.phone, draftOrder.customer?.email, draftOrder.notes]);

  // When draft has an existing customer id (e.g. restored draft), fetch full customer to prefill gender and reference image
  useEffect(() => {
    const customerId = draftOrder.customer.id;
    if (!customerId || hasParamsOverride) return;
    let cancelled = false;
    (async () => {
      try {
        const customer = await apiFetch<Customer>(api.customers(customerId));
        if (!cancelled && customer) {
          if (customer.gender === 'male' || customer.gender === 'female' || customer.gender === 'neutral') setGender(customer.gender);
          if (customer.referenceImage != null) setReferenceImage(customer.referenceImage);
          originalCustomerRef.current = {
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: getPhoneDigits(customer.phone),
            email: customer.email ?? '',
            gender: (customer.gender as Gender) ?? null,
            referenceImage: customer.referenceImage ?? null,
          };
        }
      } catch {
        // ignore; customer may not have gender/referenceImage
      }
    })();
    return () => { cancelled = true; };
  }, [draftOrder.customer.id, hasParamsOverride]);

  // When draft was cleared (e.g. user tapped "Delete draft"), reset form so client details are not left on screen
  useEffect(() => {
    if (hasParamsOverride) return;
    const c = draftOrder.customer;
    const draftCustomerEmpty = !c?.id && !(c?.name?.trim()) && !(c?.phone?.trim());
    if (!draftCustomerEmpty) return;
    originalCustomerRef.current = null;
    setFirstName('');
    setLastName('');
    setPhone(defaultPhonePrefix || '');
    setEmail('');
    setNotes('');
    setShowNotes(false);
  }, [draftOrder.customer?.id, draftOrder.customer?.name, draftOrder.customer?.phone, hasParamsOverride, defaultPhonePrefix]);

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
    setGender(customer.gender === 'male' || customer.gender === 'female' ? customer.gender : null);
    setReferenceImage(customer.referenceImage ?? null);
    originalCustomerRef.current = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: getPhoneDigits(customer.phone),
      email: customer.email ?? '',
      gender: (customer.gender as Gender) ?? null,
      referenceImage: customer.referenceImage ?? null,
    };
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
        setReferenceImage(imageUrl);
      } catch (e) {
        Alert.alert(t('common.error'), t('clients.edit.imageUploadError'));
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleRemoveReferenceImage = () => {
    setReferenceImage(null);
  };

  // Load initial customers when modal opens
  useEffect(() => {
    if (showCustomerSearch) {
      loadInitialCustomers();
    }
  }, [showCustomerSearch, loadInitialCustomers]);

  // Set default delivery date on mount if not already set
  useEffect(() => {
    if (!draftOrder.deliveryDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + DEFAULT_DELIVERY_WEEKS * 7);
      updateDeliveryDate(defaultDate.toISOString());
    }
  }, []);

  const deliveryDate = draftOrder.deliveryDate ? new Date(draftOrder.deliveryDate) : new Date();
  const minDeliveryDate = new Date();
  minDeliveryDate.setDate(minDeliveryDate.getDate() + 1);

  const formatDeliveryDate = (date: Date): string => {
    return date.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDeliveryDateChange = (event: { type: string }, selectedDate?: Date) => {
    if (Platform.OS === 'ios') setShowDeliveryDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      updateDeliveryDate(selectedDate.toISOString());
    }
  };

  const openDeliveryDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: deliveryDate,
        mode: 'date',
        minimumDate: minDeliveryDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) updateDeliveryDate(date.toISOString());
        },
      });
    } else {
      setShowDeliveryDatePicker(true);
    }
  };

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
            const newCustomer = await apiFetch<Customer & { gender?: Gender; referenceImage?: string | null }>(api.customers(), {
              method: 'POST',
              body: JSON.stringify({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phone: phoneToSave,
                email: email.trim() || undefined,
                gender: gender || undefined,
                referenceImage: referenceImage || undefined,
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

  const hasClientDataChanged = (): boolean => {
    const orig = originalCustomerRef.current;
    if (!orig) return false;
    const p = getPhoneDigits(phone);
    return (
      firstName.trim() !== orig.firstName.trim() ||
      lastName.trim() !== orig.lastName.trim() ||
      p !== orig.phone ||
      (email ?? '').trim() !== orig.email.trim() ||
      gender !== orig.gender ||
      (referenceImage ?? null) !== orig.referenceImage
    );
  };

  const applyDraftAndNavigate = () => {
    const phoneDigits = getPhoneDigits(phone);
    const phoneToSave = phoneDigits.startsWith('40') ? phoneDigits : '40' + phoneDigits;
    updateCustomer({
      id: draftOrder.customer.id,
      name: customerFullName(firstName.trim(), lastName.trim()),
      phone: phoneToSave,
      email: email.trim() || undefined,
    });
    if (notes.trim()) updateNotes(notes.trim());
    router.push('/new-order');
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
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), t('newOrder.client.firstNameRequired'));
      return;
    }
    const phoneDigits = getPhoneDigits(phone);
    if (!phoneDigits || phoneDigits.length < 10) {
      Alert.alert(t('common.error'), t('newOrder.client.phoneRequired'));
      return;
    }

    const existingCustomerId = draftOrder.customer.id;
    const hasChanges = existingCustomerId && hasClientDataChanged();

    if (hasChanges) {
      Alert.alert(
        t('newOrder.client.saveChangesToClientTitle'),
        t('newOrder.client.saveChangesToClientMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('newOrder.client.onlyForThisOrder'),
            onPress: async () => {
              const ok = await saveClientData();
              if (ok) router.push('/new-order');
            },
          },
          {
            text: t('newOrder.client.saveToClient'),
            onPress: async () => {
              setIsLoading(true);
              try {
                const phoneToSave = phoneDigits.startsWith('40') ? phoneDigits : '40' + phoneDigits;
                await apiFetch(api.customers(existingCustomerId), {
                  method: 'PUT',
                  body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phoneToSave,
                    email: email.trim() || null,
                    notes: notes.trim() || null,
                    gender: gender || null,
                    referenceImage: referenceImage || null,
                  }),
                });
                applyDraftAndNavigate();
              } catch (e) {
                Alert.alert(t('common.error'), getErrorMessage(e, t('newOrder.client.saveError')));
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
      return;
    }

    const ok = await saveClientData();
    if (ok) router.push('/new-order');
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

  useCustomBack(() => router.replace('/(tabs)/orders'), t('common.back'));

  return (
    <>
    <ScreenContainer noPadding>
      <View style={styles.contentWrapper}>
        <KeyboardAwareScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottomOffset }]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={footerBottomOffset}
        >
          <Section title={t('newOrder.client.existingCustomer')} style={StyleSheet.flatten([styles.searchSection, CompactLayoutStyles.compactSection, { backgroundColor: colors.surface }])}>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => setShowCustomerSearch(true)}
              leftIcon={<Search size={18} color={colors.primary} />}
              style={StyleSheet.flatten([styles.searchButton, { backgroundColor: colors.background, borderColor: colors.primary }])}
            >
              {t('newOrder.client.searchExistingCustomer')}
            </Button>
          </Section>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{t('newOrder.client.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Section title={t('newOrder.client.newClientDataSection')} style={StyleSheet.flatten([styles.form, CompactLayoutStyles.compactSection])}>
            <Input
              label={t('newOrder.client.lastNameLabel')}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('newOrder.client.lastNamePlaceholder')}
              leftIcon={<User size={20} color={colors.textSecondary} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.firstNameLabel')}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('newOrder.client.firstNamePlaceholder')}
              leftIcon={<User size={20} color={colors.textSecondary} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.phoneLabel')}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={t('newOrder.client.phonePlaceholder')}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={colors.textSecondary} />}
              containerStyle={styles.inputGroup}
            />

            {/* Delivery date (termen de predare) - under phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('createOrder.deliveryDateLabel')}</Text>
              <TouchableOpacity
                style={[styles.deliveryDateSelector, { backgroundColor: colors.borderLight }]}
                onPress={openDeliveryDatePicker}
                activeOpacity={0.7}
              >
                <View style={styles.deliveryDateSelectorContent}>
                  <Calendar size={20} color={colors.textSecondary} />
                  <Text style={[styles.deliveryDateValue, { color: colors.textPrimary }]}>
                    {formatDeliveryDate(deliveryDate)}
                  </Text>
                </View>
              </TouchableOpacity>
              {Platform.OS === 'ios' && showDeliveryDatePicker && (
                <View style={styles.deliveryDatePickerInline}>
                  <View style={styles.deliveryDatePickerDoneRow}>
                    <TouchableOpacity onPress={() => setShowDeliveryDatePicker(false)} activeOpacity={0.7}>
                      <Text style={[styles.deliveryDatePickerDoneText, { color: colors.primary }]}>{t('common.done')}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={deliveryDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDeliveryDateChange}
                    minimumDate={minDeliveryDate}
                    textColor={colors.textPrimary}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                </View>
              )}
            </View>

            <Input
              label={t('newOrder.client.emailOptionalLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('newOrder.client.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              optional
              leftIcon={<Mail size={20} color={colors.textTertiary} />}
              containerStyle={styles.inputGroup}
            />

            {/* Gender Selection - same as Add Client */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('clients.edit.genderLabel')}</Text>
              <View style={styles.genderSelector}>
                {(['male', 'female'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderOption,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      gender === g && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        { color: colors.textSecondary },
                        gender === g && { color: colors.primary },
                      ]}
                    >
                      {t(`clients.edit.gender.${g}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reference Image - same as Add Client */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('clients.edit.referenceImageLabel')}</Text>
              <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>{t('clients.edit.referenceImageHint')}</Text>
              {referenceImage ? (
                <View style={[styles.referenceImageContainer, { backgroundColor: colors.background }]}>
                  <TouchableOpacity
                    onPress={() => setImageViewerVisible(true)}
                    activeOpacity={0.9}
                    style={styles.referenceImageTouchable}
                  >
                    <Image
                      source={{
                        uri: referenceImage.startsWith('http')
                          ? referenceImage
                          : `${API_BASE_URL}${referenceImage}`,
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

            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.notesHeader}
                onPress={() => setShowNotes(!showNotes)}
                activeOpacity={0.7}
              >
                <Text style={[styles.notesLabelOptional, { color: colors.textTertiary }]}>{t('newOrder.client.notesOptionalLabel')}</Text>
                <ChevronDown
                  size={18}
                  color={colors.textTertiary}
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
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('newOrder.client.searchModalTitle')}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowCustomerSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setInitialCustomers([]);
              }}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchInputContainer, { borderBottomColor: colors.border }]}>
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
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          <FlatList
            data={searchQuery.trim() ? searchResults : initialCustomers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.customerItem, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
                onPress={() => selectCustomer(item)}
                activeOpacity={0.7}
              >
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: colors.textPrimary }]}>
                    {customerFullName(item.firstName, item.lastName)}
                  </Text>
                  <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
                  {item.email && <Text style={[styles.customerEmail, { color: colors.textTertiary }]}>{item.email}</Text>}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !isSearching && !isLoadingInitial && searchQuery.trim() ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('newOrder.client.emptySearchResults')}</Text>
                </View>
              ) : !isSearching && !isLoadingInitial && !searchQuery.trim() && initialCustomers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('newOrder.client.noClients')}</Text>
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

      <ZoomableImageViewer
        visible={imageViewerVisible}
        images={referenceImage ? [{
          uri: referenceImage.startsWith('http')
            ? referenceImage
            : `${API_BASE_URL}${referenceImage}`,
          title: t('clients.edit.referenceImageLabel'),
        }] : []}
        initialIndex={0}
        onClose={() => setImageViewerVisible(false)}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  searchSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  searchButtonText: {
    ...Typography.bodyBold,
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
  },
  dividerText: {
    ...Typography.caption,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  form: {
    paddingHorizontal: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.sm,
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
  genderOptionText: {
    ...Typography.caption,
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
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  notesLabelOptional: {
    ...Typography.caption,
    fontSize: 12,
  },
  deliverySection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  deliveryDateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deliveryDateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  deliveryDateInfo: {
    flex: 1,
  },
  deliveryDateLabel: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  deliveryDateValue: {
    ...Typography.bodyBold,
  },
  deliveryDatePickerInline: {
    marginTop: Spacing.sm,
  },
  deliveryDatePickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: Spacing.sm,
  },
  deliveryDatePickerDoneText: {
    ...Typography.bodyBold,
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
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, 
    paddingTop: Platform.OS === 'ios' ? 64 : 0,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  customerItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  },
  emptyContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
  },
});
