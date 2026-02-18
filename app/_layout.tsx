import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { ConsentProvider } from '@/contexts/ConsentContext';
import { I18nProvider } from '@/lib/i18n';

// Keyboard architecture: KeyboardProvider wraps the entire navigation tree so that
// react-native-keyboard-controller can drive native keyboard animations and insets.
// This replaces KeyboardAvoidingView at root, eliminating Android resize hacks and
// giving smooth iOS keyboard animation without layout jumps.

// --- Route access rules (single source of truth) ---

type Segment = string;

interface RouteRule {
  /** Route is only valid when user is authenticated. */
  requiresAuth?: boolean;
  /** Route is valid when user is unauthenticated (e.g. login, signup). */
  allowUnauthenticated?: boolean;
  /** Verification screens handle their own navigation; guard must not redirect away. */
  isVerification?: boolean;
  /** Route is accessible by both authenticated and unauthenticated users (e.g. legal docs). */
  isPublic?: boolean;
}

const ROUTE_RULES: Record<Segment, RouteRule> = {
  'login': { allowUnauthenticated: true },
  'signup': { allowUnauthenticated: true },
  'legal-document': { isPublic: true },
  'verify-email': { isVerification: true },
  '(tabs)': { requiresAuth: true },
  'client-details': { requiresAuth: true },
  'clients': { requiresAuth: true },
  'new-order': { requiresAuth: true },
  'order-details': { requiresAuth: true },
  'garments': { requiresAuth: true },
  'subscription': { requiresAuth: true },
  'pdf-customize': { requiresAuth: true },
  'legacy': {}, // Hard-disabled: redirect below
  '+not-found': {},
};

const DEFAULT_RULE: RouteRule = { requiresAuth: true };

type RedirectTarget = '/login' | '/(tabs)';

/**
 * Single redirect decision from current navigation state.
 * Returns the route to redirect to, or null if no redirect.
 * Verification routes are excluded; deep-link destinations (e.g. subscription) are not overridden.
 */
function resolveRedirect(
  firstSegment: Segment | undefined,
  isAuthenticated: boolean,
  isLoading: boolean
): RedirectTarget | null {
  if (isLoading) return null;

  const segment = firstSegment ?? '';
  const rule = ROUTE_RULES[segment] ?? DEFAULT_RULE;

  // Not-found: always redirect to a valid destination
  if (segment === '+not-found') {
    return isAuthenticated ? '/(tabs)' : '/login';
  }

  // Legacy routes: hard-disabled; redirect to app
  if (segment === 'legacy') {
    return isAuthenticated ? '/(tabs)' : '/login';
  }

  // Verification: never redirect away; screen handles its own flow
  if (rule.isVerification) {
    return null;
  }

  // Public routes: accessible by anyone
  if (rule.isPublic) {
    return null;
  }

  if (!isAuthenticated) {
    return rule.allowUnauthenticated ? null : '/login';
  }

  // Authenticated
  if (rule.allowUnauthenticated) {
    return '/(tabs)';
  }

  return null;
}

// Deep link handling: no Stripe redirects; subscription is native IAP only.
// Optional: handle other deep links here (e.g. app-open, unknown).

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useFrameworkReady();

  useEffect(() => {
    const firstSegment = segments[0] as Segment | undefined;
    const target = resolveRedirect(firstSegment, isAuthenticated, isLoading);
    if (target !== null) {
      router.replace(target);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <>
        <FullScreenLoader />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <ConsentProvider>
        <SafeAreaProvider>
          <KeyboardProvider>
            <View style={styles.mainContainer}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="signup" />
                <Stack.Screen name="legal-document" />
                <Stack.Screen name="verify-email" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="client-details" />
                <Stack.Screen name="clients" />
                <Stack.Screen name="new-order" />
                <Stack.Screen name="order-details" />
                <Stack.Screen name="garments" />
                <Stack.Screen name="account" />
                <Stack.Screen name="subscription" />
                <Stack.Screen name="pdf-customize" />
              </Stack>
            </View>
          </KeyboardProvider>
        </SafeAreaProvider>
      </ConsentProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <I18nProvider>
        <SubscriptionProvider>
          <PremiumProvider>
            <RootLayoutNav />
          </PremiumProvider>
        </SubscriptionProvider>
      </I18nProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
});
