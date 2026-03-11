import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Check, ExternalLink } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing, BorderRadius } from '@/constants/design';

export interface ConsentCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  sublabel?: string;
  documentUrl?: string;
  onOpenDocument?: (url: string) => void;
  optional?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  linkText?: string;
}

const CHECKBOX_SIZE = 24;
const MIN_TAP_TARGET = 44;

export function ConsentCheckbox({
  checked,
  onToggle,
  label,
  sublabel,
  documentUrl,
  onOpenDocument,
  optional = false,
  disabled = false,
  accessibilityLabel,
  linkText,
}: ConsentCheckboxProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const displayLinkText = linkText ?? t('legal.viewDocument');
  
  const handlePress = () => {
    if (disabled) return;
    onToggle();
  };

  const handleOpenDocument = (e: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    if (documentUrl && onOpenDocument) {
      onOpenDocument(documentUrl);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={optional ? undefined : t('legal.requiredToContinue')}
    >
      <View style={[
        styles.checkbox, 
        { borderColor: colors.border, backgroundColor: colors.surface },
        checked && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]}>
        {checked && <Check size={14} color={colors.textInverse} strokeWidth={3} />}
      </View>
      <View style={styles.labelWrap}>
        <Text style={[typography.body, { color: colors.textPrimary }]}>
          {label}
          {optional && (
            <Text style={{ color: colors.textSecondary, fontWeight: '400' }}> ({t('common.optional')})</Text>
          )}
        </Text>
        {sublabel ? (
          <Text style={[typography.caption, { color: colors.textSecondary }, styles.sublabel]}>{sublabel}</Text>
        ) : null}
        {documentUrl && onOpenDocument ? (
          <TouchableOpacity
            onPress={handleOpenDocument}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={styles.linkWrap}
            accessibilityRole="link"
            accessibilityLabel={t('legal.openDocument')}
          >
            <ExternalLink size={14} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{displayLinkText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: MIN_TAP_TARGET,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    minWidth: CHECKBOX_SIZE,
    minHeight: CHECKBOX_SIZE,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    marginRight: Spacing.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelWrap: {
    flex: 1,
  },
  sublabel: {
    marginTop: 2,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
});
