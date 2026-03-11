import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, usePremium } from '@/contexts/SubscriptionContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch, uploadImage } from '@/lib/api';
import { fetchCompanySettings, invalidateCompanyCache } from '@/lib/api';
import { Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { PaywallModal } from '@/components/subscription';
import { getDiagnostics } from '@/lib/diagnostics';

export default function ProfileTab() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ completeCompany?: string }>();
  const { isAuthenticated, logout, user } = useAuth();

  const { subscription, isLoading: subscriptionLoading, upgradeToPro, refreshSubscription, getUsageForDisplay, getLimitMessages } = useSubscription();
  const { isPremium } = usePremium();
  const { refreshCompany } = useCompany();
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
  const hasOpenedCompleteCompanyModal = useRef(false);

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

  // When navigated with ?completeCompany=1 (e.g. after Apple signup), open company modal once and clear param.
  useEffect(() => {
    if (!params.completeCompany || companyLoading || hasOpenedCompleteCompanyModal.current) return;
    hasOpenedCompleteCompanyModal.current = true;
    setEditDraft({
      name: companyData.name,
      owner: companyData.owner,
      phone: companyData.phone,
      email: companyData.email,
      address: companyData.address ?? '',
      logo: companyData.logo,
      logoUrl: companyData.logoUrl,
    });
    setShowEditModal(true);
    router.replace('/(tabs)/profile');
  }, [params.completeCompany, companyLoading, companyData.name, companyData.owner, companyData.phone, companyData.email, companyData.address, companyData.logo, companyData.logoUrl, router]);

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
      await refreshCompany();
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {companyLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('profile.loadingCompany')}</Text>
          </View>
        ) : (
          <>
        {/* Company Logo (read-only on profile) */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('profile.companyLogo')}</Text>
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
                <View style={[styles.logoPlaceholderReadOnlyModern, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[styles.logoPlaceholderTitleReadOnly, { color: colors.textPrimary }]}>{t('profile.addCompanyLogoPlaceholder')}</Text>
                  <Text style={[styles.logoPlaceholderSubtitleReadOnly, { color: colors.textSecondary }]}>
                    {t('profile.logoPlaceholderSubtitle')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Company Information (read-only on profile) */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin, { color: colors.textPrimary }]}>{t('profile.companyInfo')}</Text>
            <TouchableOpacity
              style={[styles.editCompanyButton, { backgroundColor: colors.primaryLight }]}
              onPress={openEditModal}
              activeOpacity={0.7}
            >
              <Edit size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={[styles.editCompanyButtonText, { color: colors.primary }]}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.infoIcon}>
              <Building size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('profile.companyName')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{companyData.name || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.infoIcon}>
              <User size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('profile.owner')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{companyData.owner || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.infoIcon}>
              <Phone size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('profile.phone')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{companyData.phone || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.infoIcon}>
              <Mail size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('profile.email')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{companyData.email || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <MapPin size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{t('profile.address')}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{companyData.address || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('profile.subscription')}</Text>
          
          {subscriptionLoading ? (
            <View style={styles.subscriptionLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.subscriptionLoadingText, { color: colors.textSecondary }]}>{t('subscription.verifying')}</Text>
            </View>
          ) : subscription ? (
            <>
              {/* Plan Badge */}
              <View style={[
                styles.planBadgeContainer,
                { backgroundColor: colors.background, borderColor: colors.border },
                isPremium && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {isPremium && (
                  <Crown size={18} color={colors.textInverse} strokeWidth={2.5} />
                )}
                <Text style={[
                  styles.planBadgeText,
                  { color: colors.textPrimary },
                  isPremium && { color: colors.textInverse }
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
                  <View style={[styles.usageContainer, { backgroundColor: colors.background }]}>
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
                              <User size={16} color={colors.textSecondary} />
                              <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>{t('profile.clients')}</Text>
                              {clientsNearLimit && nextBlockingLimit === 'clients' && (
                                <View style={[styles.limitWarningBadge, { backgroundColor: colors.warning }]}>
                                  <Text style={[styles.limitWarningText, { color: colors.textInverse }]}>{t('subscription.limitNear')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.usageProgressContainer}>
                              <View style={[
                                styles.usageProgressBarContainer,
                                { backgroundColor: colors.borderLight },
                                clientsNearLimit && { backgroundColor: `${colors.warning}20` }
                              ]}>
                                <View
                                  style={[
                                    styles.usageProgressBar,
                                    { backgroundColor: colors.primary },
                                    clientsNearLimit && { backgroundColor: colors.warning },
                                    { width: `${clientsPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.usageCountSecondary, { color: colors.textTertiary }]}>
                                {usage.clients.current} / {usage.clients.max}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.usageRow}>
                            <View style={styles.usageInfo}>
                              <ShoppingBag size={16} color={colors.textSecondary} />
                              <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>{t('profile.orders')}</Text>
                              {ordersNearLimit && nextBlockingLimit === 'orders' && (
                                <View style={[styles.limitWarningBadge, { backgroundColor: colors.warning }]}>
                                  <Text style={[styles.limitWarningText, { color: colors.textInverse }]}>{t('subscription.limitNear')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.usageProgressContainer}>
                              <View style={[
                                styles.usageProgressBarContainer,
                                { backgroundColor: colors.borderLight },
                                ordersNearLimit && { backgroundColor: `${colors.warning}20` }
                              ]}>
                                <View
                                  style={[
                                    styles.usageProgressBar,
                                    { backgroundColor: colors.primary },
                                    ordersNearLimit && { backgroundColor: colors.warning },
                                    { width: `${ordersPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.usageCountSecondary, { color: colors.textTertiary }]}>
                                {usage.orders.current} / {usage.orders.max}
                              </Text>
                            </View>
                          </View>
                        </>
                      );
                    })()}
                  </View>

                  {/* Upgrade Info */}
                  <Text style={[styles.subscriptionHint, { color: colors.textSecondary }]}>
                    {limitMsgs.freePlanLimitShort}
                  </Text>

                  {/* Upgrade Button */}
                  <TouchableOpacity 
                    style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                    onPress={handleUpgradeClick}
                    activeOpacity={0.8}
                  >
                    <Crown size={16} color={colors.textInverse} strokeWidth={2.5} />
                    <Text style={[styles.upgradeButtonText, { color: colors.textInverse }]}>{t('profile.upgradeToPro')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.upgradeValueStatement, { color: colors.textSecondary }]}>
                    Acces nelimitat pentru a-ți crește afacerea
                  </Text>

                  {/* View Details Link */}
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewDetailsText, { color: colors.textSecondary }]}>{t('profile.viewSubscriptionDetails')}</Text>
                    <ChevronRight size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </>
                );
              })() : (
                <>
                  {/* Manage Subscription Button */}
                  <TouchableOpacity 
                    style={[styles.manageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Settings size={18} color={colors.textSecondary} />
                    <Text style={[styles.manageButtonText, { color: colors.textSecondary }]}>{t('profile.manageSubscription')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.subscriptionError}>
              <Text style={[styles.subscriptionErrorText, { color: colors.error }]}>
                {t('profile.subscriptionLoadError')}
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => refreshSubscription(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.retryButtonText, { color: colors.textPrimary }]}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
          </>
        )}

        {/* Settings Menu */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('profile.settings')}</Text>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/settings/general')}
          >
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('settings.generalSettings')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/garments')}
          >
            <View style={styles.menuItemLeft}>
              <LayoutTemplate size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('profile.garmentsTemplates')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => {
              if (isPremium) {
                router.push('/pdf-customize');
              } else {
                setShowPaywall(true);
              }
            }}
          >
            <View style={styles.menuItemLeft}>
              <FileText size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('pdf.customizePdf')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/account/legal')}
          >
            <View style={styles.menuItemLeft}>
              <Shield size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('legal.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

        </View>

        {/* Account */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('account.title')}</Text>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/account/change-password')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Lock size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('account.changePassword.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/account/feedback')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Mail size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('feedback.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/account/newsletter')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Mail size={20} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>{t('newsletter.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/account/delete')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>{t('account.deleteAccount')}</Text>
            </View>
            <ChevronRight size={20} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>{t('profile.logout')}</Text>
            </View>
            <ChevronRight size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('profile.aboutApp')}</Text>
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: colors.primaryLegacy }]}>{t('profile.appName')}</Text>
            <Text style={[styles.appVersion, { color: colors.textSecondary }]}>{t('profile.version')}</Text>
            <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
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
            <View style={[styles.editModalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>{t('profile.edit')}</Text>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.editModalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={24} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo in modal */}
              <Text style={[styles.editModalSectionLabel, { color: colors.textSecondary }]}>{t('profile.companyLogo')}</Text>
              <View style={styles.editModalLogoRow}>
                <TouchableOpacity
                  style={[styles.logoCard, { backgroundColor: colors.surface }]}
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
                      <View style={[styles.logoEditBadge, { backgroundColor: `${colors.primaryLegacy}F0` }]}>
                        <Camera size={18} color={colors.textInverse} />
                        <Text style={[styles.logoEditBadgeText, { color: colors.textInverse }]}>{t('profile.change')}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={[styles.logoPlaceholderModern, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                      <Text style={[styles.logoPlaceholderTitle, { color: colors.warningText }]}>{t('profile.addLogo')}</Text>
                      <Text style={[styles.logoPlaceholderSubtitle, { color: colors.warningTextDark }]}>{t('profile.tapToSelect')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.editModalSectionLabel, { color: colors.textSecondary }]}>{t('profile.companyInfo')}</Text>
              <Input
                label={t('profile.companyName')}
                value={editDraft.name}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, name: text }))}
                placeholder={t('profile.companyNamePlaceholder')}
                leftIcon={<Building size={18} color={colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.owner')}
                value={editDraft.owner}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, owner: text }))}
                placeholder={t('profile.ownerPlaceholder')}
                leftIcon={<User size={18} color={colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.phone')}
                value={editDraft.phone}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, phone: text }))}
                placeholder={t('profile.phonePlaceholder')}
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color={colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.email')}
                value={editDraft.email}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, email: text }))}
                placeholder={t('profile.emailPlaceholder')}
                keyboardType="email-address"
                leftIcon={<Mail size={18} color={colors.primary} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.address')}
                value={editDraft.address}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, address: text }))}
                placeholder={t('profile.addressPlaceholder')}
                leftIcon={<MapPin size={18} color={colors.primary} />}
                containerStyle={{ ...styles.inputGroup, ...styles.inputGroupLast }}
              />
            </KeyboardAwareScrollView>
            <View style={[styles.editModalActions, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity
                style={[styles.editModalCancelButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Text style={[styles.editModalCancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalSaveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Save size={18} color={colors.textInverse} strokeWidth={2.5} />
                <Text style={[styles.editModalSaveText, { color: colors.textInverse }]}>{t('common.save')}</Text>
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
            style={[styles.diagnosticsCard, { backgroundColor: colors.surface }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.diagnosticsTitle, { color: colors.textPrimary }]}>{t('profile.diagnosticsTitle')}</Text>
            {(() => {
              const d = getDiagnostics();
              const fmt = (ts: number) => new Date(ts).toISOString();
              return (
                <View style={styles.diagnosticsBody}>
                  <View style={styles.diagnosticsRow}>
                    <Text style={[styles.diagnosticsLabel, { color: colors.textSecondary }]}>{t('profile.diagnosticsSubscriptionFetch')}</Text>
                    <Text style={[styles.diagnosticsValue, { color: colors.textPrimary }]} numberOfLines={2}>
                      {d.lastSubscriptionFetch
                        ? `${d.lastSubscriptionFetch.result}${d.lastSubscriptionFetch.message ? `: ${d.lastSubscriptionFetch.message}` : ''} · ${fmt(d.lastSubscriptionFetch.timestamp)}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.diagnosticsRow}>
                    <Text style={[styles.diagnosticsLabel, { color: colors.textSecondary }]}>{t('profile.diagnosticsAuthRefresh')}</Text>
                    <Text style={[styles.diagnosticsValue, { color: colors.textPrimary }]}>
                      {d.lastAuthRefresh ? `${d.lastAuthRefresh.result} · ${fmt(d.lastAuthRefresh.timestamp)}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.diagnosticsRow}>
                    <Text style={[styles.diagnosticsLabel, { color: colors.textSecondary }]}>{t('profile.diagnosticsDraftRestore')}</Text>
                    <Text style={[styles.diagnosticsValue, { color: colors.textPrimary }]}>
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
              <Text style={[styles.diagnosticsCloseText, { color: colors.primary }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.h2,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cancelButton: {
    ...ButtonStyles.dangerIcon,
    borderWidth: 1.5,
  },
  saveButton: {
    ...ButtonStyles.primaryIcon,
  },
  editBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  editBannerText: {
    flex: 1,
    fontSize: 14,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionEditing: {
    borderWidth: 2,
  },
  content: {
    flex: 1,
  },
  section: {
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
  sectionTitleNoMargin: {
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  editCompanyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 8,
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
  logoCardReadOnly: {
    width: 160,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
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
    ...(Platform.OS === 'ios' && {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 0,
    }),
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
  logoPlaceholderModern: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  logoPlaceholderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...(Platform.OS === 'ios' && {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    }),
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
  logoPlaceholderReadOnlyModern: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  logoPlaceholderIconContainerReadOnly: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  logoPlaceholderTitleReadOnly: {
    ...Typography.bodyBold,
    fontSize: 15,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  logoPlaceholderSubtitleReadOnly: {
    ...Typography.caption,
    fontSize: 12,
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
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    ...Typography.bodyBold,
    fontSize: 17,
    lineHeight: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
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
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
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
    marginTop: 12,
  },
  logoutText: {
  },
  deleteAccountText: {
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
  },
  subscriptionError: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  subscriptionErrorText: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
  },
  retryButtonText: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  planBadgeContainerPro: {
  },
  planBadgeText: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  planBadgeTextPro: {
  },
  usageContainer: {
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
    fontSize: 14,
  },
  limitWarningBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  limitWarningText: {
    ...Typography.small,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  usageProgressContainer: {
    gap: Spacing.xs,
  },
  usageProgressBarContainer: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  usageProgressBarContainerWarning: {
  },
  usageProgressBar: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  usageProgressBarWarning: {
  },
  usageCountSecondary: {
    ...Typography.caption,
    fontSize: 11,
    textAlign: 'right',
  },
  subscriptionHint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  upgradeButton: {
    ...ButtonStyles.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  upgradeButtonText: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  upgradeValueStatement: {
    ...Typography.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  proConfirmation: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
  },
  proConfirmationText: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  manageButton: {
    ...ButtonStyles.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
  },
  manageButtonText: {
    ...Typography.body,
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
    minHeight: 56,
  },
  languageOptionActive: {
    borderWidth: 2.5,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  languageOptionText: {
    ...Typography.bodyBold,
    fontSize: 15,
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
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  diagnosticsTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosticsValue: {
    fontSize: 14,
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
  },
  // Edit Profile Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
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
  },
  editModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelText: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  editModalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    ...Shadows.primary,
  },
  editModalSaveText: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
});