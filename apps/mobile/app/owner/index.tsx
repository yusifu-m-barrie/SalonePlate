import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useRequireRole } from '../../src/hooks/useRequireRole';
import { useOwnerRealtime } from '../../src/hooks/useOwnerRealtime';
import { useAuthStore } from '../../src/stores/authStore';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing } from '../../src/constants/theme';
import { formatCurrency } from '../../src/lib/currency';

type OwnerNotification = {
  id: string;
  type: 'NEW_ORDER' | 'PAYMENT' | 'DELIVERED' | 'RATING';
  orderId: string;
  orderNumber: string;
  message: string;
  createdAt: string;
  rating?: number;
  comment?: string | null;
};

type DashboardData = {
  restaurant: {
    id: string;
    name: string;
    status: string;
    isOpen: boolean;
    isBusy: boolean;
    rating: number;
    reviewCount: number;
    address: string;
    phone?: string | null;
    itemCount: number;
    city?: { name: string };
  };
  stats: {
    activeOrders: number;
    pendingOrders: number;
    completedToday: number;
    revenueToday: number;
  };
  notifications: OwnerNotification[];
};

const NOTIF_ICON: Record<OwnerNotification['type'], keyof typeof Ionicons.glyphMap> = {
  NEW_ORDER: 'cart',
  PAYMENT: 'card',
  DELIVERED: 'checkmark-circle',
  RATING: 'star',
};

