import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Camera,
  Download,
  Settings,
  ChevronRight,
  Save,
  LogOut,
  Edit,
  X,
  BarChart3,
  Crown,
  ShoppingBag,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { api, apiFetch, uploadImage } from '@/lib/api';
import { formatDate, customerFullName } from '@/lib/api-mappers';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';
import { PaywallModal } from '@/components/PaywallModal';
import { ProBadge } from '@/components/ProBadge';

export default function ProfileTab() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { subscription, isLoading: subscriptionLoading, upgradeToPro, refreshSubscription } = useSubscription();
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
  const [isEditing, setIsEditing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const fetchCompany = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const settings = await apiFetch<{
        name: string;
        owner: string;
        phone: string;
        email: string;
        address: string | null;
        logoUrl: string | null;
      }>(api.settings.company);
      setCompanyData((prev) => ({
        ...prev,
        name: settings.name ?? '',
        owner: settings.owner ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        address: settings.address ?? '',
        logoUrl: settings.logoUrl ?? null,
      }));
    } catch {
      setCompanyData((prev) => ({ ...prev, name: '', owner: '', phone: '', email: '', address: '', logoUrl: null }));
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCompany();
    }, [fetchCompany])
  );

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permisiune necesară', 'Aplicația are nevoie de acces la galeria foto pentru a selecta logo-ul.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setCompanyData((prev) => ({ ...prev, logo: result.assets[0].uri }));
      }
    } catch {
      Alert.alert('Eroare', 'Nu s-a putut selecta imaginea. Încercați din nou.');
    }
  };

  const handleSave = async () => {
    try {
      // Upload logo if it's a local file
      let logoUrl = companyData.logoUrl;
      if (companyData.logo && !companyData.logo.startsWith('http')) {
        try {
          logoUrl = await uploadImage(companyData.logo);
        } catch (uploadError) {
          Alert.alert('Eroare', 'Nu s-a putut încărca logo-ul. Încercați din nou.');
          return;
        }
      }

      await apiFetch(api.settings.company, {
        method: 'PUT',
        body: JSON.stringify({
          name: companyData.name,
          owner: companyData.owner,
          phone: companyData.phone,
          email: companyData.email,
          address: companyData.address || undefined,
          logoUrl: logoUrl || undefined,
        }),
      });
      setIsEditing(false);
      // Update local state with the uploaded URL
      if (logoUrl) {
        setCompanyData((prev) => ({ ...prev, logo: null, logoUrl }));
      }
      Alert.alert('Succes', 'Datele firmei au fost salvate!');
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-au putut salva datele. Încercați din nou.');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Anulare modificări',
      'Sunteți sigur că doriți să anulați modificările? Toate modificările nesalvate vor fi pierdute.',
      [
        {
          text: 'Continuă editarea',
          style: 'cancel',
        },
        {
          text: 'Anulează',
          style: 'destructive',
          onPress: () => {
            fetchCompany(); // Reload original data
            setIsEditing(false);
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Deconectare',
      'Sunteți sigur că doriți să vă deconectați?',
      [
        {
          text: 'Anulează',
          style: 'cancel',
        },
        {
          text: 'Deconectează-te',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by auth state change
            } catch (error) {
              Alert.alert('Eroare', 'Nu s-a putut efectua deconectarea. Încercați din nou.');
            }
          },
        },
      ]
    );
  };

  const handleUpgradeClick = () => {
    setShowPaywall(true);
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const success = await upgradeToPro();
      if (success) {
        await refreshSubscription(true); // Force refresh to get latest data
        setShowPaywall(false);
        Alert.alert('Succes!', 'Contul tău a fost upgradeat la Pro. Acum poți gestiona clienți și comenzi nelimitate.');
      } else {
        Alert.alert('Eroare', 'Nu s-a putut efectua upgrade-ul. Te rugăm să încerci din nou.');
      }
    } catch (error) {
      Alert.alert('Eroare', error instanceof Error ? error.message : 'Nu s-a putut efectua upgrade-ul');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleExportClients = async () => {
    try {
      const [customersRes, ordersRes] = await Promise.all([
        apiFetch<{ customers: Array<{
          id: string;
          firstName: string;
          lastName: string;
          email: string | null;
          phone: string;
          createdAt: string;
        }> }>(`${api.customers()}?limit=500`),
        apiFetch<{ orders: Array<{
          customerId: string;
          totalAmount: number;
          orderDate: string;
        }> }>(`${api.orders()}?limit=1000`),
      ]);
      const customers = customersRes.customers ?? [];
      const orders = ordersRes.orders ?? [];
      const byCustomer: Record<string, { totalSpent: number; lastOrder: string }> = {};
      const orderCountByCustomer: Record<string, number> = {};
      for (const o of orders) {
        const prev = byCustomer[o.customerId];
        const spent = (prev?.totalSpent ?? 0) + o.totalAmount;
        const last = prev?.lastOrder
          ? (new Date(o.orderDate) > new Date(prev.lastOrder) ? o.orderDate : prev.lastOrder)
          : o.orderDate;
        byCustomer[o.customerId] = { totalSpent: spent, lastOrder: last };
        orderCountByCustomer[o.customerId] = (orderCountByCustomer[o.customerId] ?? 0) + 1;
      }
      const rows = customers.map((c) => {
        const agg = byCustomer[c.id];
        const totalOrders = orderCountByCustomer[c.id] ?? 0;
        return {
          name: customerFullName(c.firstName, c.lastName),
          phone: c.phone,
          email: c.email ?? '',
          totalOrders,
          totalSpent: agg?.totalSpent ?? 0,
          lastOrder: formatDate(agg?.lastOrder ?? null),
          registrationDate: formatDate(c.createdAt),
        };
      });
      const csvHeader = 'Nume,Telefon,Email,Total Comenzi,Valoare Totala (RON),Ultima Comanda,Data Inregistrare\n';
      const csvContent = rows
        .map((r) =>
          `"${r.name}","${r.phone}","${r.email}",${r.totalOrders},${r.totalSpent},"${r.lastOrder}","${r.registrationDate}"`
        )
        .join('\n');
      const csvData = csvHeader + csvContent;
      const fileName = `Clienti_Export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Date Clienți' });
      } else {
        Alert.alert('Succes', `Fișierul a fost salvat: ${fileName}`);
      }
    } catch (e) {
      Alert.alert('Eroare', e instanceof Error ? e.message : 'Nu s-a putut exporta lista de clienți. Încercați din nou.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Profil Firmă</Text>
          <ProBadge size="sm" style={{ marginLeft: 8 }} />
        </View>
        {!isEditing ? (
          <TouchableOpacity 
            style={styles.editButtonLarge} 
            onPress={() => setIsEditing(true)}
            activeOpacity={0.8}
          >
            <Edit size={16} color={Colors.textInverse} strokeWidth={2.5} />
            <Text style={styles.editButtonText}>Editează</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <X size={18} color={Colors.error} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Save size={18} color={Colors.textInverse} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {companyLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Se încarcă datele firmei...</Text>
          </View>
        ) : (
          <>
        {/* Edit Mode Banner */}
        {isEditing && (
          <View style={styles.editBanner}>
            <Edit size={18} color="#D4AF37" />
            <Text style={styles.editBannerText}>
              Modul de editare activat. Apasă pe câmpurile de mai jos pentru a le modifica.
            </Text>
          </View>
        )}

        {/* Company Logo */}
        {isEditing ? (
          <View style={[styles.section, styles.sectionEditing]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Logo Firmă</Text>
              <View style={styles.editingBadge}>
                <Text style={styles.editingBadgeText}>Editabil</Text>
              </View>
            </View>
            <View style={styles.logoWrapper}>
              <TouchableOpacity 
                style={styles.logoCard} 
                onPress={handleImagePicker}
                activeOpacity={0.8}
              >
                {(companyData.logo ?? companyData.logoUrl) ? (
                  <>
                    <View style={styles.logoImageContainer}>
                      <Image 
                        source={{ uri: companyData.logo ?? companyData.logoUrl! }} 
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
                      <Text style={styles.logoEditBadgeText}>Schimbă</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.logoPlaceholderModern}>
                    <View style={styles.logoPlaceholderIconContainer}>
                      <Camera size={40} color="#D4AF37" />
                    </View>
                    <Text style={styles.logoPlaceholderTitle}>Adaugă Logo</Text>
                    <Text style={styles.logoPlaceholderSubtitle}>Apasă pentru a selecta</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logo Firmă</Text>
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
                    <View style={styles.logoPlaceholderIconContainerReadOnly}>
                      <Camera size={36} color="#D1D5DB" />
                    </View>
                    <Text style={styles.logoPlaceholderTitleReadOnly}>Fără Logo</Text>
                    <Text style={styles.logoPlaceholderSubtitleReadOnly}>Activează editarea pentru a adăuga</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Company Information */}
        <View style={[styles.section, isEditing && styles.sectionEditing]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informații Firmă</Text>
            {isEditing && (
              <View style={styles.editingBadge}>
                <Text style={styles.editingBadgeText}>Editabil</Text>
              </View>
            )}
          </View>
          
          {isEditing ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nume Firmă</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditing]}>
                  <Building size={20} color="#D4AF37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={companyData.name}
                    onChangeText={(text) => setCompanyData((prev) => ({ ...prev, name: text }))}
                    placeholder="Numele firmei"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Proprietar</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditing]}>
                  <User size={20} color="#D4AF37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={companyData.owner}
                    onChangeText={(text) => setCompanyData((prev) => ({ ...prev, owner: text }))}
                    placeholder="Numele proprietarului"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Telefon</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditing]}>
                  <Phone size={20} color="#D4AF37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={companyData.phone}
                    onChangeText={(text) => setCompanyData((prev) => ({ ...prev, phone: text }))}
                    placeholder="+40 7XX XXX XXX"
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditing]}>
                  <Mail size={20} color="#D4AF37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={companyData.email}
                    onChangeText={(text) => setCompanyData((prev) => ({ ...prev, email: text }))}
                    placeholder="contact@firma.ro"
                    keyboardType="email-address"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adresă</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditing]}>
                  <MapPin size={20} color="#D4AF37" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={companyData.address}
                    onChangeText={(text) => setCompanyData((prev) => ({ ...prev, address: text }))}
                    placeholder="Adresa completă"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Building size={20} color="#6B7280" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nume Firmă</Text>
                  <Text style={styles.infoValue}>{companyData.name || '—'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <User size={20} color="#6B7280" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Proprietar</Text>
                  <Text style={styles.infoValue}>{companyData.owner || '—'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Phone size={20} color="#6B7280" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Telefon</Text>
                  <Text style={styles.infoValue}>{companyData.phone || '—'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Mail size={20} color="#6B7280" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{companyData.email || '—'}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, styles.infoRowLast]}>
                <MapPin size={20} color="#6B7280" style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Adresă</Text>
                  <Text style={styles.infoValue}>{companyData.address || '—'}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonament</Text>
          
          {subscriptionLoading ? (
            <View style={styles.subscriptionLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.subscriptionLoadingText}>Se încarcă...</Text>
            </View>
          ) : subscription ? (
            <>
              {/* Plan Badge */}
              <View style={[
                styles.planBadgeContainer,
                subscription.plan === 'PRO' && styles.planBadgeContainerPro
              ]}>
                {subscription.plan === 'PRO' && (
                  <Crown size={18} color={Colors.textInverse} strokeWidth={2.5} />
                )}
                <Text style={[
                  styles.planBadgeText,
                  subscription.plan === 'PRO' && styles.planBadgeTextPro
                ]}>
                  {subscription.plan === 'FREE' ? 'Plan Gratuit' : 'Plan Pro'}
                </Text>
              </View>

              {subscription.plan === 'FREE' ? (
                <>
                  {/* Usage Limits for FREE plan */}
                  <View style={styles.usageContainer}>
                    <View style={styles.usageRow}>
                      <View style={styles.usageInfo}>
                        <User size={18} color="#6B7280" />
                        <Text style={styles.usageLabel}>Clienți</Text>
                      </View>
                      <Text style={styles.usageValue}>
                        {subscription.usage.currentClients} / {subscription.limits.maxClients}
                      </Text>
                    </View>
                    <View style={styles.usageRow}>
                      <View style={styles.usageInfo}>
                        <ShoppingBag size={18} color="#6B7280" />
                        <Text style={styles.usageLabel}>Comenzi</Text>
                      </View>
                      <Text style={styles.usageValue}>
                        {subscription.usage.currentOrders} / {subscription.limits.maxOrders}
                      </Text>
                    </View>
                  </View>

                  {/* Upgrade Info */}
                  <Text style={styles.subscriptionHint}>
                    Plan gratuit: până la 5 clienți și 5 comenzi
                  </Text>

                  {/* Upgrade Button */}
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={handleUpgradeClick}
                    activeOpacity={0.8}
                  >
                    <Crown size={18} color={Colors.textInverse} strokeWidth={2.5} />
                    <Text style={styles.upgradeButtonText}>Upgrade la Pro</Text>
                  </TouchableOpacity>

                  {/* View Details Link */}
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewDetailsText}>Vezi Detalii Abonament</Text>
                    <ChevronRight size={16} color="#6B7280" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* PRO Plan Confirmation */}
                  <View style={styles.proConfirmation}>
                    <Text style={styles.proConfirmationText}>
                      Ești pe planul Pro cu acces nelimitat
                    </Text>
                  </View>

                  {/* Manage Subscription Button */}
                  <TouchableOpacity 
                    style={styles.manageButton}
                    onPress={() => router.push('/subscription')}
                    activeOpacity={0.7}
                  >
                    <Settings size={18} color="#9CA3AF" />
                    <Text style={styles.manageButtonText}>Gestionează Abonament</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <View style={styles.subscriptionError}>
              <Text style={styles.subscriptionErrorText}>
                Nu s-au putut încărca informațiile despre abonament
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => refreshSubscription(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Reîncearcă</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
          </>
        )}

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setări</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/stats')}
          >
            <View style={styles.menuItemLeft}>
              <BarChart3 size={20} color="#D4AF37" />
              <Text style={styles.menuItemText}>Statistici</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleExportClients}>
            <View style={styles.menuItemLeft}>
              <Download size={20} color="#D4AF37" />
              <Text style={styles.menuItemText}>Export Date Clienți</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* User Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cont Utilizator</Text>
          
          {user && (
            <View style={styles.userInfo}>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Email:</Text>
                <Text style={styles.userInfoValue}>{user.email}</Text>
              </View>
              <View style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>Rol:</Text>
                <Text style={styles.userInfoValue}>{user.role}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutButton]} 
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color="#EF4444" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Deconectare</Text>
            </View>
            <ChevronRight size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Despre Aplicație</Text>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>TailorCraft</Text>
            <Text style={styles.appVersion}>Versiunea 1.0.0</Text>
            <Text style={styles.appDescription}>
              Aplicația profesională pentru croitori, dezvoltată pentru gestionarea eficientă a comenzilor și măsurătorilor.
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
    </SafeAreaView>
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
    marginBottom: 16,
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
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
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  logoPlaceholderIconContainerReadOnly: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoPlaceholderTitleReadOnly: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  logoPlaceholderSubtitleReadOnly: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputWrapperEditing: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputDisabled: {
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoRowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
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
  userInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  userInfoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  logoutButton: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  usageLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  usageValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 16,
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
  },
  upgradeButtonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
    fontSize: 16,
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
});