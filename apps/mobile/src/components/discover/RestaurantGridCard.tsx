import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppImage } from '../ui/AppImage';
import { colors, radius } from '../../constants/theme';
import { formatCurrencyCompact } from '../../lib/currency';
import { restaurantCardCuisineTags } from '../../lib/cuisineMenu';

type Props = {
  name: string;
  coverImage?: string;
  rating: number;
  reviewCount?: number;
  deliveryTimeMin: number;
  deliveryFee?: number;
  distanceKm?: number | null;
  isOpen: boolean;
  isBusy?: boolean;
  isFeatured?: boolean;
  categories?: string[];
  displayCategories?: string[];
  onPress: () => void;
};

export function RestaurantGridCard({
  name,
  coverImage,
  rating,
  reviewCount,
  deliveryTimeMin,
  deliveryFee,
  distanceKm,
  isOpen,
  isBusy,
  isFeatured,
  categories,
  displayCategories,
  onPress,
}: Props) {
  const cuisineTags = restaurantCardCuisineTags(categories, displayCategories);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.imageWrap}>
        <AppImage uri={coverImage} style={styles.image} containerStyle={styles.image} />
        {isFeatured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="ribbon" size={10} color={colors.darkBlue} />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </View>
        )}
        {!isOpen && (
          <View style={styles.closedBadge}>
            <Text style={styles.badgeText}>Closed</Text>
          </View>
        )}
        {isBusy && isOpen && (
          <View style={styles.busyBadge}>
            <Text style={styles.badgeText}>Busy</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color={colors.gold} />
          <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
          {reviewCount != null && reviewCount > 0 && (
            <Text style={styles.metaText}>({reviewCount})</Text>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={11} color={colors.softGray} />
          <Text style={styles.metaMuted}>{deliveryTimeMin} min</Text>
          {distanceKm != null && (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="navigate-outline" size={11} color={colors.softGray} />
              <Text style={styles.metaMuted}>{distanceKm} km</Text>
            </>
          )}
        </View>
        {deliveryFee != null && (
          <Text style={styles.fee}>{formatCurrencyCompact(deliveryFee)} delivery</Text>
        )}
        {cuisineTags.length > 0 && (
          <View style={styles.tags}>
            {cuisineTags.slice(0, 2).map((c) => (
              <View key={c.id} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {c.label}
                </Text>
              </View>
            ))}
          </View>
        )}
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
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.gold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredBadgeText: { color: colors.darkBlue, fontSize: 9, fontWeight: '800' },
  closedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  busyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(234,179,8,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  body: { padding: 10 },
  name: { color: colors.white, fontSize: 13, fontWeight: '700', lineHeight: 17, minHeight: 34 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: colors.softGray, fontSize: 11 },
  metaMuted: { color: colors.softGray, fontSize: 10 },
  dot: { color: colors.softGray, fontSize: 10 },
  fee: { color: colors.gold, fontSize: 10, marginTop: 4, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '100%',
  },
  tagText: { color: colors.gold, fontSize: 9, fontWeight: '600' },
});
