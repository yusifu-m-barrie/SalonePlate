export type ActivityFilterId =
  | 'all'
  | 'rating'
  | 'placed'
  | 'awaiting'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type ActivityFeedItem = {
  type: string;
  status?: string;
  orderStatus?: string;
};

export const ACTIVITY_FILTERS: { id: ActivityFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rating', label: 'Ratings' },
  { id: 'placed', label: 'Order placed' },
  { id: 'awaiting', label: 'Awaiting restaurant' },
  { id: 'accepted', label: 'Confirmed' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'on_the_way', label: 'On the way' },
  { id: 'delivered', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
];

export function matchesActivityFilter(item: ActivityFeedItem, filter: ActivityFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'rating') return item.type === 'RATING';
  if (filter === 'placed') return item.type === 'ORDER_PLACED' || item.status === 'PLACED';
  if (filter === 'awaiting') return item.orderStatus === 'PLACED';
  if (filter === 'accepted') return item.status === 'RESTAURANT_ACCEPTED';
  if (filter === 'preparing') return item.status === 'PREPARING';
  if (filter === 'ready') return item.status === 'RIDER_ASSIGNED';
  if (filter === 'on_the_way') return item.status === 'ON_THE_WAY';
  if (filter === 'delivered') return item.status === 'DELIVERED';
  if (filter === 'cancelled') return item.status === 'CANCELLED';
  if (filter === 'refunded') return item.status === 'REFUNDED';
  return true;
}

export function activityFilterLabel(filter: ActivityFilterId): string {
  return ACTIVITY_FILTERS.find((f) => f.id === filter)?.label ?? 'All';
}
