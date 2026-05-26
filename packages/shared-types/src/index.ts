export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  RIDER = 'RIDER',
  CITY_MANAGER = 'CITY_MANAGER',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum OrderStatus {
  PLACED = 'PLACED',
  RESTAURANT_ACCEPTED = 'RESTAURANT_ACCEPTED',
  PREPARING = 'PREPARING',
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  ORANGE_MONEY = 'ORANGE_MONEY',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  CARD = 'CARD',
  WALLET = 'WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum RestaurantStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum RiderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
}

export enum PromoType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_DELIVERY = 'FREE_DELIVERY',
  FIRST_ORDER = 'FIRST_ORDER',
  REFERRAL = 'REFERRAL',
}

export const BRAND = {
  name: 'SalonePlate',
  tagline: 'Premium food delivery for Sierra Leone',
  colors: {
    darkBlue: '#071A2F',
    gold: '#D4AF37',
    white: '#FFFFFF',
    softGray: '#9CA3AF',
  },
  defaultCity: 'makeni',
  currency: 'SLE',
  currencySymbol: 'NLE',
} as const;

/** Sierra Leone Leone (SLE / NLE). Amounts in the DB use legacy pre-redenomination units (÷1000). */
export const CURRENCY = {
  code: 'SLE',
  symbol: 'NLE',
  legacyDivisor: 1000,
} as const;

export function toNleAmount(storedAmount: number): number {
  return storedAmount / CURRENCY.legacyDivisor;
}

/** Convert a user-entered NLE value to legacy storage units. */
export function fromNleAmount(nle: number): number {
  return Math.round(nle * CURRENCY.legacyDivisor);
}

export function formatCurrency(storedAmount: number): string {
  const nle = toNleAmount(storedAmount);
  const hasFraction = Math.abs(nle - Math.round(nle)) > 0.001;
  const formatted = nle.toLocaleString('en-SL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
  return `${CURRENCY.symbol} ${formatted}`;
}

export function formatCurrencyCompact(storedAmount: number): string {
  const nle = toNleAmount(storedAmount);
  if (nle >= 1000) {
    const k = nle / 1000;
    return `${CURRENCY.symbol} ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return formatCurrency(storedAmount);
}

export const FOOD_CATEGORIES = [
  'African food',
  'Fast food',
  'Drinks',
  'BBQ',
  'Desserts',
  'Pizza',
  'Rice dishes',
  'Local dishes',
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: UserRole;
  cityId?: string;
  restaurantId?: string;
  riderId?: string;
}
