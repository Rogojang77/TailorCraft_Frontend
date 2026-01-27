import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage, uploadImage } from '@/lib/api';
import { ChevronLeft, ChevronRight, Camera, X } from 'lucide-react-native';
import { Colors, Spacing, Typography, ButtonStyles, Shadows, BorderRadius } from '@/constants/design';

type SignupStep = 'personal' | 'company';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState<SignupStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Personal data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Company data
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [address, setAddress] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'The app needs access to your photo library to select a logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not select image. Please try again.');
    }
  };

  const validatePersonalStep = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter a password.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return false;
    }

    return true;
  };

  const validateCompanyStep = (): boolean => {
    if (!companyName.trim()) {
      Alert.alert('Validation Error', 'Please enter your company name.');
      return false;
    }

    if (!ownerName.trim()) {
      Alert.alert('Validation Error', 'Please enter the owner name.');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter a phone number.');
      return false;
    }

    if (!companyEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter your company email.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid company email address.');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (step === 'personal') {
      if (validatePersonalStep()) {
        setStep('company');
      }
    }
  };

  const handleBack = () => {
    if (step === 'company') {
      setErrorMessage('');
      setStep('personal');
    } else {
      router.back();
    }
  };

  const handleSignup = async () => {
    if (!validateCompanyStep()) {
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      // Upload logo if it's a local file
      let logoUrl: string | undefined = undefined;
      if (logoUri) {
        if (logoUri.startsWith('http')) {
          logoUrl = logoUri;
        } else {
          try {
            logoUrl = await uploadImage(logoUri);
          } catch (uploadError) {
            Alert.alert('Upload Error', 'Could not upload logo. Please try again.');
            setIsLoading(false);
            return;
          }
        }
      }

      const response = await signup({
        email: email.trim(),
        password: password.trim(),
        companyData: {
          name: companyName.trim(),
          owner: ownerName.trim(),
          phone: phone.trim(),
          email: companyEmail.trim(),
          address: address.trim() || undefined,
          logoUrl,
        },
      });

      Alert.alert(
        'Account Created!',
        'Please verify your email and phone number. Check your email for the verification link, and enter the code sent to your phone.',
        [
          {
            text: 'Verify Phone',
            onPress: () => {
              router.replace('/verify-phone');
            },
          },
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Could not create account. Please try again.');
      setErrorMessage(msg);
      Alert.alert('Signup Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPersonalStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password (min. 6 characters)"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          autoComplete="password-new"
          passwordRules="minlength: 6;"
          returnKeyType="next"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          autoComplete="password-new"
          passwordRules="minlength: 6;"
          returnKeyType="done"
          onSubmitEditing={handleNext}
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>Next</Text>
        <ChevronRight size={20} color="#fff" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  );

  const renderCompanyStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Company Logo (Optional)</Text>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={handleImagePicker}
          disabled={isLoading}
        >
          {logoUri ? (
            <View style={styles.logoImageContainer}>
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
              <TouchableOpacity
                style={styles.removeLogoButton}
                onPress={() => setLogoUri(null)}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.logoPlaceholder}>
              <Camera size={32} color="#1a1a1a" />
              <Text style={styles.logoText}>Add Logo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter company name"
          placeholderTextColor="#999"
          value={companyName}
          onChangeText={setCompanyName}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Owner Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter owner name"
          placeholderTextColor="#999"
          value={ownerName}
          onChangeText={setOwnerName}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="+40 7XX XXX XXX"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Company Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="contact@company.com"
          placeholderTextColor="#999"
          value={companyEmail}
          onChangeText={setCompanyEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter company address"
          placeholderTextColor="#999"
          value={address}
          onChangeText={setAddress}
          editable={!isLoading}
        />
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.buttonText}>Create Account</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          disabled={isLoading}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'personal' ? 'Personal Information' : 'Company Details'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, step === 'personal' && styles.progressStepActive]} />
        <View style={styles.progressLine} />
        <View style={[styles.progressStep, step === 'company' && styles.progressStepActive]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          alwaysBounceVertical={false}
        >
          <View style={styles.content}>
            {step === 'personal' ? renderPersonalStep() : renderCompanyStep()}
          </View>
        </ScrollView>
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  progressStepActive: {
    backgroundColor: Colors.textPrimary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl * 3,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
  },
  stepContent: {
    width: '100%',
  },
  errorContainer: {
    marginBottom: Spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    ...Typography.body,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoImageContainer: {
    position: 'relative',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    ...Typography.small,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  button: {
    ...ButtonStyles.primary,
    backgroundColor: Colors.textPrimary,
    marginTop: Spacing.sm,
    flexDirection: 'row',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  buttonIcon: {
    marginLeft: Spacing.sm,
  },
});
