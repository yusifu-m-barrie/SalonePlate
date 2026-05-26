import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/lib/api';
import { useRequireRole } from '../../../src/hooks/useRequireRole';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { colors, spacing } from '../../../src/constants/theme';
import { formatCurrency } from '../../../src/lib/currency';
import { ORDER_STATUS_LABEL } from '../../../src/lib/orderStatus';
import { safeGoBack } from '../../../src/lib/safeNavigation';
import { OwnerOrderSteps, fulfillmentProgress } from '../../../src/components/owner/OwnerOrderSteps';
import { appAlert } from '../../../src/lib/appAlert';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentMethod: string;
  deliveryInstructions?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  estimatedDeliveryAt?: string | null;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number; notes?: string | null }[];
  customer?: { firstName?: string; lastName?: string; phone?: string; email?: string };
  payment?: { method: string; status: string; amount: number };
  deliveryAddress?: {
    street?: string;
    city?: string;
    lat?: number;
    lng?: number;
    distanceKm?: number;
  };
  timeline?: { status: string; note?: string | null; createdAt: string }[];
  review?: {
    id: string;
    rating: number;
    foodRating?: number | null;
    comment?: string | null;
    createdAt: string;
    user?: { firstName?: string; lastName?: string };
  } | null;
};

export default function OwnerOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isLoading: authLoading } = useRequireRole('RESTAURANT_OWNER');
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['owner-order', orderId],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/restaurant-owner/orders/${orderId}`);
      return data;
    },
    enabled: !authLoading && !!orderId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      await api.patch(`/restaurant-owner/orders/${orderId}/status`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['owner-orders'] });
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      appAlert('Error', ax.response?.data?.message || 'Could not update order');
    },
  });

  if (authLoading) return null;

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Order details" onBack={safeGoBack} />
        <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Customer';
  const addr = order.deliveryAddress;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={order.orderNumber} onBack={safeGoBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.valueGold}>{ORDER_STATUS_LABEL[order.status] || order.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Placed</Text>
            <Text style={styles.value}>{new Date(order.createdAt).toLocaleString()}</Text>
          </View>
          {order.deliveredAt && (
            <View style={styles.row}>
              <Text style={styles.label}>Delivered</Text>
              <Text style={styles.value}>{new Date(order.deliveredAt).toLocaleString()}</Text>
            </View>
          )}
        </GlassCard>

        {fulfillmentProgress(order.status) >= -1 && (
          <OwnerOrderSteps
            orderStatus={order.status}
            loading={updateStatus.isPending}
            onAdvance={(status, note) => updateStatus.mutate({ status, note })}
          />
        )}

        <Text style={styles.sectionTitle}>Customer</Text>
        <GlassCard>
          <Text style={styles.value}>{customerName}</Text>
          {order.customer?.phone && <Text style={styles.muted}>{order.customer.phone}</Text>}
          {order.customer?.email && <Text style={styles.muted}>{order.customer.email}</Text>}
        </GlassCard>

        {addr?.street && (
          <>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <GlassCard>
              <Text style={styles.value}>
                {addr.street}
                {addr.city ? `, ${addr.city}` : ''}
              </Text>
              {addr.distanceKm != null && (
                <Text style={styles.muted}>{addr.distanceKm} km from your restaurant</Text>
              )}
              {order.deliveryInstructions && (
                <Text style={styles.muted}>Note: {order.deliveryInstructions}</Text>
              )}
            </GlassCard>
          </>
        )}

        <Text style={styles.sectionTitle}>Items</Text>
        <GlassCard>
          {order.items.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <Text style={styles.value}>
                {item.quantity}× {item.name}
              </Text>
              <Text style={styles.valueGold}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
        </GlassCard>

        <Text style={styles.sectionTitle}>Payment</Text>
        <GlassCard>
          <View style={styles.row}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text style={styles.value}>{formatCurrency(order.subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Delivery fee</Text>
            <Text style={styles.value}>{formatCurrency(order.deliveryFee)}</Text>
          </View>
          {order.taxAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.muted}>Tax</Text>
              <Text style={styles.value}>{formatCurrency(order.taxAmount)}</Text>
            </View>
          )}
          {order.tipAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.muted}>Tip</Text>
              <Text style={styles.value}>{formatCurrency(order.tipAmount)}</Text>
            </View>
          )}
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.total}>{formatCurrency(order.totalAmount)}</Text>
          </View>
          <Text style={styles.muted}>
            {order.payment?.method?.replace(/_/g, ' ') || order.paymentMethod?.replace(/_/g, ' ')} ·{' '}
            {order.payment?.status || '—'}
          </Text>
        </GlassCard>

        {order.timeline && order.timeline.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <GlassCard>
              {order.timeline.map((t, i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.value}>
                      {ORDER_STATUS_LABEL[t.status] || t.status.replace(/_/g, ' ')}
                    </Text>
                    {t.note && <Text style={styles.muted}>{t.note}</Text>}
                    <Text style={styles.timelineTime}>
                      {new Date(t.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </GlassCard>
          </>
        )}

        {order.review ? (
          <>
            <Text style={styles.sectionTitle}>Customer rating</Text>
            <GlassCard>
              <View style={styles.ratingRow}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= order.review!.rating ? 'star' : 'star-outline'}
                      size={28}
                      color={s <= order.review!.rating ? colors.gold : colors.softGray}
                    />
                  ))}
                </View>
                <Text style={styles.ratingNum}>{order.review.rating}/5</Text>
              </View>
              {order.review.foodRating != null && order.review.foodRating !== order.review.rating && (
                <Text style={styles.muted}>Food quality: {order.review.foodRating}/5</Text>
              )}
              {order.review.comment ? (
                <View style={styles.commentBox}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.gold} />
                  <Text style={styles.comment}>{order.review.comment}</Text>
                </View>
              ) : (
                <Text style={styles.muted}>No written comment</Text>
              )}
              <Text style={styles.timelineTime}>
                Rated {new Date(order.review.createdAt).toLocaleString()}
              </Text>
            </GlassCard>
          </>
        ) : order.status === 'DELIVERED' ? (
          <GlassCard style={{ borderColor: colors.border }}>
            <Text style={styles.muted}>Customer has not rated this order yet.</Text>
          </GlassCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  scroll: { padding: spacing.lg, paddingBottom: 48, gap: spacing.sm },
  sectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { color: colors.softGray, fontSize: 14 },
  value: { color: colors.white, fontSize: 15 },
  valueGold: { color: colors.gold, fontSize: 15, fontWeight: '600' },
  muted: { color: colors.softGray, fontSize: 13, marginTop: 4 },
  total: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
    marginTop: 6,
  },
  timelineTime: { color: colors.softGray, fontSize: 11, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  ratingNum: { color: colors.gold, fontSize: 22, fontWeight: '700' },
  commentBox: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'flex-start' },
  comment: { color: colors.white, fontSize: 15, lineHeight: 22, flex: 1 },
});
