import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppImage } from '../ui/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/theme';
import { formatCurrencyCompact } from '../../lib/currency';
import { restaurantCardCuisineTags } from '../../lib/cuisineMenu';

interface RestaurantCardProps {
  name: string;
  coverImage?: string;
  rating: number;
  reviewCount?: number;
  deliveryTimeMin: number;
  deliveryFee?: number;
  isOpen: boolean;
  isBusy?: boolean;
  categories?: string[];
  displayCategories?: string[];
  onPress: () => void;
}

export function RestaurantCard({
  name,
  coverImage,
  rating,
  reviewCount,
  deliveryTimeMin,
  deliveryFee,
  isOpen,
  isBusy,
  categories,
  displayCategories,
  onPress,
}: RestaurantCardProps) {
  const cuisineTags = restaurantCardCuisineTags(categories, displayCategories);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <AppImage uri={coverImage} style={styles.image} containerStyle={styles.image} />
      <View style={styles.overlay}>
        {!isOpen && <View style={styles.closedBadge}><Text style={styles.badgeText}>Closed</Text></View>}
        {isBusy && isOpen && <View style={styles.busyBadge}><Text style={styles.badgeText}>Busy</Text></View>}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.meta}>
          <Ionicons name="star" size={14} color={colors.gold} />
          <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
          {reviewCount != null && reviewCount > 0 && (
            <Text style={styles.metaText}> ({reviewCount})</Text>
          )}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{deliveryTimeMin} min</Text>
          {deliveryFee != null && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{formatCurrencyCompact(deliveryFee)} del.</Text>
            </>
          )}
        </View>
        {cuisineTags.length > 0 && (
          <View style={styles.tags}>
            {cuisineTags.slice(0, 3).map((c) => (
              <View key={c.id} style={styles.tag}>
                <Text style={styles.tagText}>{c.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cardBg },
  image: { width: '100%', height: 160 },
  overlay: { position: 'absolute', top: 12, right: 12 },
  closedBadge: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  busyBadge: { backgroundColor: 'rgba(234,179,8,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  info: { padding: 12 },
  name: { color: colors.white, fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { color: colors.softGray, fontSize: 13, marginLeft: 4 },
  dot: { color: colors.softGray, marginHorizontal: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  tagText: { color: colors.gold, fontSize: 10, fontWeight: '600' },
});
