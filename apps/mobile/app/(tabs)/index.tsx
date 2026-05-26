import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { AppImage } from '../../src/components/ui/AppImage';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, API_URL } from '../../src/lib/api';
import { DiscoverGrid } from '../../src/components/discover/DiscoverGrid';
import { PopularFoodGridCard, PopularFoodGridItem } from '../../src/components/discover/PopularFoodGridCard';
import { RestaurantGridCard } from '../../src/components/discover/RestaurantGridCard';
import { colors, spacing, radius } from '../../src/constants/theme';
import { CUISINE_FILTERS, HOME_DISCOVER_FILTERS } from '../../src/constants/discoverFilters';
import { useCustomerLocation } from '../../src/hooks/useCustomerLocation';
import { useGridColumns } from '../../src/hooks/useGridColumns';
import {
  applyHomeDiscoverFilters,
  applyHomeDiscoverFiltersToFoods,
  hasActiveHomeDiscoverFilters,
} from '../../src/lib/discoverHomeFilters';
import { normalizeCuisineFilterId } from '../../src/lib/cuisineMenu';
import { useCartStore } from '../../src/stores/cartStore';
import { useAuthStore } from '../../src/stores/authStore';

const CITY_SLUG = 'makeni';

type HomeRestaurant = {
  id: string;
  slug: string;
  name: string;
  coverImage?: string;
  logoUrl?: string;
  rating?: number;
  reviewCount?: number;
  deliveryTimeMin?: number;
  deliveryFee?: number;
  distanceKm?: number | null;
  isOpen?: boolean;
  isBusy?: boolean;
  isFeatured?: boolean;
  categories?: string[];
  displayCategories?: string[];
};

