import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
}
