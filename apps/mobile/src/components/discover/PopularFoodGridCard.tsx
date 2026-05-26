import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppImage } from '../ui/AppImage';
import { colors, radius } from '../../constants/theme';
import { formatCurrency } from '../../lib/currency';

export type PopularFoodGridItem = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  prepTimeMin?: number;
  isFeatured?: boolean;
  avgRating?: number | null;
  ratingCount?: number;
  categoryName?: string;
  restaurant: {
    name: string;
    slug: string;
    distanceKm?: number | null;
    isOpen?: boolean;
  };
};

type Props = {
  item: PopularFoodGridItem;
  onPress: () => void;
};

export function PopularFoodGridCard({ item, onPress }: Props) {
  const hasReviews =
    (item.ratingCount ?? 0) > 0 && item.avgRating != null && item.avgRating > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.imageWrap}>
        <AppImage uri={item.imageUrl ?? undefined} style={styles.image} containerStyle={styles.image} />
        {item.isFeatured && (
          <View style={styles.featuredRibbon}>
            <Ionicons name="ribbon" size={10} color={colors.darkBlue} />
            <Text style={styles.featuredRibbonText}>Featured</Text>
          </View>
        )}
        {item.categoryName ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.categoryName}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.restaurantRow}>
          <Ionicons name="storefront-outline" size={11} color={colors.gold} />
          <Text style={styles.restaurantName} numberOfLines={1}>
            {item.restaurant.name}
          </Text>
        </View>
        <View style={styles.metaRow}>
          {hasReviews ? (
            <View style={styles.ratingWrap}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text style={styles.metaText}>
                {item.avgRating!.toFixed(1)} ({item.ratingCount})
              </Text>
            </View>
          ) : null}
          {item.prepTimeMin != null && item.prepTimeMin > 0 && (
            <View style={styles.prepWrap}>
              <Ionicons name="timer-outline" size={11} color={colors.softGray} />
              <Text style={styles.metaMuted}>{item.prepTimeMin} min prep</Text>
            </View>
          )}
        </View>
        {item.restaurant.distanceKm != null && (
          <Text style={styles.distance}>{item.restaurant.distanceKm} km away</Text>
        )}
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 108 },
  featuredRibbon: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredRibbonText: { color: colors.darkBlue, fontSize: 9, fontWeight: '800' },
  categoryPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    maxWidth: '90%',
    backgroundColor: 'rgba(13,27,42,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  categoryText: { color: colors.gold, fontSize: 9, fontWeight: '700' },
  body: { padding: 10 },
  name: { color: colors.white, fontSize: 13, fontWeight: '700', lineHeight: 17, minHeight: 34 },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  restaurantName: { color: colors.softGray, fontSize: 11, flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  prepWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: colors.softGray, fontSize: 10 },
  metaMuted: { color: colors.softGray, fontSize: 10 },
  distance: { color: colors.softGray, fontSize: 10, marginTop: 4 },
  price: { color: colors.gold, fontSize: 14, fontWeight: '800', marginTop: 6 },
});
