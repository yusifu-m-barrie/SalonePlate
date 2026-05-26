import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { RestaurantCard } from '../../src/components/restaurant/RestaurantCard';
import { colors, spacing, radius } from '../../src/constants/theme';
import {
  BROWSE_FILTERS,
  CUISINE_FILTERS,
  SORT_OPTIONS,
} from '../../src/constants/discoverFilters';
import { normalizeCuisineFilterId } from '../../src/lib/cuisineMenu';

const CITY_SLUG = 'makeni';

type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  coverImage?: string;
  rating: number;
  reviewCount: number;
  deliveryTimeMin: number;
  deliveryFee?: number;
  isOpen: boolean;
  isBusy?: boolean;
  categories?: string[];
  displayCategories?: string[];
};

export default function SearchScreen() {
  const params = useLocalSearchParams<{ section?: string; cuisine?: string; restaurantId?: string }>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const [browse, setBrowse] = useState(params.section || 'all');
  const [cuisine, setCuisine] = useState(params.cuisine || 'all');
  const [restaurantId, setRestaurantId] = useState(params.restaurantId || '');
  const [sort, setSort] = useState('rating');
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    if (params.section) setBrowse(params.section);
    if (params.cuisine) {
      setCuisine(normalizeCuisineFilterId(params.cuisine) || params.cuisine);
    }
    if (params.restaurantId) setRestaurantId(params.restaurantId);
  }, [params.section, params.cuisine, params.restaurantId]);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { limit: '50', sort };
    if (debouncedSearch.trim().length > 0) p.search = debouncedSearch.trim();
    if (browse !== 'all') p.section = browse;
    if (cuisine !== 'all') p.cuisine = normalizeCuisineFilterId(cuisine) || cuisine;
    if (restaurantId) p.restaurantId = restaurantId;
    return p;
  }, [debouncedSearch, browse, cuisine, sort, restaurantId]);

  const { data, isLoading, isFetching, isRefetching, refetch, isError } = useQuery({
    queryKey: ['discover-search', CITY_SLUG, queryParams],
    queryFn: async () => {
      const { data } = await api.get(`/restaurants/discover/${CITY_SLUG}`, { params: queryParams });
      return data as {
        restaurants: RestaurantRow[];
        meta: { total: number; openCount: number; city: { name: string } };
      };
    },
  });

  const restaurants = data?.restaurants || [];
  const total = data?.meta?.total ?? 0;
  const openCount = data?.meta?.openCount ?? 0;
  const showListLoader = (isLoading || isFetching) && restaurants.length === 0;

  const clearFilters = () => {
    setBrowse('all');
    setCuisine('all');
    setRestaurantId('');
    setSort('rating');
    setSearch('');
  };

  const activeFilterCount =
    (browse !== 'all' ? 1 : 0) +
    (cuisine !== 'all' ? 1 : 0) +
    (restaurantId ? 1 : 0) +
    (debouncedSearch.trim() ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.stickyHeader}>
        <View style={styles.topRow}>
          <Text style={styles.screenTitle}>Browse restaurants</Text>
          <Text style={styles.cityMeta}>
            {data?.meta?.city?.name || 'Makeni'} · {openCount} open now
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.softGray} />
          <TextInput
            placeholder="Restaurant, dish, or cuisine…"
            placeholderTextColor={colors.softGray}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={12}>
              <Ionicons name="close-circle" size={20} color={colors.softGray} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort((v) => !v)}>
            <Ionicons name="swap-vertical" size={18} color={colors.gold} />
            <Text style={styles.sortBtnText}>
              {SORT_OPTIONS.find((s) => s.id === sort)?.label || 'Sort'}
            </Text>
          </TouchableOpacity>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear ({activeFilterCount})</Text>
            </TouchableOpacity>
          )}
        </View>

        {showSort && (
          <View style={styles.sortPanel}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortOption, sort === opt.id && styles.sortOptionActive]}
                onPress={() => {
                  setSort(opt.id);
                  setShowSort(false);
                }}
              >
                <Text style={[styles.sortOptionText, sort === opt.id && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sort === opt.id && <Ionicons name="checkmark" size={18} color={colors.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.filterSectionLabel}>Discover</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {BROWSE_FILTERS.map((f) => {
            const active = browse === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setBrowse(f.id)}
              >
                <Ionicons name={f.icon} size={16} color={active ? colors.darkBlue : colors.gold} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.filterSectionLabel}>Cuisine type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {CUISINE_FILTERS.map((f) => {
            const active = cuisine === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.cuisineChip, active && styles.chipActive]}
                onPress={() => setCuisine(f.id)}
              >
                <Text style={styles.cuisineEmoji}>{f.emoji}</Text>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {!showListLoader ? `${total} restaurant${total !== 1 ? 's' : ''}` : ' '}
          </Text>
        </View>
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
        }
        renderItem={({ item }) => (
          <RestaurantCard
            name={item.name}
            coverImage={item.coverImage}
            rating={item.rating || 0}
            reviewCount={item.reviewCount}
            deliveryTimeMin={item.deliveryTimeMin || 30}
            deliveryFee={item.deliveryFee}
            isOpen={item.isOpen !== false}
            isBusy={item.isBusy}
            categories={item.categories}
            displayCategories={item.displayCategories}
            onPress={() =>
              router.push({
                pathname: `/restaurant/${item.slug}`,
                params:
                  cuisine !== 'all'
                    ? { cuisine: normalizeCuisineFilterId(cuisine) || cuisine }
                    : {},
              })
            }
          />
        )}
        ListEmptyComponent={
          showListLoader ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : isError ? (
            <Text style={styles.empty}>Could not load restaurants. Pull to refresh.</Text>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="restaurant-outline" size={48} color={colors.softGray} />
              <Text style={styles.emptyTitle}>No restaurants match</Text>
              <Text style={styles.empty}>Try another filter or clear your search</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={clearFilters}>
                <Text style={styles.emptyBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.darkBlue,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 100 },
  topRow: { marginBottom: spacing.md },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.white },
  cityMeta: { color: colors.softGray, fontSize: 13, marginTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 16 },
  filterBar: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 10 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  sortBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  sortPanel: {
    marginTop: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionActive: { backgroundColor: 'rgba(212,175,55,0.08)' },
  sortOptionText: { color: colors.white, fontSize: 15 },
  sortOptionTextActive: { color: colors.gold, fontWeight: '600' },
  filterSectionLabel: {
    color: colors.softGray,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipScroll: { marginBottom: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cuisineChip: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 72,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.softGray, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.darkBlue },
  cuisineEmoji: { fontSize: 20, marginBottom: 2 },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resultsCount: { color: colors.white, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.softGray, textAlign: 'center', fontSize: 14, marginTop: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginTop: spacing.md },
  emptyBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.gold,
    borderRadius: radius.md,
  },
  emptyBtnText: { color: colors.darkBlue, fontWeight: '700' },
});
