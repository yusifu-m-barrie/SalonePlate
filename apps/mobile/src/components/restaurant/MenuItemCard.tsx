import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppImage } from '../ui/AppImage';
import { colors, spacing, radius } from '../../constants/theme';
import { formatCurrency } from '../../lib/currency';

export type MenuItemCardData = {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  prepTimeMin?: number;
  isPopular?: boolean;
  avgRating?: number | null;
  ratingCount?: number;
};

type Props = {
  item: MenuItemCardData;
  categoryName: string;
  restaurantOpen: boolean;
  onPress: () => void;
  onAdd: () => void;
};

export function MenuItemCard({ item, categoryName, restaurantOpen, onPress, onAdd }: Props) {
  const hasReviews = (item.ratingCount ?? 0) > 0 && item.avgRating != null && item.avgRating > 0;
  const rating = hasReviews ? item.avgRating! : null;
  const ratingLabel = hasReviews ? `(${item.ratingCount})` : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.topRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
        {rating != null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={colors.gold} />
            <Text style={styles.ratingText}>
              {rating.toFixed(1)}
              {ratingLabel ? ` ${ratingLabel}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <AppImage uri={item.imageUrl} style={styles.image} containerStyle={styles.imageWrap} />

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {item.description?.trim() || 'Freshly prepared for you. Tap for full details.'}
          </Text>

          <View style={styles.footer}>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>{formatCurrency(item.price)}</Text>
              {item.compareAtPrice != null && item.compareAtPrice > item.price && (
                <Text style={styles.comparePrice}>{formatCurrency(item.compareAtPrice)}</Text>
              )}
            </View>
            {item.prepTimeMin != null && item.prepTimeMin > 0 && (
              <View style={styles.prepBadge}>
                <Ionicons name="time-outline" size={12} color={colors.softGray} />
                <Text style={styles.prepText}>{item.prepTimeMin} min</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, !restaurantOpen && styles.addBtnDisabled]}
          onPress={(e) => {
            e.stopPropagation?.();
            onAdd();
          }}
          disabled={!restaurantOpen}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={22} color={colors.darkBlue} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryPill: {
    flex: 1,
    maxWidth: '65%',
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  categoryPillText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    color: colors.softGray,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: 96,
    height: 96,
  },
  details: {
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  name: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  description: {
    color: colors.softGray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  price: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '800',
  },
  comparePrice: {
    color: colors.softGray,
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  prepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  prepText: {
    color: colors.softGray,
    fontSize: 11,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
});
