/**
 * Biometric authentication helper using expo-local-authentication.
 * Supports Face ID / Touch ID on iOS and Fingerprint / Biometric Prompt on Android.
 * Never triggers the prompt automatically; call authenticateAsync only after user interaction.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricType = 'face' | 'fingerprint' | 'unknown';

export interface BiometricAvailability {
  available: boolean;
  enrolled: boolean;
  type: BiometricType;
  /** Platform-specific label for the login button (e.g. "Face ID", "Touch ID", "Fingerprint") */
  buttonLabel: string;
}

/**
 * Check if biometric hardware is available and enrolled.
 * Use this to decide whether to show the "Login with Face ID / Fingerprint" option.
 */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    const type = resolveBiometricType(types);
    const buttonLabel = getButtonLabel(type);

    return {
      available: hasHardware && isEnrolled,
      enrolled: isEnrolled,
      type,
      buttonLabel,
    };
  } catch (error) {
    console.warn('Biometric availability check failed:', error);
    return {
      available: false,
      enrolled: false,
      type: 'unknown',
      buttonLabel: Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint',
    };
  }
}

/**
 * Resolve the primary biometric type from supported types.
 * Prefer face on iOS (Face ID), fingerprint on Android.
 */
function resolveBiometricType(types: number[]): BiometricType {
  // expo-local-authentication: 1 = FINGERPRINT, 2 = FACIAL_RECOGNITION, 3 = IRIS
  const hasFace = types.includes(2);
  const hasFingerprint = types.includes(1);
  const hasIris = types.includes(3);

  if (Platform.OS === 'ios') {
    return hasFace ? 'face' : hasFingerprint ? 'fingerprint' : 'unknown';
  }
  // Android: prefer fingerprint for wording, then face, then iris
  return hasFingerprint ? 'fingerprint' : hasFace ? 'face' : hasIris ? 'fingerprint' : 'unknown';
}

/**
 * Get platform- and type-specific label for the biometric login button.
 */
function getButtonLabel(type: BiometricType): string {
  if (Platform.OS === 'ios') {
    return type === 'face' ? 'Face ID' : type === 'fingerprint' ? 'Touch ID' : 'Face ID';
  }
  // Android: Biometric Prompt can be fingerprint or face; generic "Fingerprint" is common
  return type === 'face' ? 'Biometric' : 'Fingerprint';
}

export interface AuthenticateOptions {
  promptMessage?: string;
  cancelLabel?: string;
  /** If true, only biometric (Face ID / Touch ID) is used; no device passcode fallback. Default true for login. */
  disableDeviceFallback?: boolean;
}

export interface AuthenticateResult {
  success: boolean;
  error?: string;
}

/**
 * Run the system biometric prompt (Face ID / Touch ID / Fingerprint).
 * Only call this in response to user action (e.g. button press); do not call on app launch.
 */
export async function authenticateWithBiometric(
  options: AuthenticateOptions = {}
): Promise<AuthenticateResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage ?? 'Authenticate to sign in',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      // Prefer Face ID / Touch ID only; do not show device passcode as an option.
      disableDeviceFallback: options.disableDeviceFallback ?? true,
    });

    if (result.success) {
      return { success: true };
    }

    // User cancelled or other failure
    const errorCode = 'error' in result ? result.error : 'unknown';
    if (errorCode === 'user_cancel' || errorCode === 'system_cancel' || errorCode === 'app_cancel') {
      return { success: false, error: 'cancelled' };
    }
    if (errorCode === 'not_enrolled') {
      return { success: false, error: 'not_enrolled' };
    }
    if (errorCode === 'lockout') {
      return { success: false, error: 'lockout' };
    }

    return { success: false, error: errorCode };
  } catch (err) {
    console.warn('Biometric authentication error:', err);
    return { success: false, error: 'unknown' };
  }
}
