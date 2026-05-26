import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { AppImage } from '../../src/components/ui/AppImage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useCustomerRealtime } from '../../src/hooks/useCustomerRealtime';
import { requireAuthForRoute } from '../../src/lib/navigation';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing } from '../../src/constants/theme';
import { formatCurrency } from '../../src/lib/currency';
import { ORDER_STATUS_LABEL } from '../../src/lib/orderStatus';
import { api } from '../../src/lib/api';

type CustomerNotification = {
  id: string;
  type: string;
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  message: string;
  createdAt: string;
  status?: string;
};

type RestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  rating: number;
};

type DashboardData = {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    loyaltyPoints?: number;
    referralCode?: string;
  };
  stats: {
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    totalSpent: number;
    spentToday: number;
    ordersToday: number;
    restaurantsCount: number;
  };
  restaurants: RestaurantSummary[];
  notifications: CustomerNotification[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    restaurant?: { name: string; slug: string; logoUrl?: string | null };
  }[];
};

const NOTIF_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  ORDER_UPDATE: 'time',
  ORDER_PLACED: 'cart',
  DELIVERED: 'checkmark-circle',
  RATED: 'star',
  CANCELLED: 'close-circle',
};

const QUICK_LINKS = [
  { icon: 'location', label: 'Saved Addresses', route: 'addresses' },
  { icon: 'heart', label: 'Favorites', route: 'favorites' },
  { icon: 'card', label: 'Payment Methods', route: 'payments' },
  { icon: 'notifications', label: 'Notification settings', route: 'notifications' },
  { icon: 'gift', label: 'Referral Code', route: 'referral' },
  { icon: 'help-circle', label: 'Support Center', route: 'support' },
];

