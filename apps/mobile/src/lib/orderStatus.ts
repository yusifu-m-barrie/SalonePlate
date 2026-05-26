export const ORDER_STATUS_LABEL: Record<string, string> = {
  PLACED: 'Order placed',
  RESTAURANT_ACCEPTED: 'Confirmed',
  PREPARING: 'Preparing',
  RIDER_ASSIGNED: 'Ready',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_MESSAGE: Record<string, string> = {
  PLACED: 'Waiting for the restaurant to accept your order.',
  RESTAURANT_ACCEPTED: 'The restaurant confirmed your order.',
  PREPARING: 'Your food is being prepared at the restaurant.',
  RIDER_ASSIGNED: 'Your order is ready and will be sent out shortly.',
  ON_THE_WAY: 'Your order has left the restaurant and is heading to you.',
  DELIVERED: 'Enjoy your meal! Thank you for ordering with SalonePlate.',
  CANCELLED: 'This order was cancelled.',
};

/** Customer-facing steps (restaurant self-delivery — no rider). */
export const TRACKING_STEPS = [
  { key: 'PLACED', label: 'Placed' },
  { key: 'RESTAURANT_ACCEPTED', label: 'Confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'RIDER_ASSIGNED', label: 'Ready' },
  { key: 'ON_THE_WAY', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export const ACTIVE_ORDER_STATUSES = [
  'PLACED',
  'RESTAURANT_ACCEPTED',
  'PREPARING',
  'RIDER_ASSIGNED',
  'ON_THE_WAY',
];

export function orderStatusStepIndex(status: string): number {
  const idx = TRACKING_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export function getDeliveryCoords(order: {
  deliveryAddress?: { lat?: number; lng?: number };
  deliveryLat?: number;
  deliveryLng?: number;
}): { lat: number; lng: number } | null {
  const addr = order.deliveryAddress;
  const lat = addr?.lat ?? order.deliveryLat;
  const lng = addr?.lng ?? order.deliveryLng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
}
