import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import { useCustomBack } from '@/contexts/PageTitleContext';
import { Section } from '@/components/ui/Section';
import { Loader } from '@/components/ui/Loader';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User, Phone, Search, X, ChevronDown, ChevronRight, Check, Mail, Camera, ImageIcon, ZoomIn, Calendar, UserPlus } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/subscription';
import { api, apiFetch, getErrorMessage, ApiError, ApiErrorCode, uploadImage, API_BASE_URL } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { customerFullName } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';

const DEFAULT_DELIVERY_WEEKS = 3;
type Gender = 'male' | 'female' | null;

const parseGender = (value: string | undefined | null): Gender => {
  if (value === 'male' || value === 'female') return value;
  return null;
};

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  gender?: string | null;
  referenceImage?: string | null;
  measurementAppointmentAt?: string | null;
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
    clientGender?: string;
    clientReferenceImage?: string;
  }>();
  const { t, locale } = useI18n();
  const { draftOrder, updateCustomer, updateNotes, updateDeliveryDate } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription } = useSubscription();
  const { defaultPhonePrefix } = useSettings();

  // Keep phone input permissive; avoid forcing a specific country code.
  const formatPhoneNumber = (input: string): string => {
    return input;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
  };

  // Extract digits only from formatted phone number
  const getPhoneDigits = (formatted: string): string => {
    return formatted.replace(/\D/g, '');
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(defaultPhonePrefix || '');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [gender, setGender] = useState<Gender>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [measurementAppointment, setMeasurementAppointment] = useState<Date | null>(null);
  const [showMeasurementAppointmentIosPicker, setShowMeasurementAppointmentIosPicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  /** pick = client list with search (default); form = add a new client. */
  const [mode, setMode] = useState<'pick' | 'form'>('pick');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Opened for a known client (client page, or right after adding one): skip the picker.
  useEffect(() => {
    if (!params.clientId || !params.clientName || !params.clientPhone) return;
    updateCustomer({
      id: params.clientId,
      name: params.clientName,
      phone: params.clientPhone,
      email: params.clientEmail || undefined,
      gender: parseGender(params.clientGender),
      referenceImage: params.clientReferenceImage || undefined,
    });
    if (params.clientNotes) updateNotes(params.clientNotes);
    router.push('/new-order');
  }, [params.clientId]);

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
    updateCustomer({
      id: customer.id,
      name: customerFullName(customer.firstName, customer.lastName),
      phone: customer.phone, // Keep original format for API
      email: customer.email || undefined,
      gender: parseGender(customer.gender),
      referenceImage: customer.referenceImage ?? undefined,
    });
    router.push('/new-order');
  };

  const openNewClientForm = () => {
    setFirstName('');
    setLastName('');
    setPhone(defaultPhonePrefix || '');
    setEmail('');
    setNotes('');
    setShowNotes(false);
    setGender(null);
    setReferenceImage(null);
    setMeasurementAppointment(null);
    setShowMeasurementAppointmentIosPicker(false);
    setMode('form');
  };

  const handlePickReferenceImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('clients.edit.photoPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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

  // (Re)load the list whenever the picker is shown, so a client added in the form appears.
  useEffect(() => {
    if (mode === 'pick') loadInitialCustomers();
  }, [mode, loadInitialCustomers]);

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

  const formatMeasurementAppointmentDisplay = useCallback(
    (d: Date) =>
      d.toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );

  const openMeasurementAppointmentPicker = () => {
    const base = measurementAppointment ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, timeValue) => {
              if (timeEvent.type !== 'set' || !timeValue) return;
              const next = new Date(date);
              next.setHours(timeValue.getHours(), timeValue.getMinutes(), 0, 0);
              setMeasurementAppointment(next);
            },
          });
        },
      });
      return;
    }
    setShowMeasurementAppointmentIosPicker((v) => !v);
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
      let customerId: string | undefined;
      const phoneToSave = phoneDigits;

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
                ...(measurementAppointment
                  ? { measurementAppointmentAt: measurementAppointment.toISOString() }
                  : {}),
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
        gender,
        referenceImage: referenceImage ?? undefined,
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

  const handleNext = async () => {
    const ok = await saveClientData();
    if (!ok) return;
    setMode('pick');
    router.push('/new-order');
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

  // First step: return to wherever the order was started from (Home, client page, Orders).
  const exitFlow = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/orders'));
  const handleBack = () => (mode === 'form' ? setMode('pick') : exitFlow());
  useCustomBack(handleBack, t('common.back'));

  const visibleCustomers = searchQuery.trim() ? searchResults : initialCustomers;
  const isListLoading = isSearching || isLoadingInitial;

  if (mode === 'pick') {
    return (
      <ScreenContainer noPadding>
        <View style={styles.pickerHeader}>
          <Input
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchCustomers(text);
            }}
            placeholder={t('newOrder.client.searchPlaceholder')}
            leftIcon={<Search size={20} color={colors.ink3} />}
            autoCorrect={false}
            containerStyle={styles.pickerSearch}
          />
          <Button
            variant="secondary"
            onPress={openNewClientForm}
            leftIcon={<UserPlus size={18} color={colors.brass ?? colors.primary} />}
            fullWidth
          >
            {t('orders.addClient')}
          </Button>
        </View>
        <FlatList
          data={visibleCustomers}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + AtelierSpacing.xl }}
          renderItem={({ item }) => {
            const isSelected = item.id === draftOrder.customer.id;
            return (
              <TouchableOpacity
                style={[styles.customerItem, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}
                onPress={() => selectCustomer(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {customerFullName(item.firstName, item.lastName)}
                  </Text>
                  <Text style={[styles.customerPhone, { color: colors.ink3 }]} numberOfLines={1}>{item.phone}</Text>
                  {item.email ? (
                    <Text style={[styles.customerEmail, { color: colors.ink4 ?? colors.textTertiary }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <Check size={20} color={colors.brass ?? colors.primary} />
                ) : (
                  <ChevronRight size={20} color={colors.ink4 ?? colors.textTertiary} />
                )}
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            isListLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.brass ?? colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            isListLoading ? null : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.ink3 }]}>
                  {searchQuery.trim() ? t('newOrder.client.emptySearchResults') : t('newOrder.client.noClients')}
                </Text>
              </View>
            )
          }
        />
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onUpgrade={handleUpgrade}
          loading={isUpgrading}
        />
      </ScreenContainer>
    );
  }

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
          <Section title={t('newOrder.client.newClientDataSection')} style={[styles.form, { backgroundColor: colors.card }]}>
            <Input
              label={t('newOrder.client.lastNameLabel')}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('newOrder.client.lastNamePlaceholder')}
              leftIcon={<User size={20} color={colors.ink3} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.firstNameLabel')}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('newOrder.client.firstNamePlaceholder')}
              leftIcon={<User size={20} color={colors.ink3} />}
              containerStyle={styles.inputGroup}
            />

            <Input
              label={t('newOrder.client.phoneLabel')}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={t('newOrder.client.phonePlaceholder')}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={colors.ink3} />}
              containerStyle={styles.inputGroup}
            />

            {/* Delivery date (termen de predare) - under phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.ink3 }]}>{t('createOrder.deliveryDateLabel')}</Text>
              <TouchableOpacity
                style={[styles.deliveryDateSelector, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}
                onPress={openDeliveryDatePicker}
                activeOpacity={0.7}
              >
                <View style={styles.deliveryDateSelectorContent}>
                  <Calendar size={20} color={colors.ink3} />
                  <Text style={[styles.deliveryDateValue, { color: colors.textPrimary }]}>
                    {formatDeliveryDate(deliveryDate)}
                  </Text>
                </View>
              </TouchableOpacity>
              {Platform.OS === 'ios' && showDeliveryDatePicker && (
                <View style={styles.deliveryDatePickerInline}>
                  <View style={styles.deliveryDatePickerDoneRow}>
                    <TouchableOpacity onPress={() => setShowDeliveryDatePicker(false)} activeOpacity={0.7}>
                      <Text style={[styles.deliveryDatePickerDoneText, { color: colors.brass ?? colors.primary }]}>{t('common.done')}</Text>
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

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.ink3 }]}>
                {t('clientDetails.measurementAppointmentLabel')}
              </Text>
              <Text style={[styles.fieldHint, { color: colors.ink4 ?? colors.textTertiary }]}>
                {t('clientDetails.measurementAppointmentHint')}
              </Text>
              <TouchableOpacity
                style={[styles.deliveryDateSelector, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}
                onPress={openMeasurementAppointmentPicker}
                activeOpacity={0.7}
              >
                <View style={styles.deliveryDateSelectorContent}>
                  <Calendar size={20} color={colors.ink3} />
                  <Text style={[styles.deliveryDateValue, { color: colors.textPrimary }]}>
                    {measurementAppointment
                      ? formatMeasurementAppointmentDisplay(measurementAppointment)
                      : t('clientDetails.measurementAppointmentNotSet')}
                  </Text>
                </View>
              </TouchableOpacity>
              {measurementAppointment ? (
                <TouchableOpacity
                  onPress={() => {
                    setMeasurementAppointment(null);
                    setShowMeasurementAppointmentIosPicker(false);
                  }}
                  style={{ marginTop: AtelierSpacing.sm }}
                >
                  <Text style={{ fontFamily: FontFamily.monoSemiBold, fontSize: 11, lineHeight: 16, color: colors.ember ?? colors.error }}>
                    {t('clientDetails.measurementAppointmentClear')}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {Platform.OS === 'ios' && showMeasurementAppointmentIosPicker ? (
                <View style={styles.deliveryDatePickerInline}>
                  <View style={styles.deliveryDatePickerDoneRow}>
                    <TouchableOpacity
                      onPress={() => setShowMeasurementAppointmentIosPicker(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.deliveryDatePickerDoneText, { color: colors.brass ?? colors.primary }]}>
                        {t('common.done')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={measurementAppointment ?? new Date()}
                    mode="datetime"
                    display="spinner"
                    onChange={(_e, d) => d && setMeasurementAppointment(d)}
                    textColor={colors.textPrimary}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                </View>
              ) : null}
            </View>

            <Input
              label={t('newOrder.client.emailOptionalLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('newOrder.client.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              optional
              leftIcon={<Mail size={20} color={colors.ink4 ?? colors.textTertiary} />}
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
                      { borderColor: colors.rule ?? colors.border, backgroundColor: colors.card },
                      gender === g && { borderColor: colors.brass ?? colors.primary, backgroundColor: (colors.brassPale ?? colors.brass) + '18' },
                    ]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        { color: colors.ink3 },
                        gender === g && { color: colors.brass ?? colors.primary },
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
              <Text style={[styles.fieldHint, { color: colors.ink4 ?? colors.textTertiary }]}>{t('clients.edit.referenceImageHint')}</Text>
              {referenceImage ? (
                <View style={[styles.referenceImageContainer, { backgroundColor: colors.paper ?? colors.background }]}>
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
                      resizeMode="contain"
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
                      <Camera size={16} color={colors.brass ?? colors.primary} />
                      <Text style={[styles.changeImageText, { color: colors.brass ?? colors.primary }]}>{t('clients.edit.changeImage')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={handleRemoveReferenceImage}
                      disabled={imageUploading}
                    >
                      <X size={16} color={colors.ember ?? colors.error} />
                      <Text style={[styles.removeImageText, { color: colors.ember ?? colors.error }]}>{t('clients.edit.removeImage')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePicker, { borderColor: colors.rule ?? colors.border, backgroundColor: colors.paper ?? colors.background }]}
                  onPress={handlePickReferenceImage}
                  disabled={imageUploading}
                  activeOpacity={0.7}
                >
                  {imageUploading ? (
                    <Text style={[styles.imagePickerText, { color: colors.ink4 ?? colors.textTertiary }]}>{t('clients.edit.uploading')}</Text>
                  ) : (
                    <>
                      <ImageIcon size={32} color={colors.ink4 ?? colors.textTertiary} />
                      <Text style={[styles.imagePickerText, { color: colors.ink4 ?? colors.textTertiary }]}>{t('clients.edit.addReferenceImage')}</Text>
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
                <Text style={[styles.notesLabelOptional, { color: colors.ink4 ?? colors.textTertiary }]}>{t('newOrder.client.notesOptionalLabel')}</Text>
                <ChevronDown
                  size={18}
                  color={colors.ink4 ?? colors.textTertiary}
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
          onSecondaryPress={handleBack}
        />
      </View>
    </ScreenContainer>

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
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xxl,
  },
  form: {
    paddingHorizontal: AtelierSpacing.md,
    marginHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    ...AtelierShadow.card,
  },
  inputGroup: {
    marginBottom: AtelierSpacing.sm,
  },
  fieldLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.sm,
  },
  fieldHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.sm,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imagePickerText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.sm,
    textAlign: 'center',
  },
  referenceImageContainer: {
    borderRadius: AtelierRadius.lg,
    overflow: 'hidden',
  },
  referenceImageTouchable: {
    position: 'relative',
  },
  referenceImage: {
    width: '100%',
    height: 160,
    borderRadius: AtelierRadius.lg,
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: AtelierSpacing.sm,
    right: AtelierSpacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: AtelierRadius.full,
    padding: AtelierSpacing.xs,
  },
  referenceImageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: AtelierSpacing.sm,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    padding: AtelierSpacing.sm,
  },
  changeImageText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    padding: AtelierSpacing.sm,
  },
  removeImageText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.xs,
  },
  notesLabelOptional: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
  },
  deliverySection: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.sm,
    marginHorizontal: AtelierSpacing.md,
    marginTop: AtelierSpacing.sm,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    ...AtelierShadow.card,
  },
  deliveryDateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
  },
  deliveryDateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.md,
    flex: 1,
  },
  deliveryDateInfo: {
    flex: 1,
  },
  deliveryDateLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.xs,
  },
  deliveryDateValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  deliveryDatePickerInline: {
    marginTop: AtelierSpacing.sm,
  },
  deliveryDatePickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: AtelierSpacing.sm,
  },
  deliveryDatePickerDoneText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  pickerHeader: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.sm,
    gap: AtelierSpacing.sm,
  },
  pickerSearch: {
    marginBottom: 0,
  },
  loadingContainer: {
    padding: AtelierSpacing.md,
    alignItems: 'center',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    minHeight: 56,
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
    gap: AtelierSpacing.xs,
  },
  customerName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  customerPhone: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  customerEmail: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  emptyContainer: {
    padding: AtelierSpacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
});
