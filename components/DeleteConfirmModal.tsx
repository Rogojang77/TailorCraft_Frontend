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
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export interface DeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
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
  const { colors } = useTheme();
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

  const emberColor = colors.ember ?? colors.error;

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
          <View
            style={[
              styles.overlay,
              { backgroundColor: Platform.OS === 'web' ? 'rgba(27,22,17,0.5)' : 'transparent' },
            ]}
          >
            {Platform.OS !== 'web' && (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )}
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.centered} pointerEvents="box-none">
          <Animated.View
            style={[styles.card, { backgroundColor: colors.card }, AtelierShadow.elevated]}
            entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
            exiting={modalExiting}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconRing, { backgroundColor: emberColor + '1F' }]}>
                <Trash2 size={28} color={emberColor} strokeWidth={2.5} />
              </View>
              <Button
                variant="ghost"
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel={resolvedCancelLabel}
              >
                <X size={22} color={colors.ink3} />
              </Button>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{resolvedTitle}</Text>
              <Text style={[styles.message, { color: colors.ink3 }]}>{resolvedMessage}</Text>
              {errorMessage ? (
                <Text style={[styles.errorMessage, { color: emberColor }]}>{errorMessage}</Text>
              ) : null}
              <View style={styles.actions}>
                <Button variant="secondary" onPress={onClose} disabled={loading} style={styles.cancelBtn}>
                  {resolvedCancelLabel}
                </Button>
                <Button
                  variant="danger"
                  onPress={handleConfirm}
                  disabled={loading}
                  loading={loading}
                  leftIcon={<Trash2 size={18} color={colors.paper ?? '#EFE9DC'} strokeWidth={2.5} />}
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
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  centered: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    maxHeight: '90%',
    borderRadius: AtelierRadius.lg,
  },
  cardInner: {
    padding: AtelierSpacing.lg,
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: AtelierSpacing.md,
    right: AtelierSpacing.md,
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: AtelierSpacing.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AtelierSpacing.lg,
  },
  errorMessage: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: AtelierSpacing.md,
    width: '100%',
    marginTop: AtelierSpacing.lg,
  },
  cancelBtn: { flex: 1 },
  deleteBtn: { flex: 1 },
});
