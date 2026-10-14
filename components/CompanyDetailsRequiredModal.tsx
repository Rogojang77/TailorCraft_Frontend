/**
 * Blocking modal shown when user signed up with Apple and must complete company details
 * before using the app. Cannot be dismissed until the form is submitted successfully.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Save,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/Input';
import { api, apiFetch, uploadImage } from '@/lib/api';
import { fetchCompanySettings, invalidateCompanyCache } from '@/lib/api';
import { useCompany } from '@/contexts/CompanyContext';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

interface CompanyDetailsRequiredModalProps {
  visible: boolean;
  onComplete: () => void;
  clearNeedsCompanyDetails: () => Promise<void>;
}

export function CompanyDetailsRequiredModal({
  visible,
  onComplete,
  clearNeedsCompanyDetails,
}: CompanyDetailsRequiredModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { refreshCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    owner: '',
    phone: '',
    email: '',
    address: '',
    logo: null as string | null,
    logoUrl: null as string | null,
  });

  const loadCompany = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const settings = await fetchCompanySettings(true);
      setDraft({
        name: settings?.name ?? '',
        owner: settings?.owner ?? '',
        phone: settings?.phone ?? '',
        email: settings?.email ?? '',
        address: settings?.address ?? '',
        logo: null,
        logoUrl: settings?.logoUrl ?? null,
      });
    } catch {
      setDraft({
        name: '',
        owner: '',
        phone: '',
        email: '',
        address: '',
        logo: null,
        logoUrl: null,
      });
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) loadCompany();
  }, [visible, loadCompany]);

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(t('profile.alerts.permissionRequired'), t('profile.alerts.permissionMessage'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setDraft((prev) => ({ ...prev, logo: result.assets[0].uri }));
      }
    } catch {
      Alert.alert(t('common.error'), t('profile.alerts.imageError'));
    }
  };

  const validate = (): boolean => {
    if (!draft.name.trim()) {
      Alert.alert(t('common.error'), t('auth.signup.enterCompanyName'));
      return false;
    }
    if (!draft.owner.trim()) {
      Alert.alert(t('common.error'), t('auth.signup.enterOwnerName'));
      return false;
    }
    if (!draft.phone.trim()) {
      Alert.alert(t('common.error'), t('auth.signup.enterPhone'));
      return false;
    }
    if (!draft.email.trim()) {
      Alert.alert(t('common.error'), t('auth.signup.enterCompanyEmail'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      Alert.alert(t('common.error'), t('auth.signup.validCompanyEmail'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      let logoUrl = draft.logoUrl;
      if (draft.logo && !draft.logo.startsWith('http')) {
        try {
          logoUrl = await uploadImage(draft.logo);
        } catch {
          Alert.alert(t('common.error'), t('profile.alerts.logoUploadError'));
          setSaving(false);
          return;
        }
      }
      await apiFetch(api.settings.company, {
        method: 'PUT',
        body: JSON.stringify({
          name: draft.name.trim(),
          owner: draft.owner.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
          address: draft.address.trim() || undefined,
          logoUrl: logoUrl || undefined,
        }),
      });
      invalidateCompanyCache();
      await refreshCompany();
      await clearNeedsCompanyDetails();
      onComplete();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.alerts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { backgroundColor: colors.paper ?? colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('auth.companyRequired.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.ink3 }]}>
              {t('auth.companyRequired.message')}
            </Text>
          </View>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.brass ?? colors.primary} />
              <Text style={[styles.loadingText, { color: colors.ink3 }]}>
                {t('profile.loadingCompany')}
              </Text>
            </View>
          ) : (
            <KeyboardAwareScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
                {t('profile.companyLogo')}
              </Text>
              <View style={styles.logoRow}>
                <TouchableOpacity
                  style={[styles.logoCard, { backgroundColor: colors.card }]}
                  onPress={handleImagePicker}
                  activeOpacity={0.8}
                >
                  {(draft.logo ?? draft.logoUrl) ? (
                    <>
                      <View style={styles.logoImageContainer}>
                        <Image
                          source={{ uri: draft.logo ?? draft.logoUrl! }}
                          style={styles.logoImage}
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.logoGradient}
                        />
                      </View>
                      <View style={[styles.logoEditBadge, { backgroundColor: `${colors.brass ?? colors.primary}F0` }]}>
                        <Camera size={18} color={colors.paper ?? '#EFE9DC'} />
                        <Text style={[styles.logoEditBadgeText, { color: colors.paper ?? '#EFE9DC' }]}>
                          {t('profile.change')}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View
                      style={[
                        styles.logoPlaceholder,
                        {
                          backgroundColor: (colors.brassPale ?? colors.brass) + '18',
                          borderColor: colors.brass ?? colors.primary,
                        },
                      ]}
                    >
                      <Text style={[styles.logoPlaceholderTitle, { color: colors.textPrimary }]}>
                        {t('profile.addLogo')}
                      </Text>
                      <Text style={[styles.logoPlaceholderSubtitle, { color: colors.ink3 }]}>
                        {t('profile.tapToSelect')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
                {t('profile.companyInfo')}
              </Text>
              <Input
                label={t('profile.companyName')}
                value={draft.name}
                onChangeText={(text) => setDraft((prev) => ({ ...prev, name: text }))}
                placeholder={t('profile.companyNamePlaceholder')}
                leftIcon={<Building size={18} color={colors.brass ?? colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.owner')}
                value={draft.owner}
                onChangeText={(text) => setDraft((prev) => ({ ...prev, owner: text }))}
                placeholder={t('profile.ownerPlaceholder')}
                leftIcon={<User size={18} color={colors.brass ?? colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.phone')}
                value={draft.phone}
                onChangeText={(text) => setDraft((prev) => ({ ...prev, phone: text }))}
                placeholder={t('profile.phonePlaceholder')}
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color={colors.brass ?? colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.email')}
                value={draft.email}
                onChangeText={(text) => setDraft((prev) => ({ ...prev, email: text }))}
                placeholder={t('profile.emailPlaceholder')}
                keyboardType="email-address"
                leftIcon={<Mail size={18} color={colors.brass ?? colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.address')}
                value={draft.address}
                onChangeText={(text) => setDraft((prev) => ({ ...prev, address: text }))}
                placeholder={t('profile.addressPlaceholder')}
                leftIcon={<MapPin size={18} color={colors.brass ?? colors.primary} />}
                containerStyle={styles.inputGroupLast}
                optional
              />
            </KeyboardAwareScrollView>
          )}
          {!loading && (
            <View style={[styles.actions, { borderTopColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.brass ?? colors.primary }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.paper ?? '#EFE9DC'} />
                ) : (
                  <>
                    <Save size={18} color={colors.paper ?? '#EFE9DC'} strokeWidth={2.5} />
                    <Text style={[styles.saveButtonText, { color: colors.paper ?? '#EFE9DC' }]}>
                      {t('common.save')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 34,
  },
  header: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: AtelierSpacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  scroll: {
    maxHeight: 420,
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
  },
  sectionLabel: {
    fontFamily: FontFamily.serif,
    fontSize: 14,
    lineHeight: 24,
    marginBottom: AtelierSpacing.sm,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: AtelierSpacing.lg,
  },
  logoCard: {
    width: 160,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  logoImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  logoEditBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  logoPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  logoPlaceholderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: AtelierSpacing.md,
  },
  inputGroupLast: {
    marginBottom: AtelierSpacing.xl,
  },
  actions: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: 14,
    borderRadius: AtelierRadius.md,
  },
  saveButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
});
