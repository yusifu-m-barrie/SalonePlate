import { router, type Href } from 'expo-router';
import { usePendingRouteStore } from '../stores/pendingRouteStore';
import { appAlert } from './appAlert';

export function navigateAfterAuth(role: string, returnTo?: string | null) {
  if (returnTo && (role === 'CUSTOMER' || !role)) {
    router.replace(returnTo as Href);
    return;
  }

  if (role === 'RESTAURANT_OWNER') {
    router.replace('/owner');
    return;
  }
  if (role === 'SUPER_ADMIN' || role === 'CITY_MANAGER') {
    appAlert('Admin account', 'Use the web dashboard at your SalonePlate admin URL for full admin tools.', [
      { text: 'Continue', onPress: () => router.replace('/(tabs)') },
    ]);
    return;
  }
  router.replace('/(tabs)');
}

export function requireAuthForRoute(path: string) {
  usePendingRouteStore.getState().setReturnTo(path);
  router.push('/(auth)/login');
}
