/**
 * Shared color picker modal with HSV panel + hue slider + hex input.
 * Used in styles/materials (catalog item editor) and PDF customize.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';

function parseHex(hex: string): string | null {
  const s = hex.replace(/^#/, '').trim();
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return '#' + s;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[0]! + s[0];
    const g = s[1]! + s[1];
    const b = s[2]! + s[2];
    return '#' + r + g + b;
  }
  return null;
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 1, v: 1 };
  const r = parseInt(result[1]!, 16) / 255;
  const g = parseInt(result[2]!, 16) / 255;
  const b = parseInt(result[3]!, 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export interface ColorPickerModalProps {
  visible: boolean;
  initialColor: string;
  title: string;
  onClose: () => void;
  onSelect: (hex: string) => void;
  /** Show "None" button and allow onSelect('') */
  allowNone?: boolean;
  applyLabel?: string;
  cancelLabel?: string;
  noneLabel?: string;
  hexPlaceholder?: string;
}

export function ColorPickerModal({
  visible,
  initialColor,
  title,
  onClose,
  onSelect,
  allowNone = false,
  applyLabel,
  cancelLabel,
  noneLabel,
  hexPlaceholder = '#000000',
}: ColorPickerModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [hex, setHex] = useState(initialColor || '#ff0000');
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const panelSizeRef = useRef({ width: 260, height: 180 });
  const hueSliderWidthRef = useRef(260);

  useEffect(() => {
    if (!visible) return;
    const initial = initialColor && parseHex(initialColor) ? initialColor : '#ff0000';
    setHex(initial);
    const hsv = hexToHsv(initial);
    setHue(hsv.h);
    setSaturation(hsv.s);
    setBrightness(hsv.v);
  }, [visible, initialColor]);

  const handleApply = () => {
    const parsed = parseHex(hex);
    if (parsed) {
      onSelect(parsed);
    }
    onClose();
  };

  const handleNone = () => {
    onSelect('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.overlayModal }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoid}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

            <View
              style={styles.panel}
              onLayout={(e: LayoutChangeEvent) => {
                panelSizeRef.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const { locationX, locationY } = e.nativeEvent;
                const { width, height } = panelSizeRef.current;
                const s = Math.max(0, Math.min(1, locationX / width));
                const v = Math.max(0, Math.min(1, 1 - locationY / height));
                setSaturation(s);
                setBrightness(v);
                setHex(hsvToHex(hue, s, v));
              }}
              onResponderMove={(e) => {
                const { locationX, locationY } = e.nativeEvent;
                const { width, height } = panelSizeRef.current;
                const s = Math.max(0, Math.min(1, locationX / width));
                const v = Math.max(0, Math.min(1, 1 - locationY / height));
                setSaturation(s);
                setBrightness(v);
                setHex(hsvToHex(hue, s, v));
              }}
            >
              <LinearGradient
                colors={['#fff', hsvToHex(hue, 1, 1)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['transparent', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.thumb,
                  {
                    left: saturation * panelSizeRef.current.width - 10,
                    top: (1 - brightness) * panelSizeRef.current.height - 10,
                    borderColor: colors.textInverse,
                  },
                ]}
                pointerEvents="none"
              />
            </View>

            <View
              style={styles.hueSlider}
              onLayout={(e: LayoutChangeEvent) => {
                hueSliderWidthRef.current = e.nativeEvent.layout.width;
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const w = hueSliderWidthRef.current;
                const h = Math.max(0, Math.min(360, (e.nativeEvent.locationX / w) * 360));
                setHue(h);
                setHex(hsvToHex(h, saturation, brightness));
              }}
              onResponderMove={(e) => {
                const w = hueSliderWidthRef.current;
                const h = Math.max(0, Math.min(360, (e.nativeEvent.locationX / w) * 360));
                setHue(h);
                setHex(hsvToHex(h, saturation, brightness));
              }}
            >
              <LinearGradient
                colors={['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.md }]}
              />
              <View
                style={[
                  styles.hueThumb,
                  { left: (hue / 360) * hueSliderWidthRef.current - 8, borderColor: colors.textInverse },
                ]}
                pointerEvents="none"
              />
            </View>

            <View style={styles.hexRow}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: parseHex(hex) || '#000', borderColor: colors.border },
                ]}
              />
              <Input
                value={hex}
                onChangeText={(text) => {
                  setHex(text);
                  const parsed = parseHex(text);
                  if (parsed) {
                    const hsv = hexToHsv(parsed);
                    setHue(hsv.h);
                    setSaturation(hsv.s);
                    setBrightness(hsv.v);
                  }
                }}
                placeholder={hexPlaceholder}
                containerStyle={styles.input}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.actions}>
              {allowNone && (
                <Button
                  variant="ghost"
                  onPress={handleNone}
                  style={styles.noneBtn}
                >
                  {noneLabel ?? t('common.none')}
                </Button>
              )}
              <Button
                variant="secondary"
                onPress={onClose}
                style={styles.cancelBtn}
              >
                {cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={handleApply}
                style={styles.doneBtn}
              >
                {applyLabel ?? t('common.apply')}
              </Button>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    maxWidth: 300,
    width: '100%',
    alignSelf: 'center',
    ...Shadows.lg,
  },
  title: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  panel: {
    height: 180,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    }),
  },
  hueSlider: {
    height: 28,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  hueThumb: {
    position: 'absolute',
    top: 0,
    width: 16,
    height: 28,
    borderRadius: 4,
    borderWidth: 3,
    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    }),
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginTop: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'flex-end',
  },
  noneBtn: {
    marginRight: 'auto',
  },
  cancelBtn: {
    minWidth: 90,
  },
  doneBtn: {
    minWidth: 90,
  },
});
