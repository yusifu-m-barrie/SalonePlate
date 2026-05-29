import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { SalonePlateLogo } from '../../src/components/ui/SalonePlateLogo';
import { CustomerGoogleAuthButton } from '../../src/components/auth/CustomerGoogleAuthButton';
import { colors, spacing } from '../../src/constants/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.darkBlue, '#0A2540', colors.darkBlue]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.content}>
        <View style={styles.hero}>
          <SalonePlateLogo variant="mark" size={72} onDark showWordmark />
          <Text style={styles.tagline}>Premium food delivery{'\n'}for Sierra Leone</Text>
          <Text style={styles.city}>📍 Makeni</Text>
        </View>
        <View style={styles.actions}>
          <CustomerGoogleAuthButton title="Continue with Google (Gmail)" />
          <Link href="/(tabs)" asChild>
            <Button title="Browse Restaurants" onPress={() => {}} variant="primary" />
          </Link>
          <Link href="/(auth)/login" asChild>
            <Button title="Sign In with Email" onPress={() => {}} variant="outline" />
          </Link>
          <Link href="/(auth)/register/customer" asChild>
            <Button title="Create Account with Email" onPress={() => {}} variant="outline" />
          </Link>
          <Link href="/(auth)/phone-login" asChild>
            <Button title="Continue with Phone" onPress={() => {}} variant="ghost" />
          </Link>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tagline: { color: colors.softGray, fontSize: 18, textAlign: 'center', marginTop: spacing.lg, lineHeight: 26 },
  city: { color: colors.gold, marginTop: spacing.lg, fontSize: 16 },
  actions: { gap: 12 },
});
