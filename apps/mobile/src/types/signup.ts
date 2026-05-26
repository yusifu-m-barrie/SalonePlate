export type SignupRoleKey = 'customer' | 'rider' | 'restaurant';

export const SIGNUP_ROLES: Record<
  SignupRoleKey,
  { apiRole: 'CUSTOMER' | 'RIDER' | 'RESTAURANT_OWNER'; title: string; subtitle: string; emoji: string }
> = {
  customer: {
    apiRole: 'CUSTOMER',
    title: 'Customer',
    subtitle: 'Order food from restaurants in Makeni',
    emoji: '🍽️',
  },
  rider: {
    apiRole: 'RIDER',
    title: 'Delivery Rider',
    subtitle: 'Deliver orders and earn on your schedule',
    emoji: '🏍️',
  },
  restaurant: {
    apiRole: 'RESTAURANT_OWNER',
    title: 'Restaurant',
    subtitle: 'List your kitchen and receive orders',
    emoji: '🍳',
  },
};

export interface SignupProfilePayload {
  role: 'CUSTOMER' | 'RIDER' | 'RESTAURANT_OWNER';
  firstName: string;
  lastName?: string;
  phone?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  vehicleType?: string;
  licenseNumber?: string;
}
