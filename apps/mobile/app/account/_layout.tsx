import { Stack } from 'expo-router';
import { colors } from '../../src/constants/theme';

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.darkBlue },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="addresses" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="referral" />
      <Stack.Screen name="loyalty" />
      <Stack.Screen name="language" />
      <Stack.Screen name="support" />
    </Stack>
  );
}
