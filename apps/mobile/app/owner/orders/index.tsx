import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/lib/api';
import { useRequireRole } from '../../../src/hooks/useRequireRole';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Button } from '../../../src/components/ui/Button';
import { OwnerOrderSteps, fulfillmentProgress } from '../../../src/components/owner/OwnerOrderSteps';
import { colors, spacing } from '../../../src/constants/theme';
import { formatCurrency } from '../../../src/lib/currency';
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABEL } from '../../../src/lib/orderStatus';
import { appAlert, appConfirm } from '../../../src/lib/appAlert';

type OrderItem = { name: string; quantity: number; totalPrice: number };
type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  createdAt: string;
  items: OrderItem[];
  customer?: { firstName?: string; lastName?: string; phone?: string };
  payment?: { method: string; status?: string };
  deliveryAddress?: { street?: string; city?: string; distanceKm?: number };
  review?: { rating: number; comment?: string | null };
};

export default function RestaurantOrdersScreen() {
  const { isLoading: authLoading } = useRequireRole('RESTAURANT_OWNER');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['owner-orders'],
    queryFn: async () => {
      const { data } = await api.get<OrderRow[]>('/restaurant-owner/orders');
      return data;
    },
    enabled: !authLoading,
    refetchInterval: 15000,
  });

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) refetch();
    }, [authLoading, refetch]),
  );

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: string; note?: string }) => {
      await api.patch(`/restaurant-owner/orders/${orderId}/status`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-order'] });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      appAlert('Error', ax.response?.data?.message || 'Could not update order');
    },
  });

  const pending = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_ORDER_STATUSES.includes(o.status));

  if (authLoading) return null;

  const openDetail = (orderId: string) => {
    router.push(`/owner/orders/${orderId}`);
  };

  const renderOrder = (item: OrderRow) => {
    const customerName =
      [item.customer?.firstName, item.customer?.lastName].filter(Boolean).join(' ') || 'Customer';
    const addr = item.deliveryAddress;
    const showSteps = fulfillmentProgress(item.status) >= -1;

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => openDetail(item.id)}>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.orderNum}>{item.orderNumber}</Text>
            <Text style={styles.status}>{ORDER_STATUS_LABEL[item.status] || item.status}</Text>
          </View>
          <Text style={styles.customer}>
            {customerName}
            {item.customer?.phone ? ` · ${item.customer.phone}` : ''}
          </Text>
          {addr?.street && (
            <Text style={styles.address}>
              📍 {addr.street}
              {addr.city ? `, ${addr.city}` : ''}
            </Text>
          )}
          {addr?.distanceKm != null && (
            <Text style={styles.address}>{addr.distanceKm} km from restaurant</Text>
          )}
          <Text style={styles.items}>{item.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ')}</Text>
          <Text style={styles.total}>{formatCurrency(item.totalAmount)}</Text>
          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString()} ·{' '}
            {item.payment?.method?.replace(/_/g, ' ') || 'Payment'}
          </Text>

          {item.review && (
            <View style={styles.reviewBadge}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.reviewText}>
                {item.review.rating}★ rated
                {item.review.comment ? ' · tap for comment' : ''}
              </Text>
            </View>
          )}

          <Text style={styles.viewDetails}>View full details →</Text>

          {item.status === 'PLACED' && (
            <View style={styles.actions} onStartShouldSetResponder={() => true}>
              <Button
                title="Accept order"
                onPress={() =>
                  updateStatus.mutate({
                    orderId: item.id,
                    status: 'RESTAURANT_ACCEPTED',
                    note: 'Order accepted',
                  })
                }
                loading={updateStatus.isPending}
              />
              <View style={{ marginTop: 8 }}>
                <Button
                  title="Decline"
                  variant="outline"
                  onPress={() =>
                    appConfirm('Decline order?', 'The customer will be notified.', () =>
                      updateStatus.mutate({
                        orderId: item.id,
                        status: 'CANCELLED',
                        note: 'Declined by restaurant',
                      }),
                    { confirmText: 'Decline', destructive: true })
                  }
                />
              </View>
            </View>
          )}

          {showSteps && (
            <View onStartShouldSetResponder={() => true}>
              <OwnerOrderSteps
                orderStatus={item.status}
                loading={updateStatus.isPending}
                onAdvance={(status, note) =>
                  updateStatus.mutate({ orderId: item.id, status, note })
                }
              />
            </View>
          )}

          {item.status === 'ON_THE_WAY' && (
            <Text style={styles.waitingHint}>Waiting for customer to confirm delivery</Text>
          )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Orders</Text>
      <Text style={styles.subtitle}>Tap an order for full details, rating & timeline</Text>

      {isLoading && <Text style={styles.muted}>Loading orders…</Text>}

      <FlatList
        data={[...pending, ...past]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: 12, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
        }
        ListHeaderComponent={
          pending.length > 0 ? (
            <Text style={styles.sectionLabel}>{pending.length} active order(s)</Text>
          ) : (
            <Text style={styles.muted}>No active orders — pull to refresh</Text>
          )
        }
        renderItem={({ item }) => renderOrder(item)}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.muted}>
              No orders yet. When customers place orders from your menu, they appear here.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  subtitle: { color: colors.softGray, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, fontSize: 14 },
  sectionLabel: { color: colors.gold, fontWeight: '600', marginBottom: 8 },
  muted: { color: colors.softGray, textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: 8 },
  card: { marginBottom: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { color: colors.white, fontWeight: '700', fontSize: 16 },
  status: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  customer: { color: colors.white, marginTop: 6, fontSize: 14 },
  address: { color: colors.softGray, fontSize: 13, marginTop: 4 },
  items: { color: colors.softGray, fontSize: 13, marginTop: 8, lineHeight: 20 },
  total: { color: colors.gold, fontWeight: '700', fontSize: 18, marginTop: 8 },
  meta: { color: colors.softGray, fontSize: 11, marginTop: 4 },
  reviewBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  reviewText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  viewDetails: { color: colors.softGray, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  actions: { marginTop: spacing.md },
  waitingHint: { color: colors.softGray, fontSize: 13, marginTop: spacing.sm, fontStyle: 'italic' },
});
