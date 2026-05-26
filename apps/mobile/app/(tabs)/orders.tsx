import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { useCustomerRealtime } from '../../src/hooks/useCustomerRealtime';
import { requireAuthForRoute } from '../../src/lib/navigation';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Button } from '../../src/components/ui/Button';
import { ORDER_STATUS_LABEL, ACTIVE_ORDER_STATUSES } from '../../src/lib/orderStatus';
import { colors, spacing } from '../../src/constants/theme';
import { formatCurrency } from '../../src/lib/currency';
import { AppImage } from '../../src/components/ui/AppImage';

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  restaurant?: { id: string; name: string; slug: string; logoUrl?: string | null };
  review?: { rating: number } | null;
};

export default function OrdersScreen() {
  const { isAuthenticated, user } = useAuthStore();

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['order-history'],
    queryFn: async () => {
      const { data } = await api.get<{ orders: OrderRow[] }>('/users/orders', {
        params: { limit: 50 },
      });
      return data.orders;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  useCustomerRealtime(user?.id);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refetch();
    }, [isAuthenticated, refetch]),
  );

  const orders = data || [];
  const active = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_ORDER_STATUSES.includes(o.status));

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Your Orders</Text>
        <Text style={styles.empty}>Sign in to view your order history and track deliveries.</Text>
        <Button title="Sign In" onPress={() => requireAuthForRoute('/(tabs)/orders')} />
      </SafeAreaView>
    );
  }

  const renderOrder = (item: OrderRow) => {
    const isActive = ACTIVE_ORDER_STATUSES.includes(item.status);
    return (
      <TouchableOpacity onPress={() => router.push(`/tracking/${item.id}`)}>
        <GlassCard style={isActive ? styles.activeCard : undefined}>
          <View style={styles.rowTop}>
            {item.restaurant?.logoUrl ? (
              <AppImage uri={item.restaurant.logoUrl} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoEmpty]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurant}>{item.restaurant?.name || 'Restaurant'}</Text>
              <Text style={styles.orderNum}>{item.orderNumber}</Text>
            </View>
            {isActive && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}
          </View>
          <View style={styles.row}>
            <Text style={styles.status}>
              {ORDER_STATUS_LABEL[item.status] || item.status?.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.total}>{formatCurrency(item.totalAmount)}</Text>
          </View>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
          {item.review && (
            <View style={styles.ratedRow}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.ratedText}>You rated {item.review.rating}★</Text>
            </View>
          )}
          {isActive && (
            <Text style={styles.trackHint}>Tap to track →</Text>
          )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Your Orders</Text>
      <Text style={styles.subtitle}>Tap any order to track or view details</Text>

      <FlatList
        data={[...active, ...past]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
        }
        ListHeaderComponent={
          active.length > 0 ? (
            <Text style={styles.sectionLabel}>{active.length} order(s) in progress</Text>
          ) : !isLoading ? (
            <Text style={styles.emptyHeader}>No active orders</Text>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>No orders yet. Order from Home to see them here.</Text>
          ) : null
        }
        renderItem={({ item }) => renderOrder(item)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  title: { fontSize: 24, fontWeight: '700', color: colors.white, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  subtitle: { color: colors.softGray, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, fontSize: 14 },
  sectionLabel: { color: colors.gold, fontWeight: '600', marginBottom: 8 },
  emptyHeader: { color: colors.softGray, marginBottom: 8 },
  empty: { color: colors.softGray, textAlign: 'center', marginTop: 40, paddingHorizontal: spacing.lg },
  activeCard: { borderColor: colors.gold + '66', borderWidth: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 8 },
  logoEmpty: { backgroundColor: colors.border },
  restaurant: { color: colors.white, fontWeight: '700', fontSize: 16 },
  orderNum: { color: colors.softGray, fontSize: 12, marginTop: 2 },
  liveBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveText: { color: colors.darkBlue, fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  status: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  total: { color: colors.white, fontWeight: '700', fontSize: 16 },
  date: { color: colors.softGray, fontSize: 11, marginTop: 6 },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  ratedText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  trackHint: { color: colors.softGray, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
