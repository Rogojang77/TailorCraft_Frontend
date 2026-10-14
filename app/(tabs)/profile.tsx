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
  GraduationCap,
  Globe,
  Check,
  Trash2,
  Shield,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, usePremium } from '@/contexts/SubscriptionContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch, uploadImage } from '@/lib/api';
import { fetchCompanySettings, invalidateCompanyCache } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierType, AtelierShadow } from '@/constants/atelierDesign';
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

  const bg = colors.paper;
  const inkColor = colors.textPrimary;
  const ink2 = colors.ink2 ?? colors.textPrimary;
  const ink3 = colors.ink3 ?? colors.textSecondary;
  const ink4 = colors.ink4 ?? colors.textTertiary;
  const brassColor = colors.brass;
  const cardBg = colors.card;
  const ruleColor = colors.rule ?? colors.border;

  return (
    <ScreenContainer noPadding style={{ backgroundColor: bg }}>
      <ScrollView style={[styles.content, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
        {companyLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={brassColor} />
            <Text style={[styles.loadingText, { color: ink3 }]}>{t('profile.loadingCompany')}</Text>
          </View>
        ) : (
          <>
        {/* Company Logo (read-only on profile) */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: inkColor }]}>{t('profile.companyLogo')}</Text>
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
                <View style={[styles.logoPlaceholderReadOnlyModern, { backgroundColor: colors.brassPale + '22', borderColor: brassColor }]}>
                  <Text style={[styles.logoPlaceholderTitleReadOnly, { color: inkColor }]}>{t('profile.addCompanyLogoPlaceholder')}</Text>
                  <Text style={[styles.logoPlaceholderSubtitleReadOnly, { color: ink3 }]}>
                    {t('profile.logoPlaceholderSubtitle')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Company Information (read-only on profile) */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin, { color: inkColor }]}>{t('profile.companyInfo')}</Text>
            <TouchableOpacity
              style={[styles.editCompanyButton, { backgroundColor: colors.brassPale + '33' }]}
              onPress={openEditModal}
              activeOpacity={0.7}
            >
              <Edit size={14} color={brassColor} strokeWidth={2.5} />
              <Text style={[styles.editCompanyButtonText, { color: brassColor }]}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: ruleColor }]}>
            <View style={styles.infoIcon}>
              <Building size={18} color={ink3} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: ink4 }]}>{t('profile.companyName')}</Text>
              <Text style={[styles.infoValue, { color: inkColor }]}>{companyData.name || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: ruleColor }]}>
            <View style={styles.infoIcon}>
              <User size={18} color={ink3} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: ink4 }]}>{t('profile.owner')}</Text>
              <Text style={[styles.infoValue, { color: inkColor }]}>{companyData.owner || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: ruleColor }]}>
            <View style={styles.infoIcon}>
              <Phone size={18} color={ink3} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: ink4 }]}>{t('profile.phone')}</Text>
              <Text style={[styles.infoValue, { color: inkColor }]}>{companyData.phone || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: ruleColor }]}>
            <View style={styles.infoIcon}>
              <Mail size={18} color={ink3} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: ink4 }]}>{t('profile.email')}</Text>
              <Text style={[styles.infoValue, { color: inkColor }]}>{companyData.email || '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIcon}>
              <MapPin size={18} color={ink3} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: ink4 }]}>{t('profile.address')}</Text>
              <Text style={[styles.infoValue, { color: inkColor }]}>{companyData.address || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: inkColor }]}>{t('profile.subscription')}</Text>

          {subscriptionLoading ? (
            <View style={styles.subscriptionLoading}>
              <ActivityIndicator size="small" color={brassColor} />
              <Text style={[styles.subscriptionLoadingText, { color: ink3 }]}>{t('subscription.verifying')}</Text>
            </View>
          ) : subscription ? (
            <>
              {/* Plan Badge */}
              <View style={[
                styles.planBadgeContainer,
                { backgroundColor: bg, borderColor: ruleColor },
                isPremium && { backgroundColor: brassColor, borderColor: brassColor }
              ]}>
                {isPremium && (
                  <Crown size={18} color={bg} strokeWidth={2.5} />
                )}
                <Text style={[
                  styles.planBadgeText,
                  { color: inkColor },
                  isPremium && { color: bg }
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
                  <View style={[styles.usageContainer, { backgroundColor: bg }]}>
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
                              <User size={16} color={ink3} />
                              <Text style={[styles.usageLabel, { color: ink3 }]}>{t('profile.clients')}</Text>
                              {clientsNearLimit && nextBlockingLimit === 'clients' && (
                                <View style={[styles.limitWarningBadge, { backgroundColor: colors.ember }]}>
                                  <Text style={[styles.limitWarningText, { color: bg }]}>{t('subscription.limitNear')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.usageProgressContainer}>
                              <View style={[
                                styles.usageProgressBarContainer,
                                { backgroundColor: ruleColor },
                                clientsNearLimit && { backgroundColor: colors.ember + '20' }
                              ]}>
                                <View
                                  style={[
                                    styles.usageProgressBar,
                                    { backgroundColor: brassColor },
                                    clientsNearLimit && { backgroundColor: colors.ember },
                                    { width: `${clientsPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.usageCountSecondary, { color: ink4 }]}>
                                {usage.clients.current} / {usage.clients.max}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.usageRow}>
                            <View style={styles.usageInfo}>
                              <ShoppingBag size={16} color={ink3} />
                              <Text style={[styles.usageLabel, { color: ink3 }]}>{t('profile.orders')}</Text>
                              {ordersNearLimit && nextBlockingLimit === 'orders' && (
                                <View style={[styles.limitWarningBadge, { backgroundColor: colors.ember }]}>
                                  <Text style={[styles.limitWarningText, { color: bg }]}>{t('subscription.limitNear')}</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.usageProgressContainer}>
                              <View style={[
                                styles.usageProgressBarContainer,
                                { backgroundColor: ruleColor },
                                ordersNearLimit && { backgroundColor: colors.ember + '20' }
                              ]}>
                                <View
                                  style={[
                                    styles.usageProgressBar,
                                    { backgroundColor: brassColor },
                                    ordersNearLimit && { backgroundColor: colors.ember },
                                    { width: `${ordersPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.usageCountSecondary, { color: ink4 }]}>
                                {usage.orders.current} / {usage.orders.max}
                              </Text>
                            </View>
                          </View>
                        </>
                      );
                    })()}
                  </View>

                  {/* Upgrade Info */}
                  <Text style={[styles.subscriptionHint, { color: ink3 }]}>
                    {limitMsgs.freePlanLimitShort}
                  </Text>

                  {/* Upgrade Button */}
                  <TouchableOpacity
                    style={[styles.upgradeButton, { backgroundColor: brassColor }]}
                    onPress={handleUpgradeClick}
                    activeOpacity={0.8}
                  >
                    <Crown size={16} color={bg} strokeWidth={2.5} />
                    <Text style={[styles.upgradeButtonText, { color: bg }]}>{t('profile.upgradeToPro')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.upgradeValueStatement, { color: ink3 }]}>
                    Acces nelimitat pentru a-ți crește afacerea
                  </Text>

                  {/* View Details Link */}
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewDetailsText, { color: ink3 }]}>{t('profile.viewSubscriptionDetails')}</Text>
                    <ChevronRight size={16} color={ink3} />
                  </TouchableOpacity>
                </>
                );
              })() : (
                <>
                  {/* Manage Subscription Button */}
                  <TouchableOpacity
                    style={[styles.manageButton, { backgroundColor: cardBg, borderColor: ruleColor }]}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Settings size={18} color={ink3} />
                    <Text style={[styles.manageButtonText, { color: ink3 }]}>{t('profile.manageSubscription')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.subscriptionError}>
              <Text style={[styles.subscriptionErrorText, { color: colors.ember }]}>
                {t('profile.subscriptionLoadError')}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: bg, borderColor: ruleColor }]}
                onPress={() => refreshSubscription(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.retryButtonText, { color: inkColor }]}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
          </>
        )}

        {/* Settings Menu */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: inkColor }]}>{t('profile.settings')}</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/settings/general')}
          >
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('settings.generalSettings')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/garments')}
          >
            <View style={styles.menuItemLeft}>
              <LayoutTemplate size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('profile.garmentsTemplates')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/tutorial')}
          >
            <View style={styles.menuItemLeft}>
              <GraduationCap size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('tutorial.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/account/legal')}
          >
            <View style={styles.menuItemLeft}>
              <Shield size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('legal.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>

        </View>

        {/* Account */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: inkColor }]}>{t('account.title')}</Text>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/account/change-password')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Lock size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('account.changePassword.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/account/feedback')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Mail size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('feedback.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/account/newsletter')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Mail size={20} color={brassColor} />
              <Text style={[styles.menuItemText, { color: inkColor }]}>{t('newsletter.menuItem')}</Text>
            </View>
            <ChevronRight size={20} color={ink3} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={() => router.push('/account/delete')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Trash2 size={20} color={colors.ember} />
              <Text style={[styles.menuItemText, { color: colors.ember }]}>{t('account.deleteAccount')}</Text>
            </View>
            <ChevronRight size={20} color={colors.ember} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: ruleColor }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color={colors.ember} />
              <Text style={[styles.menuItemText, { color: colors.ember }]}>{t('profile.logout')}</Text>
            </View>
            <ChevronRight size={20} color={colors.ember} />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: inkColor }]}>{t('profile.aboutApp')}</Text>
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: brassColor }]}>{t('profile.appName')}</Text>
            <Text style={[styles.appVersion, { color: ink3 }]}>{t('profile.version')}</Text>
            <Text style={[styles.appDescription, { color: ink3 }]}>
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
            <View style={[styles.editModalCard, { backgroundColor: cardBg }]}>
            <View style={[styles.editModalHeader, { borderBottomColor: ruleColor }]}>
              <Text style={[styles.editModalTitle, { color: inkColor }]}>{t('profile.edit')}</Text>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.editModalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={24} color={ink3} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo in modal */}
              <Text style={[styles.editModalSectionLabel, { color: ink3 }]}>{t('profile.companyLogo')}</Text>
              <View style={styles.editModalLogoRow}>
                <TouchableOpacity
                  style={[styles.logoCard, { backgroundColor: cardBg }]}
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
                      <View style={[styles.logoEditBadge, { backgroundColor: brassColor + 'F0' }]}>
                        <Camera size={18} color={bg} />
                        <Text style={[styles.logoEditBadgeText, { color: bg }]}>{t('profile.change')}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={[styles.logoPlaceholderModern, { backgroundColor: colors.brassPale + '22', borderColor: brassColor }]}>
                      <Text style={[styles.logoPlaceholderTitle, { color: brassColor }]}>{t('profile.addLogo')}</Text>
                      <Text style={[styles.logoPlaceholderSubtitle, { color: ink3 }]}>{t('profile.tapToSelect')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.editModalSectionLabel, { color: ink3 }]}>{t('profile.companyInfo')}</Text>
              <Input
                label={t('profile.companyName')}
                value={editDraft.name}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, name: text }))}
                placeholder={t('profile.companyNamePlaceholder')}
                leftIcon={<Building size={18} color={brassColor} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.owner')}
                value={editDraft.owner}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, owner: text }))}
                placeholder={t('profile.ownerPlaceholder')}
                leftIcon={<User size={18} color={brassColor} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.phone')}
                value={editDraft.phone}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, phone: text }))}
                placeholder={t('profile.phonePlaceholder')}
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} color={brassColor} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.email')}
                value={editDraft.email}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, email: text }))}
                placeholder={t('profile.emailPlaceholder')}
                keyboardType="email-address"
                leftIcon={<Mail size={18} color={brassColor} />}
                containerStyle={styles.inputGroup}
              />
              <Input
                label={t('profile.address')}
                value={editDraft.address}
                onChangeText={(text) => setEditDraft((prev) => ({ ...prev, address: text }))}
                placeholder={t('profile.addressPlaceholder')}
                leftIcon={<MapPin size={18} color={brassColor} />}
                containerStyle={{ ...styles.inputGroup, ...styles.inputGroupLast }}
              />
            </KeyboardAwareScrollView>
            <View style={[styles.editModalActions, { borderTopColor: ruleColor }]}>
              <TouchableOpacity
                style={[styles.editModalCancelButton, { borderColor: ruleColor, backgroundColor: bg }]}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <Text style={[styles.editModalCancelText, { color: ink3 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalSaveButton, { backgroundColor: brassColor }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Save size={18} color={bg} strokeWidth={2.5} />
                <Text style={[styles.editModalSaveText, { color: bg }]}>{t('common.save')}</Text>
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
            style={[styles.diagnosticsCard, { backgroundColor: cardBg }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.diagnosticsTitle, { color: inkColor }]}>{t('profile.diagnosticsTitle')}</Text>
            {(() => {
              const d = getDiagnostics();
              const fmt = (ts: number) => new Date(ts).toISOString();
              return (
                <View style={styles.diagnosticsBody}>
                  <View style={styles.diagnosticsRow}>
                    <Text style={[styles.diagnosticsLabel, { color: ink3 }]}>{t('profile.diagnosticsSubscriptionFetch')}</Text>
                    <Text style={[styles.diagnosticsValue, { color: inkColor }]} numberOfLines={2}>
                      {d.lastSubscriptionFetch
                        ? `${d.lastSubscriptionFetch.result}${d.lastSubscriptionFetch.message ? `: ${d.lastSubscriptionFetch.message}` : ''} · ${fmt(d.lastSubscriptionFetch.timestamp)}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.diagnosticsRow}>
                    <Text style={[styles.diagnosticsLabel, { color: ink3 }]}>{t('profile.diagnosticsAuthRefresh')}</Text>
                    <Text style={[styles.diagnosticsValue, { color: inkColor }]}>
                      {d.lastAuthRefresh ? `${d.lastAuthRefresh.result} · ${fmt(d.lastAuthRefresh.timestamp)}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.diagnosticsRow}>
                    <Text style={[styles.diagnosticsLabel, { color: ink3 }]}>{t('profile.diagnosticsDraftRestore')}</Text>
                    <Text style={[styles.diagnosticsValue, { color: inkColor }]}>
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
              <Text style={[styles.diagnosticsCloseText, { color: brassColor }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 24,
    lineHeight: 32,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: AtelierRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  editBannerText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    fontFamily: FontFamily.sansMedium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  editingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AtelierRadius.md,
  },
  editingBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.sansSemiBold,
  },
  sectionEditing: {
    borderWidth: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.lg,
    ...AtelierShadow.card,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: AtelierSpacing.md,
  },
  sectionTitleNoMargin: {
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  editCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.xs,
    borderRadius: AtelierRadius.sm,
    gap: 4,
  },
  editCompanyButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.sansSemiBold,
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
      shadowColor: '#1B1611',
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
      shadowColor: '#1B1611',
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
    resizeMode: 'contain',
  },
  logoImageModernReadOnly: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
    borderRadius: AtelierRadius.md,
    gap: 6,
    ...(Platform.OS === 'ios' && {
      shadowColor: '#1B1611',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  logoEditBadgeText: {
    fontSize: 13,
    fontFamily: FontFamily.sansBold,
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
    borderRadius: AtelierRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...(Platform.OS === 'ios' && {
      shadowColor: '#1B1611',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  logoPlaceholderTitle: {
    fontSize: 16,
    fontFamily: FontFamily.sansBold,
    marginBottom: 4,
    textAlign: 'center',
  },
  logoPlaceholderSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.sansMedium,
    textAlign: 'center',
  },
  logoPlaceholderReadOnlyModern: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  logoPlaceholderIconContainerReadOnly: {
    width: 64,
    height: 64,
    borderRadius: AtelierRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
    ...AtelierShadow.elevated,
  },
  logoPlaceholderTitleReadOnly: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs,
    textAlign: 'center',
  },
  logoPlaceholderSubtitleReadOnly: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: AtelierSpacing.sm,
  },
  inputGroup: {
    marginBottom: AtelierSpacing.md,
  },
  inputGroupLast: {
    marginBottom: AtelierSpacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.md,
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
    marginRight: AtelierSpacing.md,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: FontFamily.sansSemiBold,
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
    fontFamily: FontFamily.sansMedium,
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appName: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 4,
  },
  appVersion: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  appDescription: {
    fontFamily: FontFamily.sans,
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
    fontFamily: FontFamily.sans,
    fontSize: 16,
    marginTop: 12,
  },
  logoutText: {
  },
  deleteAccountText: {
  },
  subscriptionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AtelierSpacing.lg,
    gap: AtelierSpacing.md,
  },
  subscriptionLoadingText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  subscriptionError: {
    alignItems: 'center',
    paddingVertical: AtelierSpacing.lg,
  },
  subscriptionErrorText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.md,
  },
  retryButton: {
    paddingHorizontal: AtelierSpacing.lg,
    paddingVertical: AtelierSpacing.sm,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1.5,
  },
  retryButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
    borderWidth: 2,
    marginBottom: AtelierSpacing.lg,
  },
  planBadgeContainerPro: {
  },
  planBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  planBadgeTextPro: {
  },
  usageContainer: {
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.md,
    gap: AtelierSpacing.md,
  },
  usageRow: {
    gap: AtelierSpacing.xs,
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
  },
  usageLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  limitWarningBadge: {
    paddingHorizontal: AtelierSpacing.xs,
    paddingVertical: 2,
    borderRadius: AtelierRadius.sm,
    marginLeft: AtelierSpacing.xs,
  },
  limitWarningText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  usageProgressContainer: {
    gap: AtelierSpacing.xs,
  },
  usageProgressBarContainer: {
    height: 8,
    borderRadius: AtelierRadius.full,
    overflow: 'hidden',
  },
  usageProgressBarContainerWarning: {
  },
  usageProgressBar: {
    height: '100%',
    borderRadius: AtelierRadius.full,
  },
  usageProgressBarWarning: {
  },
  usageCountSecondary: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'right',
  },
  subscriptionHint: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: AtelierSpacing.lg,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
  },
  upgradeButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  upgradeValueStatement: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: AtelierSpacing.sm,
  },
  proConfirmation: {
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.lg,
    borderLeftWidth: 4,
  },
  proConfirmationText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
    borderWidth: 1.5,
  },
  manageButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AtelierSpacing.md,
    marginTop: AtelierSpacing.sm,
    gap: AtelierSpacing.xs,
  },
  viewDetailsText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 18,
  },
  languageRow: {
    flexDirection: 'column',
    gap: AtelierSpacing.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
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
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  diagnosticsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  diagnosticsCard: {
    borderRadius: AtelierRadius.md,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  diagnosticsTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 16,
  },
  diagnosticsBody: {
    gap: 12,
  },
  diagnosticsRow: {
    marginBottom: 12,
  },
  diagnosticsLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosticsValue: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  diagnosticsClose: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  diagnosticsCloseText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
  },
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
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  editModalTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 26,
  },
  editModalCloseBtn: {
    padding: 4,
  },
  editModalScroll: {
    maxHeight: 420,
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
  },
  editModalSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: AtelierSpacing.sm,
  },
  editModalLogoRow: {
    alignItems: 'center',
    marginBottom: AtelierSpacing.lg,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
    borderTopWidth: 1,
  },
  editModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: AtelierRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  editModalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: 14,
    borderRadius: AtelierRadius.md,
    ...(Platform.OS === 'ios' && {
      shadowColor: '#9C7A3E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  editModalSaveText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
});