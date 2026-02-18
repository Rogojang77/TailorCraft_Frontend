import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { OrderDraftProvider } from '@/contexts/OrderDraftContext';
import { DraftRestoredBanner } from '@/components/DraftRestoredBanner';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { TemplatesProvider } from '@/contexts/TemplatesContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { Colors } from '@/constants/design';

function GuardScreen() {
  return (
    <View style={styles.gate}>
      <FullScreenLoader />
    </View>
  );
}

function NewOrderGuard({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [hasClients, setHasClients] = useState(true);
  const redirectFiredRef = useRef(false);

  // Evaluate only: fetch and set state. No navigation or alerts here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ customers?: unknown[] }>(`${api.customers()}?limit=1`);
        const list = res.customers ?? [];
        if (cancelled) return;
        setChecked(true);
        if (list.length === 0) {
          setHasClients(false);
        }
      } catch {
        if (cancelled) return;
        setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // All redirects and alerts in a dedicated effect (side-effect safe). Run once.
  useEffect(() => {
    if (!checked || hasClients || redirectFiredRef.current) return;
    redirectFiredRef.current = true;
    router.replace('/clients/new');
    Alert.alert(
      t('newOrder.clientRequired'),
      t('newOrder.clientRequiredAlertMessage')
    );
  }, [checked, hasClients, router, t]);

  if (!checked) {
    return <GuardScreen />;
  }
  if (!hasClients) {
    return <GuardScreen />;
  }
  return <>{children}</>;
}

export default function NewOrderLayout() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderMode = params.orderId ? 'edit' : 'create';
  const orderIdToEdit = params.orderId ?? undefined;

  return (
    <OrderDraftProvider orderMode={orderMode} orderIdToEdit={orderIdToEdit}>
      <TemplatesProvider>
        <NewOrderGuard>
          <View style={styles.container}>
            <DraftRestoredBanner />
            <View style={styles.stackWrap}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="client-data" />
                <Stack.Screen name="measurements" />
                <Stack.Screen name="summary" />
              </Stack>
            </View>
          </View>
        </NewOrderGuard>
      </TemplatesProvider>
    </OrderDraftProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  stackWrap: {
    flex: 1,
  },
});