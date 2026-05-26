/** Distance-based delivery pricing (restaurant self-delivery). */
export const DELIVERY_PRICING = {
  /** First N km included in the restaurant/city base fee. */
  INCLUDED_DISTANCE_KM: 2,
  /** Additional NLE per km beyond the included distance (stored in legacy units). */
  FEE_PER_KM: 2000,
  /** Round fee to nearest N legacy units (NLE 0.5 steps). */
  ROUND_TO: 500,
} as const;

export function roundDeliveryFee(amount: number): number {
  const step = DELIVERY_PRICING.ROUND_TO;
  return Math.round(amount / step) * step;
}

export function calculateDistanceDeliveryFee(baseFee: number, distanceKm: number): number {
  const extraKm = Math.max(0, distanceKm - DELIVERY_PRICING.INCLUDED_DISTANCE_KM);
  const raw = baseFee + extraKm * DELIVERY_PRICING.FEE_PER_KM;
  return Math.max(roundDeliveryFee(raw), roundDeliveryFee(baseFee * 0.5));
}
