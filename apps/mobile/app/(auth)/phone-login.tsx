import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { appAlert } from '../../src/lib/appAlert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function PhoneLoginScreen() {
  const [phone, setPhone] = useState('+232');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const { requestOtp, loginPhone } = useAuthStore();

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      await requestOtp(phone);
      setStep('otp');
      appAlert('OTP Sent', 'Check console in dev mode for OTP code');
    } catch {
      appAlert('Error', 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      await loginPhone(phone, code);
      router.replace('/(tabs)');
    } catch {
      appAlert('Error', 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => (step === 'otp' ? setStep('phone') : router.back())}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Phone Login</Text>
      {step === 'phone' ? (
        <>
          <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholderTextColor={colors.softGray} />
          <Button title="Send OTP" onPress={handleRequestOtp} loading={loading} />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}</Text>
          <TextInput value={code} onChangeText={setCode} style={styles.input} keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.softGray} placeholder="000000" />
          <Button title="Verify & Sign In" onPress={handleVerify} loading={loading} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue, padding: spacing.lg },
  back: { color: colors.gold, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.white, marginBottom: spacing.lg },
  subtitle: { color: colors.softGray, marginBottom: spacing.md },
  input: { backgroundColor: colors.cardBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, color: colors.white, marginBottom: 16 },
});
