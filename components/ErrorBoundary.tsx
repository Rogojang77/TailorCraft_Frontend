/**
 * Error boundary to catch render errors and prevent a single screen crash from
 * taking down the whole app. Renders a themed fallback with "Try again" and optional "Go back".
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { getTypography, Spacing } from '@/constants/design';
import { Button } from '@/components/ui/Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback; receives error and reset callback. If not provided, default themed fallback is used. */
  fallbackRender?: (error: Error, reset: () => void) => ReactNode;
  /** Optional callback for "Go back" (e.g. router.back()). When provided, fallback shows a Go back button. */
  onGoBack?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { themeColors: ReturnType<typeof useTheme>['colors']; t: (key: string) => string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallbackRender, onGoBack, themeColors: colors, t } = this.props;

    if (hasError && error) {
      if (fallbackRender) {
        return fallbackRender(error, this.reset);
      }
      return (
        <DefaultErrorFallback
          error={error}
          onRetry={this.reset}
          onGoBack={onGoBack}
          colors={colors}
          t={t}
        />
      );
    }
    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  onGoBack?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  t: (key: string) => string;
}

function DefaultErrorFallback({ error, onRetry, onGoBack, colors, t }: DefaultErrorFallbackProps) {
  const typography = getTypography(colors);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[typography.bodyBold, styles.title, { color: colors.textPrimary }]}>{t('errorBoundary.title')}</Text>
      {typeof __DEV__ !== 'undefined' && __DEV__ && error.message ? (
        <Text style={[typography.caption, styles.message, { color: colors.textSecondary }]} numberOfLines={5}>
          {error.message}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button variant="primary" onPress={onRetry}>
          {t('errorBoundary.retry')}
        </Button>
        {onGoBack ? (
          <Button variant="secondary" onPress={onGoBack} style={styles.goBack}>
            {t('errorBoundary.goBack')}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

/** Wrapper that injects theme and i18n into the class boundary (hooks can't be used inside the class). */
export function ErrorBoundary({ children, fallbackRender, onGoBack }: ErrorBoundaryProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <ErrorBoundaryInner
      themeColors={colors}
      t={t}
      fallbackRender={fallbackRender}
      onGoBack={onGoBack}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 320,
  },
  actions: {
    gap: Spacing.md,
    alignSelf: 'stretch',
    maxWidth: 280,
  },
  goBack: {
    marginTop: Spacing.xs,
  },
});
