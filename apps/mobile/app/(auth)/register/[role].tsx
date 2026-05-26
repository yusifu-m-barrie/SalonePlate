import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/stores/authStore';
import { isGoogleAuthConfigured } from '../../../src/lib/googleAuth';
import { CustomerGoogleAuthButton } from '../../../src/components/auth/CustomerGoogleAuthButton';
import { GoogleNotConfiguredHint } from '../../../src/components/auth/GoogleSignInButton';
import { SIGNUP_ROLES, SignupRoleKey } from '../../../src/types/signup';
import { navigateAfterAuth } from '../../../src/lib/navigation';
import { usePendingRouteStore } from '../../../src/stores/pendingRouteStore';
import { getApiErrorMessage } from '../../../src/lib/apiErrors';
import { API_URL } from '../../../src/lib/api';
import { colors, spacing, radius } from '../../../src/constants/theme';
import { appAlert } from '../../../src/lib/appAlert';
import { EmailVerificationField } from '../../../src/components/auth/EmailVerificationField';

type AuthMethod = 'email' | 'google';

function navigateAfterSignup(role: string) {
  const returnTo = usePendingRouteStore.getState().consumeReturnTo();
  const finish = () => navigateAfterAuth(role, returnTo);

  if (role === 'RIDER') {
    appAlert(
      'Application submitted',
      'Your rider account is pending approval. You can explore the app while we review it.',
      [{ text: 'OK', onPress: finish }],
    );
    return;
  }
  if (role === 'RESTAURANT_OWNER') {
    appAlert(
      'Application submitted',
      'Your restaurant is pending approval. We will notify you when it goes live.',
      [{ text: 'OK', onPress: finish }],
    );
    return;
  }
  finish();
}

