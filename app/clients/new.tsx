import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Phone } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PaywallModal } from '@/components/PaywallModal';
import { api, apiFetch, getErrorMessage, ApiErrorCode } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { customerFullName } from '@/lib/api-mappers';
import { Colors, Spacing, Typography, HeaderStyles } from '@/constants/design';

interface NewCustomerResponse {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
}

export default function NewClientScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { upgradeToPro, checkCanCreateClient, getLimitMessages } = useSubscription();

  const canCreateClient = checkCanCreateClient();
  const limitMsgs = getLimitMessages();
  const isValid = firstName.trim() && lastName.trim() && phone.trim();

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
        <View style={styles.header}>
          <Button variant="back" onPress={() => router.back()} accessibilityLabel={t('common.back')}>
            <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
          </Button>
          <Text style={styles.title}>{t('clients.new.pageTitle')}</Text>
          <View style={styles.placeholder} />
        </View>

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
                  placeholder={t('clients.new.firstNamePlaceholder')}
                  leftIcon={<User size={20} color={Colors.textSecondary} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.firstNameLabel')}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('clients.new.lastNamePlaceholder')}
                  leftIcon={<User size={20} color={Colors.textSecondary} />}
                  containerStyle={styles.inputGroup}
                />
                <Input
                  label={t('newOrder.client.phoneLabel')}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('clients.new.phonePlaceholder')}
                  keyboardType="phone-pad"
                  leftIcon={<Phone size={20} color={Colors.textSecondary} />}
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
                  leftIcon={<User size={20} color={Colors.textSecondary} />}
                  containerStyle={styles.inputGroup}
                />
            </View>
          </KeyboardAwareScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
              {!canCreateClient && (
                <Text style={styles.limitMessage}>{limitMsgs.clientLimitReached}</Text>
              )}
              <Button
                variant="primary"
                fullWidth
                onPress={handleCreate}
                disabled={!isValid || loading || !canCreateClient}
                loading={loading}
                style={styles.createButton}
              >
                Adaugă Client
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
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createButton: {
    marginTop: 0,
  },
  limitMessage: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
