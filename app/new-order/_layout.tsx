import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { OrderDraftProvider } from '@/contexts/OrderDraftContext';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { TemplatesProvider } from '@/contexts/TemplatesContext';
import { api, apiFetch } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

function GuardScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.gate, { backgroundColor: colors.paper ?? colors.background }]}>
      <ListSkeletonLoader variant="card" count={4} />
    </View>
  );
}

function NewOrderGuard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
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

  // When no clients, show dedicated "add client first" screen instead of redirect + alert.
  useEffect(() => {
    if (!checked || hasClients || redirectFiredRef.current) return;
    redirectFiredRef.current = true;
    router.replace('/new-order/no-clients');
  }, [checked, hasClients, router]);

  const showGate = !checked || !hasClients;
  return (
    <>
      {children}
      {showGate && (
        <View style={[StyleSheet.absoluteFillObject, styles.gateOverlay, { backgroundColor: colors.paper ?? colors.background }]}>
          <GuardScreen />
        </View>
      )}
    </>
  );
}

/**
 * New order flow: primary path is index → client-data (when no client) → index (garment selection) → measurements → summary.
 * The "create" screen is an alternate single-screen flow; it redirects to index so one path is used.
 */
export default function NewOrderLayout() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderMode = params.orderId ? 'edit' : 'create';
  const orderIdToEdit = params.orderId ?? undefined;

  return (
    <OrderDraftProvider orderMode={orderMode} orderIdToEdit={orderIdToEdit}>
      <TemplatesProvider>
        <NewOrderGuard>
          <View style={styles.container}>
            <View style={styles.stackWrap}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="no-clients" />
                <Stack.Screen name="create" />
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
  },
  gateOverlay: {
    zIndex: 1000,
  },
  container: {
    flex: 1,
  },
  stackWrap: {
    flex: 1,
  },
});