export default function RegisterFormScreen() {
  const { role: roleKey } = useLocalSearchParams<{ role: string }>();
  const key = (roleKey as SignupRoleKey) in SIGNUP_ROLES ? (roleKey as SignupRoleKey) : 'customer';
  const roleMeta = SIGNUP_ROLES[key];

  const [method, setMethod] = useState<AuthMethod>('email');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+232');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [licenseNumber, setLicenseNumber] = useState('');

  const { sendRegisterCode, registerWithEmail } = useAuthStore();
  const googleAvailable = key === 'customer' && isGoogleAuthConfigured();

  const profilePayload = () => ({
    role: roleMeta.apiRole,
    firstName: firstName.trim(),
    lastName: lastName.trim() || undefined,
    phone: phone.trim() !== '+232' ? phone.trim() : undefined,
    restaurantName: key === 'restaurant' ? restaurantName.trim() : undefined,
    restaurantAddress: key === 'restaurant' ? restaurantAddress.trim() : undefined,
    restaurantPhone: key === 'restaurant' ? restaurantPhone.trim() || undefined : undefined,
    vehicleType: key === 'rider' ? vehicleType : undefined,
    licenseNumber: key === 'rider' ? licenseNumber.trim() || undefined : undefined,
  });

  const validateProfile = () => {
    if (!firstName.trim()) {
      appAlert('Required', 'Enter your first name');
      return false;
    }
    if (key === 'restaurant' && (!restaurantName.trim() || !restaurantAddress.trim())) {
      appAlert('Required', 'Enter restaurant name and address');
      return false;
    }
    return true;
  };

  const handleSendCode = async () => {
    setEmailVerified(false);
    setCode('');
    try {
      const result = await sendRegisterCode(email.trim());
      if (result.devCode) {
        setCode(result.devCode);
      }
      return result;
    } catch (err: unknown) {
      setEmailVerified(false);
      setCode('');
      throw err;
    }
  };

  const handleEmailSignup = async () => {
    if (!validateProfile()) return;
    if (!emailVerified || code.length !== 6) {
      appAlert('Verification required', 'Send the code to your email and wait for the green verified check');
      return;
    }
    if (password.length < 8) {
      appAlert('Password', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const user = await registerWithEmail({
        ...profilePayload(),
        email: email.trim(),
        code,
        password,
      });
      navigateAfterSignup(user.role);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg || 'Could not create account';
      if (
        typeof text === 'string' &&
        (text.toLowerCase().includes('expired') || text.toLowerCase().includes('verification'))
      ) {
        setEmailVerified(false);
        setCode('');
      }
      appAlert('Sign up failed', text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>{roleMeta.emoji}</Text>
          <Text style={styles.title}>Sign up as {roleMeta.title}</Text>
          <Text style={styles.subtitle}>{roleMeta.subtitle}</Text>

          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodChip, method === 'email' && styles.methodActive]}
              onPress={() => setMethod('email')}
            >
              <Ionicons name="mail" size={18} color={method === 'email' ? colors.gold : colors.softGray} />
              <Text style={[styles.methodText, method === 'email' && styles.methodTextActive]}>Email</Text>
            </TouchableOpacity>
            {googleAvailable && (
              <TouchableOpacity
                style={[styles.methodChip, method === 'google' && styles.methodActive]}
                onPress={() => setMethod('google')}
              >
                <Ionicons name="logo-google" size={18} color={method === 'google' ? colors.gold : colors.softGray} />
                <Text style={[styles.methodText, method === 'google' && styles.methodTextActive]}>Google</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.section}>Your details</Text>
          <TextInput placeholder="First name *" placeholderTextColor={colors.softGray} value={firstName} onChangeText={setFirstName} style={styles.input} />
          <TextInput placeholder="Last name" placeholderTextColor={colors.softGray} value={lastName} onChangeText={setLastName} style={styles.input} />
          <TextInput placeholder="Phone (+232...)" placeholderTextColor={colors.softGray} value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />

          {key === 'restaurant' && (
            <>
              <Text style={styles.section}>Restaurant</Text>
              <TextInput placeholder="Restaurant name *" placeholderTextColor={colors.softGray} value={restaurantName} onChangeText={setRestaurantName} style={styles.input} />
              <TextInput placeholder="Address *" placeholderTextColor={colors.softGray} value={restaurantAddress} onChangeText={setRestaurantAddress} style={styles.input} />
              <TextInput placeholder="Restaurant phone" placeholderTextColor={colors.softGray} value={restaurantPhone} onChangeText={setRestaurantPhone} style={styles.input} keyboardType="phone-pad" />
            </>
          )}

          {key === 'rider' && (
            <>
              <Text style={styles.section}>Vehicle</Text>
              <TextInput placeholder="Vehicle type (motorcycle, bicycle...)" placeholderTextColor={colors.softGray} value={vehicleType} onChangeText={setVehicleType} style={styles.input} />
              <TextInput placeholder="License number (optional)" placeholderTextColor={colors.softGray} value={licenseNumber} onChangeText={setLicenseNumber} style={styles.input} />
            </>
          )}

          {method === 'email' ? (
            <>
              <Text style={styles.section}>Email verification (SMTP)</Text>
              <Text style={styles.hint}>
                We email you a 6-digit code. It is checked automatically when you enter all digits.
              </Text>
              <EmailVerificationField
                email={email}
                onEmailChange={setEmail}
                code={code}
                onCodeChange={setCode}
                verified={emailVerified}
                onVerifiedChange={setEmailVerified}
                onSendCode={handleSendCode}
              />
              <TextInput placeholder="Password (min 8 chars) *" placeholderTextColor={colors.softGray} value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
              <Button title="Create account" onPress={handleEmailSignup} loading={loading} />
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Sign up with your Gmail account. Optional: add your name and phone above first.
              </Text>
              <CustomerGoogleAuthButton
                title="Continue with Google"
                loading={loading}
                profile={{
                  firstName: firstName.trim() || undefined,
                  lastName: lastName.trim() || undefined,
                  phone: phone.trim() !== '+232' ? phone.trim() : undefined,
                }}
              />
              <GoogleNotConfiguredHint />
            </>
          )}

          <Text style={styles.apiHint}>API: {API_URL}</Text>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  scroll: { padding: spacing.lg, paddingBottom: 48 },
  back: { color: colors.gold, marginBottom: spacing.md },
  emoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.softGray, marginTop: 4, marginBottom: spacing.lg, lineHeight: 20 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  methodActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  methodText: { color: colors.softGray, fontWeight: '600' },
  methodTextActive: { color: colors.gold },
  section: { color: colors.gold, fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    marginBottom: 10,
  },
  hint: { color: colors.softGray, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  warn: { color: '#FCA5A5', fontSize: 12, marginTop: 10, textAlign: 'center' },
  apiHint: { color: colors.softGray, fontSize: 11, marginTop: spacing.lg, textAlign: 'center' },
  loginLink: { marginTop: spacing.md, alignItems: 'center' },
  loginText: { color: colors.gold },
});
