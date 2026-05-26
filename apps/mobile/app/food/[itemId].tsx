import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useCartStore } from '../../src/stores/cartStore';
import { Button } from '../../src/components/ui/Button';
import { AppImage } from '../../src/components/ui/AppImage';
import { colors, spacing, radius } from '../../src/constants/theme';
import { formatCurrency } from '../../src/lib/currency';
import { safeGoBack } from '../../src/lib/safeNavigation';
import { resolveImageUrl } from '../../src/lib/imageUrl';

type FoodDetail = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  galleryUrls?: string[];
  prepTimeMin?: number;
  avgRating?: number | null;
  ratingCount?: number;
  categoryName?: string;
  isPopular?: boolean;
  isFeatured?: boolean;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    isOpen: boolean;
    isBusy?: boolean;
    rating?: number;
    reviewCount?: number;
    deliveryTimeMin?: number;
    deliveryTimeMax?: number;
    coverImage?: string | null;
  };
};

export default function FoodDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const { data: food, isLoading, isError } = useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: async () => {
      const { data } = await api.get<FoodDetail>(`/restaurants/menu-items/${itemId}`);
      return data;
    },
    enabled: !!itemId,
  });

  const addToCart = () => {
    if (!food || !food.restaurant.isOpen) return;
    addItem({
      menuItemId: food.id,
      name: food.name,
      price: food.price,
      quantity: 1,
      imageUrl: resolveImageUrl(food.imageUrl),
      restaurantId: food.restaurant.id,
      restaurantName: food.restaurant.name,
    });
    router.push('/cart');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading dish…</Text>
      </View>
    );
  }

  if (isError || !food) {
    return (
      <View style={styles.centered}>
        <Ionicons name="restaurant-outline" size={48} color={colors.softGray} />
        <Text style={styles.errorTitle}>Dish not found</Text>
        <Button title="Go back" variant="outline" onPress={() => safeGoBack('/(tabs)')} />
      </View>
    );
  }

  const hasReviews =
    (food.ratingCount ?? 0) > 0 && food.avgRating != null && food.avgRating > 0;
  const restaurant = food.restaurant;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          <AppImage uri={food.imageUrl ?? undefined} style={styles.hero} containerStyle={styles.hero} />
          <SafeAreaView style={styles.topBar} edges={['top']}>
            <TouchableOpacity onPress={() => safeGoBack('/(tabs)')} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            {cartCount > 0 && (
              <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartBtn}>
                <Ionicons name="bag" size={20} color={colors.gold} />
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </SafeAreaView>
          {food.categoryName ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{food.categoryName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{food.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(food.price)}</Text>
            {food.compareAtPrice != null && food.compareAtPrice > food.price && (
              <Text style={styles.comparePrice}>{formatCurrency(food.compareAtPrice)}</Text>
            )}
          </View>

          <View style={styles.chipsRow}>
            {hasReviews && (
              <View style={styles.chip}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={styles.chipText}>
                  {food.avgRating!.toFixed(1)} ({food.ratingCount} reviews)
                </Text>
              </View>
            )}
            {food.prepTimeMin != null && food.prepTimeMin > 0 && (
              <View style={styles.chip}>
                <Ionicons name="timer-outline" size={14} color={colors.softGray} />
                <Text style={styles.chipText}>{food.prepTimeMin} min prep</Text>
              </View>
            )}
            {food.isFeatured && (
              <View style={[styles.chip, styles.chipFeatured]}>
                <Ionicons name="ribbon" size={14} color={colors.darkBlue} />
                <Text style={[styles.chipText, styles.chipFeaturedText]}>Featured</Text>
              </View>
            )}
            {food.isPopular && (
              <View style={[styles.chip, styles.chipPopular]}>
                <Ionicons name="flame" size={14} color={colors.gold} />
                <Text style={styles.chipText}>Popular</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => router.push(`/restaurant/${restaurant.slug}`)}
            activeOpacity={0.9}
          >
            <AppImage
              uri={restaurant.coverImage ?? undefined}
              style={styles.restaurantThumb}
              containerStyle={styles.restaurantThumb}
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantLabel}>From restaurant</Text>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {restaurant.name}
              </Text>
              <View style={styles.restaurantMeta}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={styles.restaurantMetaText}>
                  {restaurant.rating?.toFixed(1) ?? '—'} · {restaurant.deliveryTimeMin}–
                  {restaurant.deliveryTimeMax} min delivery
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.softGray} />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>
            {food.description?.trim() ||
              'Freshly prepared to order. Add to your cart and enjoy delivery from this restaurant.'}
          </Text>

          {(food.galleryUrls?.length ?? 0) > 0 && (
            <>
              <Text style={styles.sectionLabel}>More photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {food.galleryUrls!.map((url) => (
                  <AppImage key={url} uri={url} style={styles.galleryImage} containerStyle={styles.galleryImage} />
                ))}
              </ScrollView>
            </>
          )}

          {!restaurant.isOpen && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedText}>
                {restaurant.name} is closed — you can browse but ordering is unavailable.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <Button
          title={restaurant.isOpen ? 'Add to cart' : 'Restaurant closed'}
          disabled={!restaurant.isOpen}
          onPress={addToCart}
        />
        <TouchableOpacity
          style={styles.viewMenuLink}
          onPress={() => router.push(`/restaurant/${restaurant.slug}`)}
        >
          <Text style={styles.viewMenuText}>View full restaurant menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  scroll: { paddingBottom: 120 },
  centered: {
    flex: 1,
    backgroundColor: colors.darkBlue,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  muted: { color: colors.softGray },
  errorTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 280 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.gold,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: colors.darkBlue, fontSize: 10, fontWeight: '800' },
  categoryPill: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.md,
    backgroundColor: 'rgba(13,27,42,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  categoryText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  body: {
    marginTop: -20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.darkBlue,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: { color: colors.white, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: spacing.sm },
  price: { color: colors.gold, fontSize: 24, fontWeight: '800' },
  comparePrice: {
    color: colors.softGray,
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPopular: { borderColor: 'rgba(212,175,55,0.35)' },
  chipFeatured: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipFeaturedText: { color: colors.darkBlue },
  chipText: { color: colors.softGray, fontSize: 12, fontWeight: '600' },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: 12,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  restaurantThumb: { width: 56, height: 56, borderRadius: radius.sm },
  restaurantInfo: { flex: 1 },
  restaurantLabel: { color: colors.softGray, fontSize: 11, fontWeight: '600' },
  restaurantName: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 2 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  restaurantMetaText: { color: colors.softGray, fontSize: 11 },
  sectionLabel: {
    color: colors.softGray,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: { color: colors.white, fontSize: 15, lineHeight: 22 },
  gallery: { marginBottom: spacing.md },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    marginRight: 10,
  },
  closedBanner: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  closedText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.darkBlue,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewMenuLink: { alignItems: 'center', paddingVertical: spacing.md },
  viewMenuText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
});
