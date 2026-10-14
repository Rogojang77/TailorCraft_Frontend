import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { WebView } from 'react-native-webview';
import { AlertCircle } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Loader } from '@/components/ui/Loader';
import { ErrorText } from '@/components/ui/ErrorText';
import { Button } from '@/components/ui/Button';
import { AtelierSpacing } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { TERMS_URL, PRIVACY_POLICY_URL } from '@/constants/legal';

type DocType = 'terms' | 'privacy';

export default function LegalDocumentScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ type?: string; url?: string; title?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let uri: string;
  let title: string;

  const type = params.type as DocType | undefined;
  if (type === 'terms') {
    uri = TERMS_URL;
    title = params.title ?? t('legalDocument.terms');
  } else if (type === 'privacy') {
    uri = PRIVACY_POLICY_URL;
    title = params.title ?? t('legalDocument.privacy');
  } else if (params.url) {
    uri = params.url;
    title = params.title ?? t('legalDocument.document');
  } else {
    uri = '';
    title = t('legalDocument.document');
  }

  if (!uri) {
    return (
      <ScreenContainer noPadding>
        <Header title={title} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.ember ?? colors.error} />
          <ErrorText>{t('legalDocument.noUrl')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <Header title={title} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} titleNumberOfLines={1} />

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.paper ?? colors.background }]}>
          <Loader message={t('legalDocument.loading')} />
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.ember ?? colors.error} />
          <ErrorText>{error}</ErrorText>
          <Button variant="primary" onPress={() => { setError(null); setLoading(true); }} style={styles.retryButton}>
            {t('legalDocument.retry')}
          </Button>
        </View>
      ) : (
        <WebView
          source={{ uri }}
          style={[styles.webview, { backgroundColor: colors.card }]}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            setError(e.nativeEvent.description || t('legalDocument.loadError'));
          }}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 400) {
              setLoading(false);
              setError(t('legalDocument.loadErrorStatus', { status: e.nativeEvent.statusCode }));
            }
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 80,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.xl,
  },
  retryButton: {
    marginTop: AtelierSpacing.lg,
  },
});
