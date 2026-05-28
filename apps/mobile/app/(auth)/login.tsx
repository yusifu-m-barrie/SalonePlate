import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { appAlert } from '../../src/lib/appAlert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { SalonePlateLogo } from '../../src/components/ui/SalonePlateLogo';
import { CustomerGoogleAuthButton } from '../../src/components/auth/CustomerGoogleAuthButton';
import { GoogleNotConfiguredHint } from '../../src/components/auth/GoogleSignInButton';
import { useAuthStore } from '../../src/stores/authStore';
import { navigateAfterAuth } from '../../src/lib/navigation';
import { usePendingRouteStore } from '../../src/stores/pendingRouteStore';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      const returnTo = usePendingRouteStore.getState().consumeReturnTo();
      navigateAfterAuth(user?.role || 'CUSTOMER', returnTo);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string | string[] } }; message?: string };
      const msg = ax.response?.data?.message;
      const apiMsg = Array.isArray(msg) ? msg[0] : msg;
      if (ax.response?.status === 401) {
        appAlert('Error', 'Invalid email or password');
      } else if (!ax.response) {
        appAlert(
          'Cannot reach server',
          'Check that npm run dev:api is running and EXPO_PUBLIC_API_URL in apps/mobile/.env uses your PC Wi‑Fi IP (ipconfig).'
        );
      } else {
        appAlert('Error', apiMsg || ax.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <SalonePlateLogo size={140} containerStyle={styles.logoWrap} />
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <CustomerGoogleAuthButton title="Continue with Google" loading={loading} />
      <GoogleNotConfiguredHint />

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or email</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.softGray}
          placeholder="your@email.com"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholderTextColor={colors.softGray}
          placeholder="••••••••"
        />
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>
        <Button title="Sign In" onPress={handleLogin} loading={loading} />
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/register/customer')} style={styles.signupLink}>
        <Text style={styles.signupText}>Don&apos;t have an account? Sign up</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue, padding: spacing.lg },
  back: { color: colors.gold, marginBottom: spacing.lg },
  logoWrap: { alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.softGray, marginTop: 4, marginBottom: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.softGray, fontSize: 13 },
  form: { gap: 8 },
  label: { color: colors.softGray, fontSize: 13, marginTop: 8 },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    fontSize: 16,
  },
  forgot: { color: colors.gold, textAlign: 'right', marginVertical: 8 },
  signupLink: { marginTop: spacing.xl, alignItems: 'center' },
  signupText: { color: colors.gold },
});