export default function RestaurantHomeScreen() {
  const { isLoading: authLoading } = useRequireRole('RESTAURANT_OWNER');
  const { logout } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/restaurant-owner/dashboard');
      return data;
    },
    enabled: !authLoading,
    refetchInterval: 20000,
  });

  useOwnerRealtime(data?.restaurant?.id);

  const restaurant = data?.restaurant;
  const stats = data?.stats;
  const notifications = data?.notifications ?? [];

  if (authLoading) return null;

  const statusColor =
    restaurant?.status === 'APPROVED' ? colors.success : colors.gold;

  const openOrder = (orderId: string) => {
    router.push(`/owner/orders/${orderId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
        }
      >
        <Text style={styles.title}>{restaurant?.name || 'My Restaurant'}</Text>
        <Text style={styles.subtitle}>
          {restaurant?.city?.name || 'Makeni'} ·{' '}
          <Text style={{ color: statusColor }}>{restaurant?.status || (isLoading ? '…' : '—')}</Text>
          {restaurant?.isOpen ? ' · Open' : ' · Closed'}
        </Text>

        {restaurant?.status === 'PENDING' && (
          <GlassCard style={styles.banner}>
            <Text style={styles.bannerText}>
              Waiting for admin approval. Add your menu now — dishes go live on the customer app once
              approved.
            </Text>
          </GlassCard>
        )}

        {restaurant?.status === 'APPROVED' && (
          <GlassCard style={[styles.banner, { borderColor: colors.success + '55' }]}>
            <Text style={[styles.bannerText, { color: colors.success }]}>
              Your restaurant is live for customers. Keep items marked available in Menu.
            </Text>
          </GlassCard>
        )}

        <Text style={styles.sectionHeading}>Overview</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Ionicons name="receipt-outline" size={22} color={colors.gold} />
            <Text style={styles.statNum}>{stats?.activeOrders ?? 0}</Text>
            <Text style={styles.statLabel}>Active orders</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Ionicons name="notifications-outline" size={22} color={colors.gold} />
            <Text style={styles.statNum}>{stats?.pendingOrders ?? 0}</Text>
            <Text style={styles.statLabel}>Awaiting accept</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Ionicons name="today-outline" size={22} color={colors.gold} />
            <Text style={styles.statNum}>{stats?.completedToday ?? 0}</Text>
            <Text style={styles.statLabel}>Delivered today</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Ionicons name="cash-outline" size={22} color={colors.gold} />
            <Text style={[styles.statNum, { fontSize: 14 }]}>
              {formatCurrency(stats?.revenueToday ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Revenue today</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionHeading}>Restaurant info</Text>
        <GlassCard style={styles.infoCard}>
          <InfoRow icon="star" label="Rating" value={`${(restaurant?.rating ?? 0).toFixed(1)} (${restaurant?.reviewCount ?? 0} reviews)`} />
          <InfoRow icon="restaurant" label="Menu items" value={`${restaurant?.itemCount ?? 0} dishes`} />
          <InfoRow icon="location" label="Address" value={restaurant?.address || '—'} />
          {restaurant?.phone ? (
            <InfoRow icon="call" label="Phone" value={restaurant.phone} />
          ) : null}
          <InfoRow
            icon="time"
            label="Status"
            value={restaurant?.isBusy ? 'Busy' : restaurant?.isOpen ? 'Accepting orders' : 'Closed'}
          />
        </GlassCard>

        {notifications.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Recent activity</Text>
            {notifications.slice(0, 8).map((n) => (
              <TouchableOpacity key={n.id} onPress={() => openOrder(n.orderId)}>
                <GlassCard style={styles.notifCard}>
                  <View style={styles.notifIcon}>
                    <Ionicons name={NOTIF_ICON[n.type]} size={20} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifMessage}>{n.message}</Text>
                    <Text style={styles.notifMeta}>
                      {n.orderNumber} · {new Date(n.createdAt).toLocaleString()}
                    </Text>
                    {n.type === 'RATING' && n.comment ? (
                      <Text style={styles.notifComment} numberOfLines={2}>
                        "{n.comment}"
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.softGray} />
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.sectionHeading}>Manage</Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/owner/settings')}>
          <Ionicons name="settings-outline" size={28} color={colors.gold} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Profile & cuisine tags</Text>
            <Text style={styles.cardDesc}>Name, hours, open/busy, filters on customer Browse</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.softGray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/owner/menu')}>
          <Ionicons name="restaurant" size={28} color={colors.gold} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Menu & Food</Text>
            <Text style={styles.cardDesc}>Add dishes, prices, photos, categories</Text>
            <Text style={styles.cardMeta}>{restaurant?.itemCount ?? 0} items</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.softGray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/owner/orders')}>
          <Ionicons name="receipt" size={28} color={colors.gold} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Orders</Text>
            <Text style={styles.cardDesc}>Accept, prepare, deliver & view ratings</Text>
            {(stats?.pendingOrders ?? 0) > 0 && (
              <Text style={styles.cardBadge}>{stats!.pendingOrders} new — tap to open</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.softGray} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/owner/orders')}>
          <Ionicons name="star-half" size={28} color={colors.gold} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Reviews & ratings</Text>
            <Text style={styles.cardDesc}>See customer feedback on completed orders</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.softGray} />
        </TouchableOpacity>

        <View style={{ marginTop: spacing.xl }}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={async () => {
              await logout();
              router.replace('/(auth)/welcome');
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  title: { fontSize: 26, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.softGray, marginTop: 4, marginBottom: spacing.lg },
  sectionHeading: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  banner: { marginBottom: spacing.lg, borderColor: colors.gold + '55', borderWidth: 1 },
  bannerText: { color: colors.gold, fontSize: 13, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: spacing.md },
  statNum: { color: colors.white, fontSize: 22, fontWeight: '700', marginTop: 6 },
  statLabel: { color: colors.softGray, fontSize: 11, marginTop: 4, textAlign: 'center' },
  infoCard: { marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  infoLabel: { color: colors.softGray, fontSize: 11 },
  infoValue: { color: colors.white, fontSize: 14, marginTop: 2 },
  notifCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: 10 },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifMessage: { color: colors.white, fontSize: 14, fontWeight: '600' },
  notifMeta: { color: colors.softGray, fontSize: 11, marginTop: 2 },
  notifComment: { color: colors.softGray, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: { flex: 1, marginLeft: spacing.md },
  cardTitle: { color: colors.white, fontSize: 17, fontWeight: '600' },
  cardDesc: { color: colors.softGray, fontSize: 13, marginTop: 2 },
  cardMeta: { color: colors.gold, fontSize: 13, marginTop: 6, fontWeight: '600' },
  cardBadge: { color: colors.error, fontSize: 12, marginTop: 6, fontWeight: '600' },
});
