import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomerGoogleAuthButton } from '../../../src/components/auth/CustomerGoogleAuthButton';
import { SIGNUP_ROLES, SignupRoleKey } from '../../../src/types/signup';
import { colors, spacing, radius } from '../../../src/constants/theme';

export default function RegisterRoleScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Choose how you want to use SalonePlate</Text>

      <View style={styles.googleBlock}>
        <Text style={styles.googleLabel}>Order food (customers)</Text>
        <CustomerGoogleAuthButton title="Sign up with Google (Gmail)" />
        <TouchableOpacity onPress={() => router.push('/(auth)/register/customer')}>
          <Text style={styles.emailAlt}>Or sign up with email →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.otherLabel}>Restaurant or delivery partner</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {(Object.keys(SIGNUP_ROLES) as SignupRoleKey[])
          .filter((key) => key !== 'rider' && key !== 'customer')
          .map((key) => {
            const role = SIGNUP_ROLES[key];
            return (
              <TouchableOpacity
                key={key}
                style={styles.card}
                onPress={() => router.push(`/(auth)/register/${key}`)}
                activeOpacity={0.85}
              >
                <Text style={styles.emoji}>{role.emoji}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{role.title}</Text>
                  <Text style={styles.cardSub}>{role.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.softGray} />
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue, padding: spacing.lg },
  back: { color: colors.gold, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.softGray, marginTop: 6, marginBottom: spacing.lg },
  googleBlock: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    gap: 10,
  },
  googleLabel: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  emailAlt: { color: colors.softGray, fontSize: 13, textAlign: 'center', marginTop: 4 },
  otherLabel: { color: colors.softGray, fontSize: 12, marginBottom: 8 },
  list: { gap: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 14,
  },
  emoji: { fontSize: 32 },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  cardSub: { color: colors.softGray, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
