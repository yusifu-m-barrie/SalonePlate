import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { appAlert } from '../../src/lib/appAlert';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/lib/api';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      appAlert('Email required', 'Enter the email linked to your account');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      appAlert(
        'Check your email',
        'If an account exists, a reset code was sent. In development, check the API terminal for [DEV OTP].'
      );
      router.back();
    } catch {
      appAlert('Error', 'Could not send reset code. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>
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
      <Button title="Send Reset Code" onPress={handleSubmit} loading={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue, padding: spacing.lg },
  back: { color: colors.gold, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.softGray, marginTop: 8, marginBottom: spacing.xl },
  label: { color: colors.softGray, fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.white,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
});
