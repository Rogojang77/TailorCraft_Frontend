import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Camera,
  Settings,
  ChevronRight,
  Save,
  LogOut,
  Edit,
  X,
  Crown,
  ShoppingBag,
  LayoutTemplate,
  Globe,
  Check,
  Trash2,
  Shield,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch, uploadImage } from '@/lib/api';
import { fetchCompanySettings, invalidateCompanyCache } from '@/lib/apiCache';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';
import { PaywallModal } from '@/components/PaywallModal';
import { ProBadge } from '@/components/ProBadge';
import { getDiagnostics } from '@/lib/diagnostics';

export default function ProfileTab() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuth();
  const { subscription, isLoading: subscriptionLoading, upgradeToPro, refreshSubscription, getUsageForDisplay, getLimitMessages } = useSubscription();
  const { isPremium } = usePremium();
  const [companyData, setCompanyData] = useState({
    name: '',
    owner: '',
    phone: '',
    email: '',
    address: '',
    logo: null as string | null,
    logoUrl: null as string | null,
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: '',
    owner: '',
    phone: '',
    email: '',
    address: '',
    logo: null as string | null,
    logoUrl: null as string | null,
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);

  const fetchCompany = useCallback(async (forceRefresh = false) => {
    setCompanyLoading(true);
    try {
      const settings = await fetchCompanySettings(forceRefresh);
      setCompanyData((prev) => ({
        ...prev,
        name: settings?.name ?? '',
        owner: settings?.owner ?? '',
        phone: settings?.phone ?? '',
        email: settings?.email ?? '',
        address: settings?.address ?? '',
        logoUrl: settings?.logoUrl ?? null,
      }));
    } catch {
      setCompanyData((prev) => ({ ...prev, name: '', owner: '', phone: '', email: '', address: '', logoUrl: null }));
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      fetchCompany(false);
    }, [isAuthenticated, fetchCompany])
  );

  const handleEditModalImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(t('profile.alerts.permissionRequired'), t('profile.alerts.permissionMessage'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setEditDraft((prev) => ({ ...prev, logo: result.assets[0].uri }));
      }
    } catch {
      Alert.alert(t('common.error'), t('profile.alerts.imageError'));
    }
  };

  const openEditModal = () => {
    setEditDraft({
      name: companyData.name,
      owner: companyData.owner,
      phone: companyData.phone,
      email: companyData.email,
      address: companyData.address ?? '',
      logo: null,
      logoUrl: companyData.logoUrl,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      let logoUrl = editDraft.logoUrl;
      if (editDraft.logo && !editDraft.logo.startsWith('http')) {
        try {
          logoUrl = await uploadImage(editDraft.logo);
        } catch (uploadError) {
          Alert.alert(t('common.error'), t('profile.alerts.logoUploadError'));
          return;
        }
      }

      await apiFetch(api.settings.company, {
        method: 'PUT',
        body: JSON.stringify({
          name: editDraft.name,
          owner: editDraft.owner,
          phone: editDraft.phone,
          email: editDraft.email,
          address: editDraft.address || undefined,
          logoUrl: logoUrl || undefined,
        }),
      });
      invalidateCompanyCache();
      setCompanyData((prev) => ({
        ...prev,
        name: editDraft.name,
        owner: editDraft.owner,
        phone: editDraft.phone,
        email: editDraft.email,
        address: editDraft.address,
        logoUrl: logoUrl ?? null,
        logo: null,
      }));
      setShowEditModal(false);
      Alert.alert(t('common.success'), t('profile.alerts.saveSuccess'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('profile.alerts.saveError'));
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      t('profile.alerts.logoutTitle'),
      t('profile.alerts.logoutMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by auth state change
            } catch (error) {
              Alert.alert(t('common.error'), t('profile.alerts.logoutError'));
            }
          },
        },
      ]
    );
  };

  const handleUpgradeClick = () => {
    setShowPaywall(true);
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
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('profile.alerts.checkoutError'));
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <ScreenContainer noPadding>
      {/* Header: long-press on title opens diagnostics (production support) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.titleContainer}
          onLongPress={() => setShowDiagnosticsModal(true)}
          activeOpacity={1}
          delayLongPress={600}
        >
          <Text style={styles.title}>{t('profile.title')}</Text>
          <ProBadge size="sm" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButtonLarge}
          onPress={openEditModal}
          activeOpacity={0.8}
        >
          <Edit size={16} color={Colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.editButtonText}>{t('profile.edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {companyLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('profile.loadingCompany')}</Text>
          </View>
        ) : (
          <>
        {/* Company Logo (read-only on profile) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.companyLogo')}</Text>
          <View style={styles.logoWrapper}>
            <View style={styles.logoCardReadOnly}>
              {(companyData.logo ?? companyData.logoUrl) ? (
                <View style={styles.logoImageContainerReadOnly}>
                  <Image
                    source={{ uri: companyData.logo ?? companyData.logoUrl! }}
                    style={styles.logoImageModernReadOnly}
                  />
                  <View style={styles.logoGlow} />
                </View>
              ) : (
                <View style={styles.logoPlaceholderReadOnlyModern}>
                  <Text style={styles.logoPlaceholderTitleReadOnly}>{t('profile.addCompanyLogoPlaceholder')}</Text>
                  <Text style={styles.logoPlaceholderSubtitleReadOnly}>
                    {t('profile.logoPlaceholderSubtitle')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Company Information (read-only on profile) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.companyInfo')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Building size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.companyName')}</Text>
              <Text style={styles.infoValue}>{companyData.name || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.owner')}</Text>
              <Text style={styles.infoValue}>{companyData.owner || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Phone size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.phone')}</Text>
              <Text style={styles.infoValue}>{companyData.phone || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Mail size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.email')}</Text>
              <Text style={styles.infoValue}>{companyData.email || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <MapPin size={18} color={Colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.address')}</Text>
              <Text style={styles.infoValue}>{companyData.address || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.subscription')}</Text>
          
          {subscriptionLoading ? (
            <View style={styles.subscriptionLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.subscriptionLoadingText}>{t('profile.loadingSubscription')}</Text>
            </View>
          ) : subscription ? (
            <>
              {/* Plan Badge */}
              <View style={[
                styles.planBadgeContainer,
                isPremium && styles.planBadgeContainerPro
              ]}>
                {isPremium && (
                  <Crown size={18} color={Colors.textInverse} strokeWidth={2.5} />
                )}
                <Text style={[
                  styles.planBadgeText,
                  isPremium && styles.planBadgeTextPro
                ]}>
                  {!isPremium ? t('profile.planFree') : t('profile.planPro')}
                </Text>
              </View>

              {!isPremium ? (() => {
                const usage = getUsageForDisplay();
                const limitMsgs = getLimitMessages();
                return (
                <>
                  {/* Usage Limits for FREE plan */}
                  <View style={styles.usageContainer}>
                    {(() => {
                      const maxC = usage.clients.max || 1;
                      const maxO = usage.orders.max || 1;
                      const clientsPercent = (usage.clients.current / maxC) * 100;
                      const ordersPercent = (usage.orders.current / maxO) * 100;
                      const clientsNearLimit = clientsPercent >= 80;
                      const ordersNearLimit = ordersPercent >= 80;
                      const nextBlockingLimit = clientsPercent > ordersPercent ? 'clients' : 'orders';
                      
                      return (
                        <>
                          <View style={styles.usageRow}>
                            <View style={styles.usageInfo}>
                              <User size={16} color={Colors.textSecondary} />
                              <Text style={styles.usageLabel}>{t('profile.clients')}</Text>
                              {clientsNearLimit && nextBlockingLimit === 'clients' && (
                                <View style={styles.limitWarningBadge}>
                                  <Text style={styles.limitWarningText}>{t('subscription.limitNear')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.usageProgressContainer}>
                              <View style={[
                                styles.usageProgressBarContainer,
                                clientsNearLimit && styles.usageProgressBarContainerWarning
                              ]}>
                                <View
                                  style={[
                                    styles.usageProgressBar,
                                    clientsNearLimit && styles.usageProgressBarWarning,
                                    { width: `${clientsPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={styles.usageCountSecondary}>
                                {usage.clients.current} / {usage.clients.max}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.usageRow}>
                            <View style={styles.usageInfo}>
                              <ShoppingBag size={16} color={Colors.textSecondary} />
                              <Text style={styles.usageLabel}>{t('profile.orders')}</Text>
                              {ordersNearLimit && nextBlockingLimit === 'orders' && (
                                <View style={styles.limitWarningBadge}>
                                  <Text style={styles.limitWarningText}>{t('subscription.limitNear')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.usageProgressContainer}>
                              <View style={[
                                styles.usageProgressBarContainer,
                                ordersNearLimit && styles.usageProgressBarContainerWarning
                              ]}>
                                <View
                                  style={[
                                    styles.usageProgressBar,
                                    ordersNearLimit && styles.usageProgressBarWarning,
                                    { width: `${ordersPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={styles.usageCountSecondary}>
                                {usage.orders.current} / {usage.orders.max}
                              </Text>
                            </View>
                          </View>
                        </>
                      );
                    })()}
                  </View>

                  {/* Upgrade Info */}
                  <Text style={styles.subscriptionHint}>
                    {limitMsgs.freePlanLimitShort}
                  </Text>

                  {/* Upgrade Button */}
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={handleUpgradeClick}
                    activeOpacity={0.8}
                  >
                    <Crown size={16} color={Colors.textInverse} strokeWidth={2.5} />
                    <Text style={styles.upgradeButtonText}>{t('profile.upgradeToPro')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.upgradeValueStatement}>
                    Acces nelimitat pentru a-ți crește afacerea
                  </Text>

                  {/* View Details Link */}
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewDetailsText}>{t('profile.viewSubscriptionDetails')}</Text>
                    <ChevronRight size={16} color="#6B7280" />
                  </TouchableOpacity>
                </>
                );
              })() : (
                <>
                  {/* Manage Subscription Button */}
                  <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Settings size={18} color="#9CA3AF" />
                    <Text style={styles.manageButtonText}>{t('profile.manageSubscription')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.subscriptionError}>
              <Text style={styles.subscriptionErrorText}>
                {t('profile.subscriptionLoadError')}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => refreshSubscription(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
          </>
        )}

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <Text style={[styles.infoLabel, { marginBottom: Spacing.md }]}>{t('settings.languageDescription')}</Text>
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[styles.languageOption, locale === 'en' && styles.languageOptionActive]}
              onPress={() => {
                if (locale !== 'en') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLocale('en');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.radioButton, locale === 'en' && styles.radioButtonActive]}>
                {locale === 'en' && <View style={styles.radioButtonInner} />}
              </View>
              <Globe size={16} color={Colors.textSecondary} />
              <Text style={styles.languageOptionText}>
                {t('settings.english')}
              </Text>
              {locale === 'en' && (
                <Check size={16} color={Colors.primary} strokeWidth={3} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageOption, locale === 'ro' && styles.languageOptionActive]}
              onPress={() => {
                if (locale !== 'ro') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLocale('ro');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.radioButton, locale === 'ro' && styles.radioButtonActive]}>
                {locale === 'ro' && <View style={styles.radioButtonInner} />}
              </View>
              <Globe size={16} color={Colors.textSecondary} />
              <Text style={styles.languageOptionText}>
                {t('settings.romanian')}
              </Text>
              {locale === 'ro' && (
                <Check size={16} color={Colors.primary} strokeWidth={3} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/garments')}
          >
            <View style={styles.menuItemLeft}>
              <LayoutTemplate size={20} color="#D4AF37" />
              <Text style={styles.menuItemText}>{t('profile.garmentsTemplates')}</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/pdf-customize')}
          >
            <View style={styles.menuItemLeft}>
              <FileText size={20} color="#D4AF37" />
              <Text style={styles.menuItemText}>{t('pdf.customizePdf')}</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/account/legal')}
          >
            <View style={styles.menuItemLeft}>
              <Shield size={20} color="#D4AF37" />
              <Text style={styles.menuItemText}>{t('legal.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account.title')}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/account/delete')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Trash2 size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, styles.deleteAccountText]}>{t('account.deleteAccount')}</Text>
            </View>
            <ChevronRight size={20} color={Colors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color={Colors.error} />
              <Text style={[styles.menuItemText, styles.logoutText]}>{t('profile.logout')}</Text>
            </View>
            <ChevronRight size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.aboutApp')}</Text>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{t('profile.appName')}</Text>
            <Text style={styles.appVersion}>{t('profile.version')}</Text>
            <Text style={styles.appDescription}>
              {t('profile.appDescription')}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.editModalOverlay}>
            <View style={styles.editModalCard}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>{t('profile.edit')}</Text>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.editModalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={24} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo in modal */}
              <Text style={styles.editModalSectionLabel}>{t('profile.companyLogo')}</Text>
              <View style={styles.editModalLogoRow}>
                <TouchableOpacity
                  style={styles.logoCard}
                  onPress={handleEditModalImagePicker}
                  activeOpacity={0.8}
                >
                  {(editDraft.logo ?? editDraft.logoUrl) ? (
                    <>
                      <View style={styles.logoImageContainer}>
                        <Image
                          source={{ uri: editDraft.logo ?? editDraft.logoUrl! }}
                          style={styles.logoImageModern}
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.logoGradientOverlay}
                        />
                      </View>
                      <View style={styles.logoEditBadge}>
                        <Camera size={18} color="#FFFFFF" />
                        <Text style={styles.logoEditBadgeText}>{t('profile.change')}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.logoPlaceholderModern}>
                      <Text style={styles.logoPlaceholderTitle}>{t('profile.addLogo')}</Text>
                      <Text style={styles.logoPlaceholderSubtitle}>{t('profile.tapToSelect')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.editModalSectionLabel}>{t('profile.companyInfo')}</Text>
              <Input
                label={t('profile.companyName')}
                value={editDraft.name}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, name: text }))}
                placeholder={t('profile.companyNamePlaceholder')}
                leftIcon={<Building size={18} color={Colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.owner')}
                value={editDraft.owner}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, owner: text }))}
                placeholder={t('profile.ownerPlaceholder')}
                leftIcon={<User size={18} color={Colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.phone')}
                value={editDraft.phone}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, phone: text }))}
                placeholder={t('profile.phonePlaceholder')}
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color={Colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.email')}
                value={editDraft.email}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, email: text }))}
                placeholder={t('profile.emailPlaceholder')}
                keyboardType="email-address"
                leftIcon={<Mail size={18} color={Colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.address')}
                value={editDraft.address}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, address: text }))}
                placeholder={t('profile.addressPlaceholder')}
                leftIcon={<MapPin size={18} color={Colors.primary} />}
                containerStyle={{ ...styles.inputGroup, ...styles.inputGroupLast }}
              />
            </KeyboardAwareScrollView>
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.editModalCancelButton}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Text style={styles.editModalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editModalSaveButton}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Save size={18} color={Colors.textInverse} strokeWidth={2.5} />
                <Text style={styles.editModalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Diagnostics modal (long-press Profile header); in-memory only, production support */}
      <Modal
        visible={showDiagnosticsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiagnosticsModal(false)}
      >
        <TouchableOpacity
          style={styles.diagnosticsOverlay}
          activeOpacity={1}
          onPress={() => setShowDiagnosticsModal(false)}
        >
          <TouchableOpacity
            style={styles.diagnosticsCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.diagnosticsTitle}>{t('profile.diagnosticsTitle')}</Text>
            {(() => {
              const d = getDiagnostics();
              const fmt = (ts: number) => new Date(ts).toISOString();
              return (
                <View style={styles.diagnosticsBody}>
                  <View style={styles.diagnosticsRow}>
                    <Text style={styles.diagnosticsLabel}>{t('profile.diagnosticsSubscriptionFetch')}</Text>
                    <Text style={styles.diagnosticsValue} numberOfLines={2}>
                      {d.lastSubscriptionFetch
                        ? `${d.lastSubscriptionFetch.result}${d.lastSubscriptionFetch.message ? `: ${d.lastSubscriptionFetch.message}` : ''} · ${fmt(d.lastSubscriptionFetch.timestamp)}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.diagnosticsRow}>
                    <Text style={styles.diagnosticsLabel}>{t('profile.diagnosticsAuthRefresh')}</Text>
                    <Text style={styles.diagnosticsValue}>
                      {d.lastAuthRefresh ? `${d.lastAuthRefresh.result} · ${fmt(d.lastAuthRefresh.timestamp)}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.diagnosticsRow}>
                    <Text style={styles.diagnosticsLabel}>{t('profile.diagnosticsDraftRestore')}</Text>
                    <Text style={styles.diagnosticsValue}>
                      {d.lastDraftRestore ? fmt(d.lastDraftRestore.timestamp) : '—'}
                    </Text>
                  </View>
                </View>
              );
            })()}
            <TouchableOpacity
              style={styles.diagnosticsClose}
              onPress={() => setShowDiagnosticsModal(false)}
            >
              <Text style={styles.diagnosticsCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...Typography.h2,
  },
  editButtonLarge: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    ...Shadows.primary,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textInverse,
    marginLeft: Spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelButton: {
    ...ButtonStyles.dangerIcon,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  saveButton: {
    ...ButtonStyles.primaryIcon,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  editBanner: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  editBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    marginLeft: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editingBadge: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionEditing: {
    borderWidth: 2,
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoCard: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  logoCardReadOnly: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  logoImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  logoImageContainerReadOnly: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImageModern: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoImageModernReadOnly: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  logoGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 0,
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoEditBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logoPlaceholderModern: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FEF9E7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
  },
  logoPlaceholderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
    textAlign: 'center',
  },
  logoPlaceholderSubtitle: {
    fontSize: 12,
    color: '#A16207',
    fontWeight: '500',
    textAlign: 'center',
  },
  logoPlaceholderReadOnlyModern: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  logoPlaceholderIconContainerReadOnly: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  logoPlaceholderTitleReadOnly: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  logoPlaceholderSubtitleReadOnly: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputGroupLast: {
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  infoIcon: {
    width: 20,
    height: 20,
    marginRight: Spacing.md,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...Typography.small,
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    ...Typography.bodyBold,
    fontSize: 17,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D4AF37',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  loadingSection: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  logoutText: {
    color: '#EF4444',
  },
  deleteAccountText: {
    color: Colors.error,
  },
  // Subscription styles
  subscriptionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  subscriptionLoadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  subscriptionError: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  subscriptionErrorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  retryButtonText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  planBadgeContainerPro: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  planBadgeText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  planBadgeTextPro: {
    color: Colors.textInverse,
  },
  usageContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  usageRow: {
    gap: Spacing.xs,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  usageLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  limitWarningBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  limitWarningText: {
    ...Typography.small,
    fontSize: 9,
    color: Colors.textInverse,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  usageProgressContainer: {
    gap: Spacing.xs,
  },
  usageProgressBarContainer: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  usageProgressBarContainerWarning: {
    backgroundColor: `${Colors.warning}20`,
  },
  usageProgressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  usageProgressBarWarning: {
    backgroundColor: Colors.warning,
  },
  usageCountSecondary: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
  subscriptionHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  upgradeButton: {
    ...ButtonStyles.primary,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  upgradeButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
    fontSize: 15,
  },
  upgradeValueStatement: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  proConfirmation: {
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  proConfirmationText: {
    ...Typography.body,
    color: '#065F46',
    fontWeight: '600',
    textAlign: 'center',
  },
  manageButton: {
    ...ButtonStyles.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  manageButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  viewDetailsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  languageRow: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minHeight: 56,
  },
  languageOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
    borderWidth: 2.5,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: Colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  languageOptionText: {
    ...Typography.bodyBold,
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  // Diagnostics modal (production support)
  diagnosticsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  diagnosticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  diagnosticsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  diagnosticsBody: {
    gap: 12,
  },
  diagnosticsRow: {
    marginBottom: 12,
  },
  diagnosticsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosticsValue: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  diagnosticsClose: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  diagnosticsCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Edit Profile Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 34,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  editModalTitle: {
    ...Typography.h3,
    fontSize: 18,
  },
  editModalCloseBtn: {
    padding: 4,
  },
  editModalScroll: {
    maxHeight: 420,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  editModalSectionLabel: {
    ...Typography.h3,
    fontSize: 14,
    marginBottom: Spacing.sm,
    color: Colors.textSecondary,
  },
  editModalLogoRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  editModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  editModalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  editModalSaveText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textInverse,
  },
});