import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useCartStore } from '../../src/stores/cartStore';
import { Button } from '../../src/components/ui/Button';
import { MenuItemCard, type MenuItemCardData } from '../../src/components/restaurant/MenuItemCard';
import { colors, spacing, radius } from '../../src/constants/theme';
import { formatCurrency } from '../../src/lib/currency';
import { safeGoBack } from '../../src/lib/safeNavigation';
import { AppImage } from '../../src/components/ui/AppImage';
import { useAuthStore } from '../../src/stores/authStore';
import { appAlert } from '../../src/lib/appAlert';
import { resolveImageUrl } from '../../src/lib/imageUrl';
import {
  cuisineFiltersForRestaurant,
  displayCuisineLabel,
  filterMenuCategoriesByCuisine,
  normalizeCuisineFilterId,
  pickRestaurantHeroImage,
  restaurantDisplayDescription,
} from '../../src/lib/cuisineMenu';

type MenuItem = MenuItemCardData & {
  galleryUrls?: string[];
  tags?: string[];
};

type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export default function RestaurantScreen() {
  const { slug, cuisine: cuisineParam } = useLocalSearchParams<{ slug: string; cuisine?: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [menuCuisine, setMenuCuisine] = useState<string | null>(null);

  useEffect(() => {
    setMenuCuisine(normalizeCuisineFilterId(cuisineParam));
  }, [cuisineParam]);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async () => {
      const { data } = await api.get(`/restaurants/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data as { favorites: { restaurantId: string; restaurant?: { id: string } }[] };
    },
    enabled: isAuthenticated,
  });

  const isFavorite =
    !!restaurant &&
    (profile?.favorites || []).some(
      (f) => f.restaurantId === restaurant.id || f.restaurant?.id === restaurant.id,
    );

  const toggleFavorite = useMutation({
    mutationFn: () => api.post(`/restaurants/${restaurant!.id}/favorite`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      const favorited = (res.data as { favorited?: boolean })?.favorited;
      appAlert(favorited ? 'Saved' : 'Removed', favorited ? 'Added to favorites' : 'Removed from favorites');
    },
  });

  const allCategories: MenuCategory[] = useMemo(
    () =>
      (restaurant?.menuCategories || []).filter((c: MenuCategory) => c.items?.length > 0),
    [restaurant?.menuCategories],
  );
  const profileCuisines = useMemo(
    () =>
      (restaurant?.effectiveCategories as string[] | undefined) ||
      (restaurant?.categories as string[] | undefined),
    [restaurant?.effectiveCategories, restaurant?.categories],
  );
  const restaurantCuisineChips = useMemo(
    () => cuisineFiltersForRestaurant(profileCuisines, allCategories),
    [profileCuisines, allCategories],
  );
  const heroImage = useMemo(
    () =>
      (restaurant?.heroImage as string | undefined) ||
      (restaurant ? pickRestaurantHeroImage(restaurant) : undefined),
    [restaurant],
  );
  const categories = useMemo(
    () => filterMenuCategoriesByCuisine(allCategories, menuCuisine),
    [allCategories, menuCuisine],
  );
  const uncategorized: MenuItem[] = useMemo(
    () => (menuCuisine || !restaurant ? [] : restaurant.menuItems || []),
    [menuCuisine, restaurant?.menuItems],
  );
  const totalVisibleItems =
    categories.reduce((n, c) => n + c.items.length, 0) + uncategorized.length;

  if (!restaurant) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.softGray }}>Loading...</Text>
      </View>
    );
  }

  const openItem = (item: MenuItem) => setSelectedItem(item);

  const addToCart = (item: MenuItem) => {
    if (!restaurant.isOpen) return;
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: resolveImageUrl(item.imageUrl),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
    setSelectedItem(null);
  };

  return (
    <View style={styles.container}>
      <AppImage uri={heroImage} style={styles.cover} containerStyle={styles.cover} />
      <SafeAreaView style={styles.backBtn}>
        <TouchableOpacity onPress={() => safeGoBack('/(tabs)')} style={styles.backCircle}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => toggleFavorite.mutate()}
            disabled={toggleFavorite.isPending}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={colors.gold} />
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.info}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {!restaurant.isOpen && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedText}>Currently closed — ordering unavailable</Text>
            </View>
          )}
          <View style={styles.meta}>
            <Ionicons name="star" size={16} color={colors.gold} />
            <Text style={styles.metaText}>
              {restaurant.rating?.toFixed(1)} ({restaurant.reviewCount})
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.metaText}>
              {restaurant.deliveryTimeMin}-{restaurant.deliveryTimeMax} min
            </Text>
            {restaurant.isBusy && <Text style={styles.busy}> · Busy</Text>}
          </View>
          <Text style={styles.desc}>{restaurantDisplayDescription(restaurant.description)}</Text>
          {profileCuisines && profileCuisines.length > 0 && (
            <View style={styles.cuisineTags}>
              {profileCuisines.map((tag) => (
                <View key={tag} style={styles.cuisineTag}>
                  <Text style={styles.cuisineTagText}>{displayCuisineLabel(tag)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {allCategories.length > 0 && (
          <View style={styles.filterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.menuFilterRow}
            >
              <TouchableOpacity
                style={[styles.menuFilterChip, !menuCuisine && styles.menuFilterChipActive]}
                onPress={() => setMenuCuisine(null)}
              >
                <Text style={[styles.menuFilterText, !menuCuisine && styles.menuFilterTextActive]}>
                  All menu
                </Text>
              </TouchableOpacity>
              {restaurantCuisineChips.map((c) => {
                const active = menuCuisine === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.menuFilterChip, active && styles.menuFilterChipActive]}
                    onPress={() => setMenuCuisine(c.id)}
                  >
                    <Text style={styles.menuFilterEmoji}>{c.emoji}</Text>
                    <Text style={[styles.menuFilterText, active && styles.menuFilterTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <Text style={styles.menuSubtitle}>
              {totalVisibleItems} {totalVisibleItems === 1 ? 'dish' : 'dishes'} available
            </Text>
          </View>

          {menuCuisine && categories.length === 0 && (
            <Text style={styles.menuFilterEmpty}>
              No dishes in {displayCuisineLabel(menuCuisine)} yet. Try &quot;All menu&quot;.
            </Text>
          )}

          {categories.map((cat) => (
            <View key={cat.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{cat.name}</Text>
                <Text style={styles.categoryCount}>
                  {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
              {cat.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  categoryName={cat.name}
                  restaurantOpen={restaurant.isOpen}
                  onPress={() => openItem(item)}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </View>
          ))}

          {uncategorized.length > 0 && (
            <View style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                  {categories.length === 0 ? 'Menu' : 'More dishes'}
                </Text>
                <Text style={styles.categoryCount}>{uncategorized.length} items</Text>
              </View>
              {uncategorized.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  categoryName="Chef's picks"
                  restaurantOpen={restaurant.isOpen}
                  onPress={() => openItem(item)}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <Button title={`View Cart (${cartCount})`} onPress={() => router.push('/cart')} />
        </View>
      )}

      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <AppImage uri={selectedItem.imageUrl} style={styles.modalHero} containerStyle={styles.modalHero} />
                <Text style={styles.modalName}>{selectedItem.name}</Text>
                <View style={styles.modalMetaRow}>
                  {selectedItem.avgRating != null && selectedItem.avgRating > 0 && (
                    <View style={styles.modalRating}>
                      <Ionicons name="star" size={16} color={colors.gold} />
                      <Text style={styles.modalRatingText}>
                        {selectedItem.avgRating.toFixed(1)}
                        {selectedItem.ratingCount ? ` (${selectedItem.ratingCount} reviews)` : ''}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.modalPrice}>{formatCurrency(selectedItem.price)}</Text>
                </View>
                {selectedItem.description ? (
                  <Text style={styles.modalDesc}>{selectedItem.description}</Text>
                ) : null}

                {(selectedItem.galleryUrls?.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.galleryLabel}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                      {selectedItem.galleryUrls!.map((url) => (
                        <AppImage key={url} uri={url} style={styles.galleryImage} containerStyle={styles.galleryImage} />
                      ))}
                    </ScrollView>
                  </>
                )}

                <View style={styles.modalActions}>
                  <Button
                    title={restaurant.isOpen ? 'Add to cart' : 'Closed'}
                    disabled={!restaurant.isOpen}
                    onPress={() => addToCart(selectedItem)}
                  />
                  <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.closeLink}>
                    <Text style={styles.closeText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.darkBlue },
  cover: { width: '100%', height: 240 },
  backBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.darkBlue,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  info: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  name: { fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.3 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  metaText: { color: colors.softGray, marginLeft: 4, fontSize: 14 },
  dot: { color: colors.softGray, marginHorizontal: 6 },
  busy: { color: '#EAB308', fontSize: 14 },
  closedBanner: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    padding: 12,
    borderRadius: radius.md,
    marginTop: 12,
  },
  closedText: { color: '#FCA5A5', fontSize: 13 },
  desc: { color: colors.softGray, marginTop: 14, lineHeight: 22, fontSize: 15 },
  cuisineTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cuisineTag: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  cuisineTagText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  filterSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuFilterRow: {
    paddingHorizontal: spacing.lg,
    gap: 10,
    alignItems: 'center',
    paddingVertical: 4,
  },
  menuFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  menuFilterChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
  menuFilterEmoji: { fontSize: 15 },
  menuFilterText: { color: colors.softGray, fontSize: 14, fontWeight: '600' },
  menuFilterTextActive: { color: colors.gold },
  menuSection: {
    paddingTop: spacing.lg,
  },
  menuHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  menuSubtitle: {
    color: colors.softGray,
    fontSize: 14,
    marginTop: 4,
  },
  menuFilterEmpty: {
    color: colors.softGray,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  categoryBlock: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: 12,
  },
  categoryTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  categoryCount: {
    color: colors.softGray,
    fontSize: 12,
    fontWeight: '600',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.darkBlue,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.darkBlue,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    padding: spacing.lg,
  },
  modalHero: { width: '100%', height: 220, borderRadius: radius.lg, marginBottom: spacing.md },
  modalName: { color: colors.white, fontSize: 24, fontWeight: '800' },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  modalRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalRatingText: { color: colors.softGray, fontSize: 14, fontWeight: '600' },
  modalPrice: { color: colors.gold, fontSize: 20, fontWeight: '800' },
  modalDesc: { color: colors.softGray, marginTop: spacing.md, lineHeight: 24, fontSize: 15 },
  galleryLabel: {
    color: colors.white,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  galleryScroll: { marginBottom: spacing.md },
  galleryImage: {
    width: width * 0.55,
    height: 140,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  modalActions: { marginTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.md },
  closeLink: { alignItems: 'center', paddingVertical: 8 },
  closeText: { color: colors.softGray },
});
