import { View, ActivityIndicator } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/lib/api';

export default function RestaurantTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  const { data: dashboard } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ stats: { pendingOrders: number; activeOrders: number } }>(
        '/restaurant-owner/dashboard',
      );
      return data;
    },
    enabled: isAuthenticated && user?.role === 'RESTAURANT_OWNER',
    refetchInterval: 20000,
  });

  const pendingBadge = dashboard?.stats?.pendingOrders;
  const activeBadge = dashboard?.stats?.activeOrders;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.darkBlue }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user?.role !== 'RESTAURANT_OWNER') {
    return <Redirect href="/(tabs)" />;
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
          title: 'My Restaurant',
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          tabBarBadge:
            pendingBadge && pendingBadge > 0
              ? pendingBadge
              : activeBadge && activeBadge > 0
                ? activeBadge
                : undefined,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