export default function ProfileScreen() {
  const { user, logout, isAuthenticated } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/users/dashboard');
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: 20000,
  });

  useCustomerRealtime(user?.id);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={styles.title}>My Account</Text>
          <Text style={styles.guestText}>
            Sign in to track orders, see spending history, and reorder from your favourite restaurants.
          </Text>
          <Button title="Sign In" onPress={() => requireAuthForRoute('/(tabs)/profile')} />
          <View style={{ marginTop: 12 }}>
            <Button title="Create Account" variant="outline" onPress={() => router.push('/(auth)/register/')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const stats = data?.stats;
  const restaurants = data?.restaurants ?? [];
  const notifications = data?.notifications ?? [];
  const recentOrders = data?.recentOrders ?? [];
  const displayUser = data?.user || user;

  const openOrder = (orderId: string) => router.push(`/tracking/${orderId}`);
  const openRestaurant = (slug: string) => router.push(`/restaurant/${slug}`);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayUser?.firstName?.[0] || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {displayUser?.firstName} {displayUser?.lastName}
            </Text>
            <Text style={styles.email}>{displayUser?.email || displayUser?.phone}</Text>
            <Text style={styles.points}>★ {displayUser?.loyaltyPoints || 0} loyalty points</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Overview</Text>
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Ionicons name="wallet-outline" size={22} color={colors.gold} />
            <Text style={[styles.statNum, { fontSize: 13 }]}>
              {formatCurrency(stats?.totalSpent ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Total spent</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Ionicons name="receipt-outline" size={22} color={colors.gold} />
            <Text style={styles.statNum}>{stats?.totalOrders ?? 0}</Text>
            <Text style={styles.statLabel}>All orders</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Ionicons name="bicycle-outline" size={22} color={colors.gold} />
            <Text style={styles.statNum}>{stats?.activeOrders ?? 0}</Text>
            <Text style={styles.statLabel}>In progress</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Ionicons name="storefront-outline" size={22} color={colors.gold} />
            <Text style={styles.statNum}>{stats?.restaurantsCount ?? 0}</Text>
            <Text style={styles.statLabel}>Restaurants</Text>
          </GlassCard>
        </View>

        {(stats?.spentToday ?? 0) > 0 && (
          <GlassCard style={styles.todayBanner}>
            <Text style={styles.todayText}>
              Today: {stats?.ordersToday ?? 0} order(s) · {formatCurrency(stats?.spentToday ?? 0)} spent
            </Text>
          </GlassCard>
        )}

        {notifications.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Recent updates</Text>
            {notifications.slice(0, 6).map((n) => (
              <TouchableOpacity key={n.id} onPress={() => openOrder(n.orderId)}>
                <GlassCard style={styles.notifCard}>
                  <View style={styles.notifIcon}>
                    <Ionicons
                      name={NOTIF_ICON[n.type] || 'notifications'}
                      size={20}
                      color={colors.gold}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifMessage}>{n.message}</Text>
                    <Text style={styles.notifMeta}>
                      {n.restaurantName} · {n.orderNumber} ·{' '}
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.softGray} />
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        {recentOrders.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionHeading}>Recent orders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((o) => (
              <TouchableOpacity key={o.id} onPress={() => openOrder(o.id)}>
                <GlassCard style={styles.orderRow}>
                  <AppImage uri={o.restaurant?.logoUrl} style={styles.restLogo} containerStyle={styles.restLogo} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderRest}>{o.restaurant?.name || 'Restaurant'}</Text>
                    <Text style={styles.orderMeta}>
                      {o.orderNumber} · {ORDER_STATUS_LABEL[o.status] || o.status}
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>{formatCurrency(o.totalAmount)}</Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        {restaurants.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Restaurants you've ordered from</Text>
            <Text style={styles.sectionSub}>
              Tap a restaurant to order again
            </Text>
            {restaurants.map((r) => (
              <TouchableOpacity key={r.id} onPress={() => openRestaurant(r.slug)}>
                <GlassCard style={styles.restCard}>
                  <AppImage uri={r.logoUrl} style={styles.restCardLogo} containerStyle={styles.restCardLogo} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.restName}>{r.name}</Text>
                    <Text style={styles.restMeta}>
                      {r.orderCount} order{r.orderCount !== 1 ? 's' : ''} ·{' '}
                      {formatCurrency(r.totalSpent)} spent
                    </Text>
                    <Text style={styles.restRating}>
                      ★ {r.rating.toFixed(1)} · Last order{' '}
                      {new Date(r.lastOrderAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.softGray} />
                </GlassCard>
              </TouchableOpacity>
            ))}
          </>
        )}

        {!isLoading && restaurants.length === 0 && (
          <GlassCard>
            <Text style={styles.muted}>
              You haven't ordered yet. Browse restaurants on Home and your favourites will appear here.
            </Text>
          </GlassCard>
        )}

        <Text style={styles.sectionHeading}>Manage</Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/orders')}>
          <Ionicons name="receipt" size={28} color={colors.gold} />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Your orders</Text>
            <Text style={styles.cardDesc}>Track deliveries and order history</Text>
            {(stats?.activeOrders ?? 0) > 0 && (
              <Text style={styles.cardBadge}>{stats!.activeOrders} active — tap to track</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.softGray} />
        </TouchableOpacity>

        {displayUser?.referralCode && (
          <GlassCard style={{ marginBottom: spacing.md }}>
            <Text style={styles.referralLabel}>Your referral code</Text>
            <Text style={styles.referralCode}>{displayUser.referralCode}</Text>
          </GlassCard>
        )}

        {QUICK_LINKS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => router.push(`/account/${item.route}`)}
          >
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.gold} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.softGray} />
          </TouchableOpacity>
        ))}

        <View style={{ marginTop: spacing.lg }}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={async () => {
              await logout();
              router.replace('/(tabs)');
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  title: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  guestText: { color: colors.softGray, marginBottom: spacing.lg, lineHeight: 22 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.darkBlue },
  name: { fontSize: 20, fontWeight: '700', color: colors.white },
  email: { color: colors.softGray, marginTop: 2 },
  points: { color: colors.gold, marginTop: 4, fontSize: 13 },
  sectionHeading: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionSub: { color: colors.softGray, fontSize: 13, marginBottom: spacing.sm, marginTop: -4 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  seeAll: { color: colors.gold, fontWeight: '600', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: spacing.md },
  statNum: { color: colors.white, fontSize: 22, fontWeight: '700', marginTop: 6 },
  statLabel: { color: colors.softGray, fontSize: 11, marginTop: 4, textAlign: 'center' },
  todayBanner: { marginTop: spacing.sm, borderColor: colors.gold + '44', borderWidth: 1 },
  todayText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
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
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm },
  restLogo: { width: 44, height: 44, borderRadius: 8 },
  restLogoEmpty: { backgroundColor: colors.border },
  orderRest: { color: colors.white, fontWeight: '600', fontSize: 15 },
  orderMeta: { color: colors.softGray, fontSize: 12, marginTop: 2 },
  orderTotal: { color: colors.gold, fontWeight: '700' },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm },
  restCardLogo: { width: 52, height: 52, borderRadius: 10 },
  restName: { color: colors.white, fontWeight: '700', fontSize: 16 },
  restMeta: { color: colors.gold, fontSize: 13, marginTop: 4, fontWeight: '600' },
  restRating: { color: colors.softGray, fontSize: 12, marginTop: 4 },
  muted: { color: colors.softGray, fontSize: 14, lineHeight: 20 },
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
  cardBadge: { color: colors.gold, fontSize: 12, marginTop: 6, fontWeight: '600' },
  referralLabel: { color: colors.softGray, fontSize: 12 },
  referralCode: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, color: colors.white, marginLeft: 14, fontSize: 16 },
});
