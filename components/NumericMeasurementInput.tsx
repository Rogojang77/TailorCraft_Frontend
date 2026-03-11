/**
 * Numeric measurement input with increment/decrement stepper and sign controls.
 * Uses decimal-pad keyboard (no letters/symbols). Sign (−/+) and stepper (▲/▼)
 * live in an accessory bar above the keyboard:
 * - iOS: InputAccessoryView (native).
 * - Android: @flyerhq/react-native-keyboard-accessory-view via KeyboardAwareScrollViewWithAccessory.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  TextInput,
  Platform,
  InputAccessoryView,
} from 'react-native';
import { Input } from '@/components/ui/Input';
import { toNumericMeasurementValue } from '@/lib/measurement';
import type { MeasurementValue } from '@/types/measurement';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { BorderRadius, DENSITY, Spacing } from '@/constants/design';
import { useKeyboardAccessoryOptional } from '@/contexts/KeyboardAccessoryContext';

const _compact = DENSITY === 'compact';
const INITIAL_REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

function roundToStepPrecision(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  if (min !== undefined && Number.isFinite(min) && value < min) return min;
  if (max !== undefined && Number.isFinite(max) && value > max) return max;
  return value;
}

function stepValue(
  current: number | undefined,
  direction: 1 | -1,
  step: number,
  min: number | undefined,
  max: number | undefined
): number {
  const base = current !== undefined && Number.isFinite(current) ? current : (direction === 1 ? (min ?? 0) : (max ?? 0));
  const next = roundToStepPrecision(base + direction * step, step);
  return clamp(next, min, max);
}

export interface NumericMeasurementInputProps {
  value: string;
  onChange: (value: MeasurementValue) => void;
  placeholder?: string;
  editable?: boolean;
  step?: number;
  min?: number;
  max?: number;
  containerStyle?: ViewStyle;
}

export function NumericMeasurementInput({
  value,
  onChange,
  placeholder,
  editable = true,
  step = 0.5,
  min,
  max,
  containerStyle,
}: NumericMeasurementInputProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const inputRef = useRef<TextInput>(null);
  const [pressedButton, setPressedButton] = useState<'up' | 'down' | null>(null);
  const [focused, setFocused] = useState(false);
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusedRef = useRef(false);
  const accessoryApi = useKeyboardAccessoryOptional();

  const accessoryId = useId().replace(/:/g, '-');
  const inputAccessoryViewID = Platform.OS === 'ios' ? accessoryId : undefined;

  focusedRef.current = focused;

  const applyStep = useCallback(
    (direction: 1 | -1) => {
      const raw = toNumericMeasurementValue(value);
      const next = stepValue(raw, direction, step, min, max);
      onChange(next);
    },
    [value, step, min, max, onChange]
  );

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      applyStep(direction);
      initialTimeoutRef.current = setTimeout(() => {
        initialTimeoutRef.current = null;
        repeatTimerRef.current = setInterval(() => applyStep(direction), REPEAT_INTERVAL_MS);
      }, INITIAL_REPEAT_DELAY_MS);
    },
    [applyStep]
  );

  const stopRepeat = useCallback(() => {
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    setPressedButton(null);
  }, []);

  const handlePressInUp = useCallback(() => {
    if (!editable) return;
    setPressedButton('up');
    startRepeat(1);
  }, [editable, startRepeat]);

  const handlePressInDown = useCallback(() => {
    if (!editable) return;
    setPressedButton('down');
    startRepeat(-1);
  }, [editable, startRepeat]);

  const handlePressOut = useCallback(() => {
    stopRepeat();
  }, [stopRepeat]);

  const handleMinus = useCallback(() => {
    if (!editable) return;
    const current = toNumericMeasurementValue(value) ?? 0;
    onChange(-Math.abs(current));
  }, [editable, value, onChange]);

  const handlePlus = useCallback(() => {
    if (!editable) return;
    const current = toNumericMeasurementValue(value) ?? 0;
    const absVal = Math.abs(current);
    // Store as string with leading "+" so the UI displays the plus sign (e.g. "+5" or "+5,5")
    const withComma = String(absVal).replace('.', ',');
    onChange('+' + withComma);
  }, [editable, value, onChange]);

  const handleDone = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (Platform.OS === 'android' && accessoryApi) {
      accessoryApi.setFocusedAccessory(null, null);
    }
  }, [accessoryApi]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (!editable) return;
      const key = e.nativeEvent?.key;
      if (key === 'ArrowUp') {
        e.preventDefault?.();
        applyStep(1);
      } else if (key === 'ArrowDown') {
        e.preventDefault?.();
        applyStep(-1);
      }
    },
    [editable, applyStep]
  );

  const accessoryBarContent = (
    <View
      style={[
        styles.accessoryBar,
        Platform.OS === 'android' && {
          overflow: 'visible',
          minWidth: 400,
          width: '100%',
          backgroundColor: colors.surface,
        },
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.accessoryBtn, { backgroundColor: colors.borderLight }]}
        onPress={handleDone}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Done"
        accessibilityHint="Dismiss keyboard"
      >
        <Text style={[styles.accessoryBtnText, { color: colors.primary }]}>{t('common.done')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.accessoryBtn,
          { backgroundColor: colors.borderLight },
          !editable && { opacity: 0.5 },
        ]}
        onPress={handleMinus}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Set negative"
        accessibilityHint="Makes the value negative"
      >
        <Text style={[styles.accessoryBtnText, { color: colors.textPrimary }]}>−</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.accessoryBtn,
          { backgroundColor: colors.borderLight },
          !editable && { opacity: 0.5 },
        ]}
        onPress={handlePlus}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Set positive"
        accessibilityHint="Makes the value positive"
      >
        <Text style={[styles.accessoryBtnText, { color: colors.textPrimary }]}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.accessoryBtn,
          { backgroundColor: colors.borderLight },
          pressedButton === 'down' && { backgroundColor: colors.primaryLight },
          !editable && { opacity: 0.5 },
        ]}
        onPressIn={handlePressInDown}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Decrease value"
        accessibilityHint="Decreases the measurement value"
      >
        <Text style={[styles.accessoryBtnText, { color: colors.textSecondary }]}>▼</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.accessoryBtn,
          { backgroundColor: colors.borderLight },
          pressedButton === 'up' && { backgroundColor: colors.primaryLight },
          !editable && { opacity: 0.5 },
        ]}
        onPressIn={handlePressInUp}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Increase value"
        accessibilityHint="Increases the measurement value"
      >
        <Text style={[styles.accessoryBtnText, { color: colors.textSecondary }]}>▲</Text>
      </TouchableOpacity>
    </View>
  );

  // Android: register accessory when focused; sync when bar deps change. Do NOT depend on accessoryApi
  // (context value reference changes when currentContent updates, which would re-run this and cause an infinite loop).
  const setFocusedAccessoryRef = useRef(accessoryApi?.setFocusedAccessory);
  setFocusedAccessoryRef.current = accessoryApi?.setFocusedAccessory;

  useEffect(() => {
    if (Platform.OS !== 'android' || !setFocusedAccessoryRef.current || !focused) return;
    setFocusedAccessoryRef.current(accessoryId, accessoryBarContent);
  }, [
    Platform.OS,
    focused,
    accessoryId,
    pressedButton,
    colors.surface,
    colors.border,
    colors.borderLight,
    colors.primary,
    colors.primaryLight,
    colors.textPrimary,
    colors.textSecondary,
    editable,
    t,
    handleDone,
    handleMinus,
    handlePlus,
    handlePressInUp,
    handlePressInDown,
    handlePressOut,
  ]);

  useEffect(() => {
    return () => {
      if (focusedRef.current && setFocusedAccessoryRef.current && Platform.OS === 'android') {
        setFocusedAccessoryRef.current(null, null);
      }
    };
  }, []);

  // Only show "+" when the value was set by tapping the + button (value starts with "+")
  const displayValue = String(value ?? '').trim().replace('.', ',');

  return (
    <>
      <Input
        ref={inputRef}
        value={displayValue}
        onChangeText={(text) => onChange(text)}
        placeholder={placeholder}
        keyboardType="decimal-pad"
        inputAccessoryViewID={inputAccessoryViewID}
        containerStyle={containerStyle}
        editable={editable}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>{accessoryBarContent}</InputAccessoryView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  accessoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
    width: '100%',
  },
  accessoryBtn: {
    minHeight: 44,
    minWidth: 44,
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  accessoryBtnText: {
    fontSize: _compact ? 16 : 18,
    fontWeight: '600',
  },
});
