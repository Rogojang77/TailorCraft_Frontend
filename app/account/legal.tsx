import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import * as WebBrowser from 'expo-web-browser';
import { FileText, Shield, ChevronRight } from 'lucide-react-native';
import { Header } from '@/components/layout/Header';
import { Colors, Spacing, Typography, Shadows } from '@/constants/design';
import { useI18n } from '@/lib/i18n';
import { LEGAL_LAST_UPDATED, TERMS_URL, PRIVACY_POLICY_URL } from '@/constants/legal';

export default function LegalScreen() {
  const { t } = useI18n();
  const router = useRouter();

  const openInBrowser = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(t('common.error'), t('legal.openError'));
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <ScreenContainer noPadding>
      <Header title={t('legal.title')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('legal.intro')}</Text>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.docRow}
            onPress={() => openInBrowser(TERMS_URL)}
            activeOpacity={0.7}
          >
            <View style={styles.docIcon}>
              <FileText size={24} color={Colors.primary} />
            </View>
            <View style={styles.docContent}>
              <Text style={styles.docTitle}>{t('legal.terms')}</Text>
              <Text style={styles.docSublabel}>
                {t('legal.lastUpdated')}: {formatDate(LEGAL_LAST_UPDATED.terms)}
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.docRow}
            onPress={() => openInBrowser(PRIVACY_POLICY_URL)}
            activeOpacity={0.7}
          >
            <View style={styles.docIcon}>
              <Shield size={24} color={Colors.primary} />
            </View>
            <View style={styles.docContent}>
              <Text style={styles.docTitle}>{t('legal.privacy')}</Text>
              <Text style={styles.docSublabel}>
                {t('legal.lastUpdated')}: {formatDate(LEGAL_LAST_UPDATED.privacyPolicy)}
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('legal.reviewAnytime')}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  intro: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.md,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  docContent: {
    flex: 1,
  },
  docTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  docSublabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
