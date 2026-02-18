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
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/design';

export interface ConsentCheckboxProps {
  /** Whether the checkbox is checked. */
  checked: boolean;
  /** Called when the user taps the checkbox area. */
  onToggle: () => void;
  /** Label text (e.g. "I have read and agree to the Terms & Conditions"). */
  label: string;
  /** Optional: "Last updated" or version text shown below the label. */
  sublabel?: string;
  /** If provided, tapping the link text opens the document. The whole row still toggles the checkbox. */
  documentUrl?: string;
  /** Called when user wants to open the document (e.g. to open WebView). */
  onOpenDocument?: (url: string) => void;
  /** Whether this consent is optional (e.g. marketing). */
  optional?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Accessibility label. */
  accessibilityLabel?: string;
  /** Link text for opening document (default: "View document"). */
  linkText?: string;
}

const CHECKBOX_SIZE = 24;
const MIN_TAP_TARGET = 44;

/**
 * Store-safe consent checkbox. Plain language, no pre-check, no dark patterns.
 * Minimum 44x44 tap target for the row. Checkbox + label are both tappable.
 */
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
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={14} color={Colors.textInverse} strokeWidth={3} />}
      </View>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>
          {label}
          {optional && (
            <Text style={styles.optional}> ({t('common.optional')})</Text>
          )}
        </Text>
        {sublabel ? (
          <Text style={styles.sublabel}>{sublabel}</Text>
        ) : null}
        {documentUrl && onOpenDocument ? (
          <TouchableOpacity
            onPress={handleOpenDocument}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            style={styles.linkWrap}
            accessibilityRole="link"
            accessibilityLabel={t('legal.openDocument')}
          >
            <ExternalLink size={14} color={Colors.primary} />
            <Text style={styles.linkText}>{displayLinkText}</Text>
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  optional: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  sublabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  linkText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
