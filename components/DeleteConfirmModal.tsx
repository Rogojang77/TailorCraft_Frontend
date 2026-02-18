import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import {
  modalEntering,
  modalEnteringReducedMotion,
  modalExiting,
} from '@/constants/modalAnimation';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Trash2, X } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400); // 16px padding on each side

export interface DeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  /** Optional inline error (e.g. 409 conflict). Shown below message. */
  errorMessage?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export function DeleteConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  errorMessage = null,
  confirmLabel,
  cancelLabel,
  loading = false,
}: DeleteConfirmModalProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('common.delete');
  const resolvedMessage = message ?? t('modals.delete.cannotUndo');
  const resolvedConfirmLabel = confirmLabel ?? t('common.delete');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await onConfirm();
  };

  const reduceMotion = useReducedMotion();
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            {Platform.OS !== 'web' && (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.centered} pointerEvents="box-none">
          <Animated.View
            style={styles.card}
            entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
            exiting={modalExiting}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconRing}>
                <Trash2 size={28} color={Colors.danger} strokeWidth={2.5} />
              </View>
              <Button
                variant="ghost"
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel={resolvedCancelLabel}
              >
                <X size={22} color={Colors.textSecondary} />
              </Button>
              <Text style={styles.title}>{resolvedTitle}</Text>
              <Text style={styles.message}>{resolvedMessage}</Text>
              {errorMessage ? (
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  variant="secondary"
                  onPress={onClose}
                  disabled={loading}
                  style={styles.cancelBtn}
                >
                  {resolvedCancelLabel}
                </Button>
                <Button
                  variant="danger"
                  onPress={handleConfirm}
                  disabled={loading}
                  loading={loading}
                  leftIcon={<Trash2 size={18} color={Colors.textInverse} strokeWidth={2.5} />}
                  style={styles.deleteBtn}
                >
                  {resolvedConfirmLabel}
                </Button>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'web' ? Colors.overlayModal : 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'flex-end', // Primary action pinned at bottom
    alignItems: 'center',
    paddingHorizontal: Spacing.md, // 16px screen horizontal padding
    paddingBottom: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadows.xl,
  },
  cardInner: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 44, // Minimum 44x44px for accessibility
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.h3, // 20px / SemiBold
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...Typography.body, // 16px
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  errorMessage: {
    ...Typography.caption, // 14px
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginTop: Spacing.lg, // Pin actions at bottom
  },
  cancelBtn: {
    flex: 1,
  },
  deleteBtn: {
    flex: 1,
  },
});
