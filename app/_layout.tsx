import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider as NavigationThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from '@expo-google-fonts/geist-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFrameworkReady } from '@/hooks';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AnimatedSplashScreen } from '@/components/AnimatedSplashScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AddPasswordModal } from '@/components/AddPasswordModal';
import { CompanyDetailsRequiredModal } from '@/components/CompanyDetailsRequiredModal';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ConsentProvider } from '@/contexts/ConsentContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { PageTitleProvider } from '@/contexts/PageTitleContext';
import { I18nProvider } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { KeyboardAccessoryProvider } from '@/contexts/KeyboardAccessoryContext';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { InboxUnreadProvider } from '@/contexts/InboxUnreadContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { OfflineBanner } from '@/components/OfflineBanner';
import { hasSeenTutorial } from '@/lib/tutorial';
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
  'forgot-password': { allowUnauthenticated: true },
  'reset-password': { isVerification: true },
  'legal-document': { isPublic: true },
  'verify-email': { isVerification: true },
  '(tabs)': { requiresAuth: true },
  'client-details': { requiresAuth: true },
  'clients': { requiresAuth: true },
  'new-order': { requiresAuth: true },
  'order-details': { requiresAuth: true },
  'garments': { requiresAuth: true },
  'subscription': { requiresAuth: true },
  'settings': { requiresAuth: true },
  'notifications': { requiresAuth: true },
  'tutorial': { requiresAuth: true },
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
  const {
    isAuthenticated,
    isLoading,
    accessToken,
    isBiometricLocked,
    needsCompanyDetails,
    needsPassword,
    clearNeedsCompanyDetails,
    clearNeedsPassword,
    loginWithBiometric,
    user,
  } = useAuth();
  const { t } = useI18n();
  usePushNotifications(isAuthenticated && !isLoading, accessToken);
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const hasAutoPromptedBiometricRef = useRef(false);

  useFrameworkReady();

  // useSegments returns an unstable array reference (new array every render).
  // Using segments directly in deps causes the effect to run on every render,
  // triggering rapid router.replace() calls and navigation races that can
  // lead to "Rendered fewer hooks than expected". Use a stable string key.
  const segmentsKey = (segments as string[] | undefined)?.join?.('/') ?? '';
  useEffect(() => {
    const firstSegment = segments[0] as Segment | undefined;
    const target = resolveRedirect(firstSegment, isAuthenticated, isLoading);
    if (target !== null) {
      router.replace(target);
    }
  }, [isAuthenticated, isLoading, segmentsKey, router]);

  // First-run tutorial: open once per user, after login gates (password, company details) are done.
  const tutorialCheckedForRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !isAuthenticated || isLoading || isBiometricLocked || needsPassword || needsCompanyDetails) return;
    if (segments[0] !== '(tabs)' || tutorialCheckedForRef.current === userId) return;
    tutorialCheckedForRef.current = userId;
    void hasSeenTutorial(userId).then((seen) => {
      if (!seen) router.push('/tutorial');
    });
  }, [user?.id, isAuthenticated, isLoading, isBiometricLocked, needsPassword, needsCompanyDetails, segmentsKey, router]);

  useEffect(() => {
    if (!isBiometricLocked) {
      hasAutoPromptedBiometricRef.current = false;
      return;
    }
    if (hasAutoPromptedBiometricRef.current || isUnlocking) return;
    hasAutoPromptedBiometricRef.current = true;
    void handleBiometricUnlock();
  }, [isBiometricLocked, isUnlocking]);

  const handleBiometricUnlock = async () => {
    setIsUnlocking(true);
    try {
      const result = await loginWithBiometric({
        promptMessage: t('auth.biometric.promptMessage'),
      });
      if (!result.success && result.reason === 'session_expired') {
        router.replace('/login');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <AnimatedSplashScreen isReady={!isLoading}>
      <NavigationThemeProvider value={navigationTheme}>
        <ConsentProvider>
          <CompanyProvider>
            <PageTitleProvider>
              <SafeAreaProvider>
                <KeyboardProvider>
                  <KeyboardAccessoryProvider>
                    <ErrorBoundary onGoBack={() => router.back()}>
                      <InboxUnreadProvider>
                        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
                        {isAuthenticated && !isBiometricLocked && needsPassword && (
                          <AddPasswordModal
                            visible={true}
                            onComplete={() => {}}
                            clearNeedsPassword={clearNeedsPassword}
                          />
                        )}
                        {isAuthenticated && !isBiometricLocked && needsCompanyDetails && !needsPassword && (
                          <CompanyDetailsRequiredModal
                            visible={true}
                            onComplete={() => {}}
                            clearNeedsCompanyDetails={clearNeedsCompanyDetails}
                          />
                        )}
                        {isAuthenticated && !isBiometricLocked && !needsCompanyDetails && <GlobalHeader />}
                        <OfflineBanner />
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="login" />
                          <Stack.Screen name="signup" />
                          <Stack.Screen name="forgot-password" />
                          <Stack.Screen name="reset-password" />
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
                          <Stack.Screen name="settings" />
                          <Stack.Screen name="notifications" />
                          <Stack.Screen name="tutorial" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
                        </Stack>
                        {isAuthenticated && isBiometricLocked && (
                          <View style={[styles.biometricLockOverlay, { backgroundColor: colors.background }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                          </View>
                        )}
                        </View>
                      </InboxUnreadProvider>
                    </ErrorBoundary>
                    <StatusBar style={isDark ? 'light' : 'dark'} />
                  </KeyboardAccessoryProvider>
                </KeyboardProvider>
              </SafeAreaProvider>
            </PageTitleProvider>
          </CompanyProvider>
        </ConsentProvider>
      </NavigationThemeProvider>
    </AnimatedSplashScreen>
  );
}

export default function RootLayout() {
  useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
  });

  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <SettingsProvider>
            <SubscriptionProvider>
              <NetworkProvider>
                <RootLayoutNav />
              </NetworkProvider>
            </SubscriptionProvider>
          </SettingsProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  biometricLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
