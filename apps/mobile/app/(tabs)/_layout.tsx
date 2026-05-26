import { View, ActivityIndicator } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';

export default function TabLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  const { data: dashboard } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ stats: { activeOrders: number } }>('/users/dashboard');
      return data;
    },
    enabled: isAuthenticated && user?.role !== 'RESTAURANT_OWNER',
    refetchInterval: 20000,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.darkBlue }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (isAuthenticated && user?.role === 'RESTAURANT_OWNER') {
    return <Redirect href="/owner" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.darkBlue,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.softGray,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          tabBarBadge:
            dashboard?.stats?.activeOrders && dashboard.stats.activeOrders > 0
              ? dashboard.stats.activeOrders
              : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
