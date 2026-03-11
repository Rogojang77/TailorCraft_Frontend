import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Phone, Mail, Camera, ImageIcon, X, ZoomIn } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PaywallModal } from '@/components/subscription';
import { api, apiFetch, getErrorMessage, ApiErrorCode, uploadImage, API_BASE_URL } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { customerFullName } from '@/lib/api';
import { Spacing, Typography, HeaderStyles, BorderRadius } from '@/constants/design';
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
  const { t } = useI18n();
  const { colors } = useTheme();
  const { defaultPhonePrefix } = useSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(defaultPhonePrefix);
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { upgradeToPro, checkCanCreateClient, getLimitMessages } = useSubscription();

  const canCreateClient = checkCanCreateClient();
  const limitMsgs = getLimitMessages();
  const isValid = firstName.trim() && lastName.trim() && phone.trim();

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
        }),
      });

      const fullName = customerFullName(newCustomer.firstName, newCustomer.lastName);
      const params = new URLSearchParams({
        clientId: newCustomer.id,
        clientName: fullName,
        clientPhone: newCustomer.phone,
      });
      if (newCustomer.email) params.set('clientEmail', newCustomer.email);

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
                  leftIcon={<User size={20} color={colors.textSecondary} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.firstNameLabel')}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('clients.new.firstNamePlaceholder')}
                  leftIcon={<User size={20} color={colors.textSecondary} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.phoneLabel')}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('clients.new.phonePlaceholder')}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={colors.textSecondary} />}
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
                  leftIcon={<Mail size={20} color={colors.textTertiary} />}
                  containerStyle={styles.inputGroup}
                />

                {/* Gender Selection */}
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

                {/* Reference Image */}
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
            </View>
          </KeyboardAwareScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: colors.background, borderTopColor: colors.border }]}>
              {!canCreateClient && (
                <Text style={[styles.limitMessage, { color: colors.textSecondary }]}>{limitMsgs.clientLimitReached}</Text>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  createButton: {
    marginTop: 0,
  },
  limitMessage: {
    ...Typography.caption,
    textAlign: 'center',
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
