import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Phone, Mail, Camera, ImageIcon, X, ZoomIn, Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PaywallModal } from '@/components/subscription';
import { api, apiFetch, getErrorMessage, ApiErrorCode, uploadImage, API_BASE_URL } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { customerFullName } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';

type Gender = 'male' | 'female' | null;

interface NewCustomerResponse {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  gender?: Gender;
  referenceImage?: string | null;
}

export default function NewClientScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors, isDark } = useTheme();
  const { defaultPhonePrefix } = useSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState<string>(defaultPhonePrefix);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [measurementAppointment, setMeasurementAppointment] = useState<Date | null>(null);
  const [showMeasurementIosPicker, setShowMeasurementIosPicker] = useState(false);
  const { upgradeToPro, checkCanCreateClient, getLimitMessages } = useSubscription();

  const canCreateClient = checkCanCreateClient();
  const limitMsgs = getLimitMessages();
  const isValid = firstName.trim() && lastName.trim() && phone.trim();

  const formatMeasurementLabel = useCallback(
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

  const openMeasurementPicker = () => {
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
    setShowMeasurementIosPicker((v) => !v);
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
        Alert.alert(t('common.error'), getErrorMessage(e, t('clients.edit.imageUploadError')));
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleRemoveReferenceImage = () => {
    setReferenceImage(null);
  };

  const handleCreate = async () => {
    if (!canCreateClient) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), t('clients.new.firstNameRequired'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('clients.new.phoneRequired'));
      return;
    }

    setLoading(true);
    try {
      const newCustomer = await apiFetch<NewCustomerResponse>(api.customers(), {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          gender: gender || undefined,
          referenceImage: referenceImage || undefined,
          ...(measurementAppointment ? { measurementAppointmentAt: measurementAppointment.toISOString() } : {}),
        }),
      });

      const fullName = customerFullName(newCustomer.firstName, newCustomer.lastName);
      const params = new URLSearchParams({
        clientId: newCustomer.id,
        clientName: fullName,
        clientPhone: newCustomer.phone,
      });
      if (newCustomer.email) params.set('clientEmail', newCustomer.email);
      if (newCustomer.gender) params.set('clientGender', newCustomer.gender);
      if (newCustomer.referenceImage) params.set('clientReferenceImage', newCustomer.referenceImage);

      router.replace(`/new-order/client-data?${params.toString()}`);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const msg = String(err?.message ?? '');
      if (
        err?.code === ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED ||
        msg.includes('Free plan allows only') ||
        msg.includes(ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED)
      ) {
        setShowPaywall(true);
      } else {
        Alert.alert(t('common.error'), getErrorMessage(error, t('clients.new.createError')));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    try {
      const result = await upgradeToPro(plan);
      if (result.success) setShowPaywall(false);
      else if (result.errorMessage) Alert.alert(t('common.error'), result.errorMessage);
    } catch (e) {
      Alert.alert(t('common.error'), getErrorMessage(e, t('clients.new.checkoutError')));
    } finally {
      setIsUpgrading(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <>
      <ScreenContainer noPadding>
        <View style={styles.flex1}>
          <KeyboardAwareScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.form}>
                <Input
                  label={t('newOrder.client.lastNameLabel')}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('clients.new.lastNamePlaceholder')}
                  leftIcon={<User size={20} color={colors.ink3} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.firstNameLabel')}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('clients.new.firstNamePlaceholder')}
                  leftIcon={<User size={20} color={colors.ink3} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.phoneLabel')}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('clients.new.phonePlaceholder')}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={colors.ink3} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.emailOptionalLabel')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('clients.new.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  optional
                  leftIcon={<Mail size={20} color={colors.ink4 ?? colors.textTertiary} />}
                  containerStyle={styles.inputGroup}
                />

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    {t('clientDetails.measurementAppointmentLabel')}
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.ink4 ?? colors.textTertiary }]}>
                    {t('clientDetails.measurementAppointmentHint')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.measurementSelector, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}
                    onPress={openMeasurementPicker}
                    activeOpacity={0.7}
                  >
                    <Calendar size={20} color={colors.ink3} />
                    <Text style={[styles.measurementValue, { color: colors.textPrimary }]}>
                      {measurementAppointment
                        ? formatMeasurementLabel(measurementAppointment)
                        : t('clientDetails.measurementAppointmentNotSet')}
                    </Text>
                  </TouchableOpacity>
                  {measurementAppointment ? (
                    <TouchableOpacity
                      onPress={() => {
                        setMeasurementAppointment(null);
                        setShowMeasurementIosPicker(false);
                      }}
                      style={styles.measurementClearWrap}
                    >
                      <Text style={[styles.measurementClearText, { color: colors.ember ?? colors.error }]}>
                        {t('clientDetails.measurementAppointmentClear')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {Platform.OS === 'ios' && showMeasurementIosPicker ? (
                    <View style={styles.measurementPickerWrap}>
                      <View style={styles.measurementPickerDoneRow}>
                        <TouchableOpacity onPress={() => setShowMeasurementIosPicker(false)} activeOpacity={0.7}>
                          <Text style={[styles.measurementPickerDone, { color: colors.brass ?? colors.primary }]}>
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

                {/* Gender Selection */}
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

                {/* Reference Image */}
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
            </View>
          </KeyboardAwareScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, AtelierSpacing.md), backgroundColor: colors.paper ?? colors.background, borderTopColor: colors.rule ?? colors.border }]}>
              {!canCreateClient && (
                <Text style={[styles.limitMessage, { color: colors.ink3 }]}>{limitMsgs.clientLimitReached}</Text>
              )}
              <Button
                variant="primary"
                fullWidth
                onPress={handleCreate}
                disabled={!isValid || loading || !canCreateClient || imageUploading}
                loading={loading}
                style={styles.createButton}
              >
                {t('clients.new.addClient')}
              </Button>
            </View>
        </View>
      </ScreenContainer>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 44,
  },
  flex1: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  form: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
  },
  inputGroup: {
    marginBottom: AtelierSpacing.lg,
  },
  measurementSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.md,
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
  },
  measurementValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  measurementClearWrap: {
    marginTop: AtelierSpacing.sm,
  },
  measurementClearText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  measurementPickerWrap: {
    marginTop: AtelierSpacing.sm,
  },
  measurementPickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: AtelierSpacing.sm,
  },
  measurementPickerDone: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
  },
  createButton: {
    marginTop: 0,
  },
  limitMessage: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
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
  genderOptionSelected: {
  },
  genderOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  genderOptionTextSelected: {
    fontFamily: FontFamily.sansSemiBold,
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
});
