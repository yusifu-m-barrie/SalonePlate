import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export function useRequireRole(role: string) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
      return;
    }
    if (user?.role !== role) {
      if (user?.role === 'RESTAURANT_OWNER') {
        router.replace('/owner');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, user?.role, role]);

  return { user, isLoading, isAllowed: user?.role === role };
}
