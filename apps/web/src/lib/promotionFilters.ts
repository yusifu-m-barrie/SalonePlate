export type PromoFilterId =
  | 'all'
  | 'used'
  | 'unused'
  | 'active'
  | 'inactive'
  | 'expired'
  | 'platform'
  | 'restaurant';

export type PromoWithStats = {
  id: string;
  code: string;
  title: string;
  type: string;
  value: number;
  isActive: boolean;
  isUsed?: boolean;
  isExpired?: boolean;
  usedCount: number;
  usageLimit?: number | null;
  restaurantId?: string | null;
  restaurant?: { id: string; name: string } | null;
  expiresAt?: string | null;
  stats: {
    orderCount: number;
    uniqueCustomers: number;
    totalDiscount: number;
    totalOrderValue: number;
    lastUsedAt?: string | null;
    restaurants: {
      id: string;
      name: string;
      orderCount: number;
      totalDiscount: number;
      totalOrderValue: number;
    }[];
  };
};

export const PROMO_FILTERS: { id: PromoFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'used', label: 'Used' },
  { id: 'unused', label: 'Never used' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Paused' },
  { id: 'expired', label: 'Expired' },
  { id: 'platform', label: 'Platform-wide' },
  { id: 'restaurant', label: 'Restaurant coupons' },
];

export function matchesPromoFilter(promo: PromoWithStats, filter: PromoFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'used') return promo.isUsed === true || promo.stats.orderCount > 0;
  if (filter === 'unused') return !promo.isUsed && promo.stats.orderCount === 0;
  if (filter === 'active') return promo.isActive && !promo.isExpired;
  if (filter === 'inactive') return !promo.isActive;
  if (filter === 'expired') return promo.isExpired === true;
  if (filter === 'platform') return !promo.restaurantId;
  if (filter === 'restaurant') return !!promo.restaurantId;
  return true;
}

export function promoFilterLabel(filter: PromoFilterId): string {
  return PROMO_FILTERS.find((f) => f.id === filter)?.label ?? 'All';
}
