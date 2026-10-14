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
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierShadow } from '@/constants/atelierDesign';
import { useI18n } from '@/lib/i18n';
import { LEGAL_LAST_UPDATED, TERMS_URL, PRIVACY_POLICY_URL } from '@/constants/legal';

export default function LegalScreen() {
  const { colors } = useTheme();
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{t('legal.intro')}</Text>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.docRow, { borderBottomColor: colors.border }]}
            onPress={() => openInBrowser(TERMS_URL)}
            activeOpacity={0.7}
          >
            <View style={[styles.docIcon, { backgroundColor: (colors.brassPale ?? colors.brass) + '40' }]}>
              <FileText size={24} color={colors.primary} />
            </View>
            <View style={styles.docContent}>
              <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{t('legal.terms')}</Text>
              <Text style={[styles.docSublabel, { color: colors.textSecondary }]}>
                {t('legal.lastUpdated')}: {formatDate(LEGAL_LAST_UPDATED.terms)}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.docRow, { borderBottomColor: colors.border }]}
            onPress={() => openInBrowser(PRIVACY_POLICY_URL)}
            activeOpacity={0.7}
          >
            <View style={[styles.docIcon, { backgroundColor: (colors.brassPale ?? colors.brass) + '40' }]}>
              <Shield size={24} color={colors.primary} />
            </View>
            <View style={styles.docContent}>
              <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{t('legal.privacy')}</Text>
              <Text style={[styles.docSublabel, { color: colors.textSecondary }]}>
                {t('legal.lastUpdated')}: {formatDate(LEGAL_LAST_UPDATED.privacyPolicy)}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('legal.reviewAnytime')}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: AtelierSpacing.md,
  },
  intro: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.lg,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    ...AtelierShadow.elevated,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AtelierSpacing.md,
    borderBottomWidth: 1,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AtelierSpacing.md,
  },
  docContent: {
    flex: 1,
  },
  docTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  docSublabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  footer: {
    marginTop: AtelierSpacing.xl,
    padding: AtelierSpacing.md,
  },
  footerText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
