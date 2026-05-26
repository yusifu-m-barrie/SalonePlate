export const ORDER_STATUS_LABEL: Record<string, string> = {
  PLACED: 'Order placed',
  RESTAURANT_ACCEPTED: 'Confirmed',
  PREPARING: 'Preparing',
  RIDER_ASSIGNED: 'Ready',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ACTIVE_ORDER_STATUSES = [
  'PLACED',
  'RESTAURANT_ACCEPTED',
  'PREPARING',
  'RIDER_ASSIGNED',
  'ON_THE_WAY',
];