export default function HomeScreen() {
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const gridColumns = useGridColumns();
  const { lat, lng, usingDeviceLocation, ready: locationReady } = useCustomerLocation();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedBrowse, setSelectedBrowse] = useState('all');
  const [selectedCuisine, setSelectedCuisine] = useState('all');

  const homeFilters = useMemo(
    () => ({
      restaurantId: selectedRestaurantId,
      browse: selectedBrowse,
      cuisine: selectedCuisine,
    }),
    [selectedRestaurantId, selectedBrowse, selectedCuisine],
  );

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['discover-home', CITY_SLUG, lat, lng],
    queryFn: async () => {
      const { data } = await api.get(`/restaurants/discover/${CITY_SLUG}`, {
        params: { limit: 30, lat, lng, sort: 'distance' },
      });
      return data;
    },
    enabled: locationReady,
    retry: 1,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });

  const connectionError = isError
    ? ((error as { message?: string })?.message || 'Cannot reach the server')
    : null;

  const banners = data?.banners || [];
  const restaurants = (data?.restaurants || []) as HomeRestaurant[];
  const featuredRestaurants = ((data?.featuredRestaurants ?? data?.featured) ||
    []) as HomeRestaurant[];
  const featuredFoods = (data?.featuredFoods || []) as PopularFoodGridItem[];
  const restaurantPicker = (data?.restaurantPicker || restaurants) as HomeRestaurant[];
  const popularFoods = (data?.popularFoods || []) as PopularFoodGridItem[];
  const openCount = data?.meta?.openCount ?? 0;

  const featuredRestaurantIds = useMemo(() => {
    const ids = new Set<string>();
    featuredRestaurants.forEach((r) => ids.add(r.id));
    featuredFoods.forEach((f) => ids.add(f.restaurant.id));
    return ids;
  }, [featuredRestaurants, featuredFoods]);

  const filterOptions = useMemo(
    () => ({ featuredRestaurantIds }),
    [featuredRestaurantIds],
  );

  const visibleFeaturedRestaurants = useMemo(
    () => applyHomeDiscoverFilters(featuredRestaurants, homeFilters, filterOptions),
    [featuredRestaurants, homeFilters, filterOptions],
  );
  const visibleFeaturedFoods = useMemo(
    () => applyHomeDiscoverFiltersToFoods(featuredFoods, homeFilters),
    [featuredFoods, homeFilters],
  );
  const visibleRestaurants = useMemo(
    () => applyHomeDiscoverFilters(restaurants, homeFilters, filterOptions),
    [restaurants, homeFilters, filterOptions],
  );
  const visibleFoods = useMemo(
    () => applyHomeDiscoverFiltersToFoods(popularFoods, homeFilters),
    [popularFoods, homeFilters],
  );
  const filtersActive = hasActiveHomeDiscoverFilters(homeFilters);
  const listLimit = filtersActive ? 30 : 12;
  const foodLimit = filtersActive ? 30 : 12;

  const toggleBrowse = (id: string) => {
    setSelectedBrowse((prev) => (prev === id ? 'all' : id));
  };
  const toggleCuisine = (id: string) => {
    const normalized = normalizeCuisineFilterId(id) || id;
    setSelectedCuisine((prev) => {
      const prevNorm = normalizeCuisineFilterId(prev) || prev;
      return prevNorm === normalized ? 'all' : normalized;
    });
  };

  const goSearch = () => {
    router.push({
      pathname: '/(tabs)/search',
      params: {
        ...(selectedBrowse !== 'all' ? { section: selectedBrowse } : {}),
        ...(selectedCuisine !== 'all' ? { cuisine: selectedCuisine } : {}),
        ...(selectedRestaurantId ? { restaurantId: selectedRestaurantId } : {}),
      },
    });
  };

  const renderRestaurantGridCard = (r: HomeRestaurant) => (
    <RestaurantGridCard
      key={r.id}
      name={r.name}
      coverImage={r.coverImage}
      rating={(r.rating as number) || 0}
      reviewCount={r.reviewCount}
      deliveryTimeMin={(r.deliveryTimeMin as number) || 30}
      deliveryFee={r.deliveryFee}
      distanceKm={r.distanceKm}
      isOpen={r.isOpen !== false}
      isBusy={r.isBusy}
      isFeatured={r.isFeatured}
      categories={r.categories}
      displayCategories={r.displayCategories}
      onPress={() => router.push(`/restaurant/${r.slug}`)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Deliver to</Text>
            <Text style={styles.location}>📍 Makeni, Sierra Leone</Text>
          </View>
          {!isAuthenticated && (
            <View style={styles.authRow}>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.authBtn}>
                <Text style={styles.authBtnText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(auth)/register/')} style={styles.authBtnOutline}>
                <Text style={styles.authBtnOutlineText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartBtn}>
            <Ionicons name="bag" size={22} color={colors.gold} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.searchBox} onPress={goSearch} activeOpacity={0.9}>
          <Ionicons name="search" size={22} color={colors.softGray} />
          <Text style={styles.searchPlaceholder}>Search restaurants, dishes, cuisines…</Text>
          <Ionicons name="options-outline" size={22} color={colors.gold} />
        </TouchableOpacity>

        {connectionError && (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={28} color="#f87171" />
            <Text style={styles.errorTitle}>Cannot load restaurants</Text>
            <Text style={styles.errorUrl}>API: {API_URL}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {banners.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll}>
            {banners.map((b: { id: string; title: string; subtitle?: string; imageUrl: string }) => (
              <TouchableOpacity key={b.id} style={styles.banner} onPress={goSearch} activeOpacity={0.9}>
                <AppImage uri={b.imageUrl} style={styles.bannerImage} containerStyle={styles.bannerImage} />
                <View style={styles.bannerOverlay}>
                  <Text style={styles.bannerTitle}>{b.title}</Text>
                  {b.subtitle && <Text style={styles.bannerSub}>{b.subtitle}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.discoverHead}>
          <Text style={styles.discoverLabel}>Discover</Text>
          <TouchableOpacity onPress={goSearch}>
            <Text style={styles.discoverSeeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickRow}>
          {HOME_DISCOVER_FILTERS.map((f) => {
            const active = selectedBrowse === f.id;
            const label =
              f.id === 'fast_delivery' ? 'Fastest' : f.id === 'featured' ? 'Featured' : f.label;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.quickCard, active && styles.quickCardActive]}
                onPress={() => toggleBrowse(f.id)}
              >
                <Ionicons name={f.icon} size={15} color={active ? colors.darkBlue : colors.gold} />
                <Text style={[styles.quickLabel, active && styles.quickLabelActive]} numberOfLines={1}>
                  {label}
                </Text>
                {f.id === 'open_now' && (
                  <Text style={styles.quickSub}>{openCount}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {restaurantPicker.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.filterSectionLabel}>Restaurants</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedRestaurantId(null);
                  goSearch();
                }}
              >
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[
                  styles.restaurantChip,
                  !selectedRestaurantId && styles.restaurantChipActive,
                ]}
                onPress={() => setSelectedRestaurantId(null)}
              >
                <View style={styles.restaurantChipIconAll}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.gold} />
                </View>
                <Text
                  style={[
                    styles.restaurantChipLabel,
                    !selectedRestaurantId && styles.restaurantChipLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  All
                </Text>
              </TouchableOpacity>
              {restaurantPicker.map((r) => {
                const active = selectedRestaurantId === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.restaurantChip, active && styles.restaurantChipActive]}
                    onPress={() => setSelectedRestaurantId(active ? null : r.id)}
                    onLongPress={() => router.push(`/restaurant/${r.slug}`)}
                  >
                    <AppImage
                      uri={r.coverImage || r.logoUrl}
                      style={styles.restaurantChipImage}
                      containerStyle={styles.restaurantChipImage}
                    />
                    <Text
                      style={[
                        styles.restaurantChipLabel,
                        active && styles.restaurantChipLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.filterSectionLabel}>Cuisine</Text>
          <TouchableOpacity onPress={goSearch}>
            <Text style={styles.seeAll}>Filter →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CUISINE_FILTERS.filter((f) => f.id !== 'all').map((f) => {
            const cuisineId = normalizeCuisineFilterId(f.id) || f.id;
            const active =
              selectedCuisine !== 'all' &&
              (normalizeCuisineFilterId(selectedCuisine) || selectedCuisine) === cuisineId;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.cuisineChip, active && styles.cuisineChipActive]}
                onPress={() => toggleCuisine(f.id)}
              >
                <Text style={styles.cuisineEmoji}>{f.emoji}</Text>
                <Text style={[styles.cuisineLabel, active && styles.cuisineLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {(visibleFeaturedRestaurants.length > 0 || selectedBrowse === 'featured') && (
          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInset]}>Featured restaurants</Text>
            <Text style={styles.sectionSubtitleInset}>
              Restaurants marked featured in settings
            </Text>
            {visibleFeaturedRestaurants.length === 0 ? (
              <Text style={styles.emptyFilter}>
                No featured restaurants match your filters.
              </Text>
            ) : (
              <DiscoverGrid columns={gridColumns}>
                {visibleFeaturedRestaurants.slice(0, gridColumns * 2).map(renderRestaurantGridCard)}
              </DiscoverGrid>
            )}
          </View>
        )}

        {(visibleFeaturedFoods.length > 0 || selectedBrowse === 'featured') && (
          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInset]}>Featured dishes</Text>
            <Text style={styles.sectionSubtitleInset}>
              Menu items marked featured by restaurants
            </Text>
            {visibleFeaturedFoods.length === 0 ? (
              <Text style={styles.emptyFilter}>
                No featured dishes yet. Owners can mark a menu item as Featured when editing a dish.
              </Text>
            ) : (
              <DiscoverGrid columns={gridColumns}>
                {visibleFeaturedFoods.slice(0, gridColumns * 2).map((item) => (
                  <PopularFoodGridCard
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/food/${item.id}`)}
                  />
                ))}
              </DiscoverGrid>
            )}
          </View>
        )}

        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Popular Restaurants Near You</Text>
            <Text style={styles.sectionSubtitle}>
              {usingDeviceLocation
                ? 'Sorted by distance from your location'
                : 'Enable location for closest picks · showing city favourites'}
            </Text>
          </View>
          <TouchableOpacity onPress={goSearch}>
            <Text style={styles.seeAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardSection}>
          {visibleRestaurants.length === 0 && filtersActive ? (
            <Text style={styles.emptyFilter}>
              No restaurants match these filters. Try another option or browse all.
            </Text>
          ) : (
            <DiscoverGrid columns={gridColumns}>
              {visibleRestaurants.slice(0, listLimit).map(renderRestaurantGridCard)}
            </DiscoverGrid>
          )}
        </View>

        <View style={[styles.sectionHead, styles.sectionHeadSpaced]}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Popular Foods That Fit Your Needs</Text>
            <Text style={styles.sectionSubtitle}>
              Top dishes from nearby restaurants · price, ratings & prep time
            </Text>
          </View>
        </View>

        <View style={styles.cardSection}>
          {visibleFoods.length === 0 ? (
            <Text style={styles.emptyFilter}>
              {filtersActive
                ? 'No dishes match your filters right now.'
                : 'Popular dishes will appear here as restaurants add menu items.'}
            </Text>
          ) : (
            <DiscoverGrid columns={gridColumns}>
              {visibleFoods.slice(0, foodLimit).map((item) => (
                <PopularFoodGridCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/food/${item.id}`)}
                />
              ))}
            </DiscoverGrid>
          )}
        </View>

        <TouchableOpacity style={styles.viewAllBtn} onPress={goSearch}>
          <Text style={styles.viewAllText}>Browse all restaurants & filters</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.darkBlue} />
        </TouchableOpacity>

        {isLoading && !connectionError && <Text style={styles.loading}>Loading restaurants…</Text>}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 8,
  },
  authRow: { flexDirection: 'row', gap: 6, marginRight: 4 },
  authBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  authBtnText: { color: colors.darkBlue, fontSize: 11, fontWeight: '700' },
  authBtnOutline: {
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  authBtnOutlineText: { color: colors.gold, fontSize: 11, fontWeight: '600' },
  greeting: { color: colors.softGray, fontSize: 13 },
  location: { color: colors.white, fontSize: 16, fontWeight: '600' },
  cartBtn: {
    padding: 10,
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.gold,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.darkBlue, fontSize: 10, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  searchPlaceholder: { flex: 1, color: colors.softGray, fontSize: 15 },
  bannerScroll: { paddingLeft: spacing.lg, marginBottom: spacing.md },
  banner: { width: 300, height: 140, marginRight: 12, borderRadius: radius.lg, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  bannerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  bannerSub: { color: colors.softGray, fontSize: 13 },
  discoverHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: 6,
  },
  discoverLabel: {
    color: colors.softGray,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discoverSeeAll: { color: colors.gold, fontSize: 11, fontWeight: '600' },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 6,
    marginBottom: spacing.md,
  },
  quickCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  quickCardActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  quickLabel: {
    color: colors.softGray,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  quickLabelActive: { color: colors.darkBlue },
  quickSub: { color: colors.softGray, fontSize: 8, marginTop: 1 },
  sectionSubtitleInset: {
    color: colors.softGray,
    fontSize: 12,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterSectionLabel: {
    color: colors.softGray,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  seeAll: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  chipScroll: { paddingLeft: spacing.lg, marginBottom: spacing.md },
  cuisineChip: {
    alignItems: 'center',
    marginRight: 12,
    padding: 12,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 76,
  },
  cuisineChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  cuisineEmoji: { fontSize: 22 },
  cuisineLabel: { color: colors.softGray, fontSize: 11, marginTop: 4, fontWeight: '600' },
  cuisineLabelActive: { color: colors.gold },
  restaurantChip: {
    alignItems: 'center',
    marginRight: 10,
    padding: 8,
    width: 88,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restaurantChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  restaurantChipImage: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },
  restaurantChipIconAll: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantChipLabel: {
    color: colors.softGray,
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  restaurantChipLabelActive: { color: colors.gold },
  emptyFilter: {
    color: colors.softGray,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  cardSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitleBlock: { flex: 1, paddingRight: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sectionTitleInset: { marginBottom: spacing.sm },
  sectionSubtitle: { color: colors.softGray, fontSize: 12, marginTop: 4, lineHeight: 16 },
  sectionHeadSpaced: { marginTop: spacing.lg },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 16,
    backgroundColor: colors.gold,
    borderRadius: radius.lg,
  },
  viewAllText: { color: colors.darkBlue, fontWeight: '700', fontSize: 15 },
  loading: { color: colors.softGray, textAlign: 'center', padding: 20 },
  errorBox: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: { color: colors.white, fontWeight: '700', fontSize: 16 },
  errorUrl: { color: colors.gold, fontSize: 12 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
  },
  retryText: { color: colors.darkBlue, fontWeight: '700' },
});
