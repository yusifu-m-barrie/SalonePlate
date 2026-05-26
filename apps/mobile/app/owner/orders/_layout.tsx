import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';

export default function OwnerOrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.darkBlue },
      }}
    />
  );
}
