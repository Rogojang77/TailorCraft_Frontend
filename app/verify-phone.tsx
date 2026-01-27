import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, apiFetch, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, Typography, ButtonStyles, BorderRadius } from '@/constants/design';
import { CheckCircle, XCircle, Phone, ArrowLeft } from 'lucide-react-native';

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { user, refreshToken } = useAuth();
  const [code, setCode] = useState(['', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!user) {
      Alert.alert('Error', 'Please log in to verify your phone number.');
      router.replace('/login');
      return;
    }

    if (user.phoneVerified) {
      Alert.alert('Already Verified', 'Your phone number is already verified.');
      router.replace('/(tabs)');
      return;
    }
  }, [user]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // If pasting multiple digits, distribute them
      const digits = digit.slice(0, 4).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 4) {
          newCode[index + i] = d;
        }
      });
      setCode(newCode);
      
      // Focus the last filled input or the next empty one
      const nextIndex = Math.min(index + digits.length, 3);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Auto-advance to next input
      if (digit && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 4) {
      setErrorMessage('Please enter the 4-digit code');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in to verify your phone number.');
      router.replace('/login');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      await apiFetch<{ message: string }>(
        api.auth.verifyPhone,
        {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            code: verificationCode,
          }),
          skipAuth: false,
        }
      );

      setStatus('success');
      
      // Refresh user data to get updated verification status
      await refreshToken();

      // Redirect after 2 seconds
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error, 'Invalid verification code. Please try again.'));
      // Clear code on error
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to resend verification code.');
      router.replace('/login');
      return;
    }

    setIsResending(true);
    try {
      await apiFetch<{ message: string }>(
        api.auth.resendPhoneVerification,
        {
          method: 'POST',
          body: JSON.stringify({ userId: user.id }),
          skipAuth: false,
        }
      );

      Alert.alert('Success', 'Verification code sent! Please check your SMS.');
      setCode(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to resend verification code.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Phone Number</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.content}>
          <Phone size={64} color={Colors.textPrimary} style={styles.icon} />
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a 4-digit code to {user?.phone || 'your phone number'}
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  digit && styles.codeInputFilled,
                  status === 'error' && styles.codeInputError,
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <XCircle size={20} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {status === 'success' && (
            <View style={styles.successContainer}>
              <CheckCircle size={20} color={Colors.success || '#10b981'} />
              <Text style={styles.successText}>Phone verified successfully!</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              (status === 'loading' || code.join('').length !== 4) && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={status === 'loading' || code.join('').length !== 4}
          >
            {status === 'loading' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={isResending}
          >
            {isResending ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <Text style={styles.resendText}>Resend Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  icon: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  codeInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    ...Typography.h2,
    textAlign: 'center',
    backgroundColor: Colors.surface,
  },
  codeInputFilled: {
    borderColor: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  codeInputError: {
    borderColor: Colors.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successText: {
    ...Typography.caption,
    color: Colors.success || '#10b981',
    marginLeft: Spacing.sm,
  },
  button: {
    ...ButtonStyles.primary,
    backgroundColor: Colors.textPrimary,
    width: '100%',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  resendButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  resendText: {
    ...Typography.body,
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
});
