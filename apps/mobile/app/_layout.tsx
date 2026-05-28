import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/stores/authStore';
import { ApiConnectionHint } from '../src/components/dev/ApiConnectionHint';
import { AppModal } from '../src/components/ui/AppModal';
import { AppLoadingScreen } from '../src/components/ui/AppLoadingScreen';
import { colors } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    loadSession().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [loadSession]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        {isLoading ? (
          <AppLoadingScreen message="Starting SalonePlate…" />
        ) : (
          <>
            <ApiConnectionHint />
            <AppModal />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.darkBlue },
                animation: 'slide_from_right',
              }}
            />
          </>
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
