import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (isAuthenticated) {
    const role = useAuthStore.getState().user?.role;
    if (role === 'RESTAURANT_OWNER') return <Redirect href="/owner" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.darkBlue },
});
