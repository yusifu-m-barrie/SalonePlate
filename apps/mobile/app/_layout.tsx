import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/stores/authStore';
import { ApiConnectionHint } from '../src/components/dev/ApiConnectionHint';
import { AppModal } from '../src/components/ui/AppModal';
import { colors } from '../src/constants/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <ApiConnectionHint />
        <AppModal />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.darkBlue },
            animation: 'slide_from_right',
          }}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
