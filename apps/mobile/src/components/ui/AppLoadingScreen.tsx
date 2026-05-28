import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SalonePlateLogo } from './SalonePlateLogo';
import { colors, spacing } from '../../constants/theme';

type Props = {
  message?: string;
};

export function AppLoadingScreen({ message = 'Loading…' }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [scale]);

  const logoAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={logoAnim}>
        <SalonePlateLogo size={180} />
      </Animated.View>
      <ActivityIndicator size="large" color={colors.gold} style={styles.spinner} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  spinner: { marginTop: spacing.lg },
  message: { color: colors.softGray, marginTop: spacing.md, fontSize: 14 },
});
