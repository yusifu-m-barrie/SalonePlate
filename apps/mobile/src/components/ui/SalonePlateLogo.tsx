import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';

const logoSource = require('../../../assets/logo.png');

type Variant = 'full' | 'mark' | 'sidebar';

type Props = {
  size?: number;
  variant?: Variant;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Blend black background into dark screens (iOS/Android). */
  onDark?: boolean;
  showWordmark?: boolean;
};

export function SalonePlateLogo({
  size = 120,
  variant = 'full',
  style,
  containerStyle,
  onDark = false,
  showWordmark = false,
}: Props) {
  const markSize = variant === 'full' ? size : Math.min(size, 52);
  const height = variant === 'full' ? Math.round(size * 1.05) : markSize;

  if (variant === 'mark' || variant === 'sidebar') {
    const cropW = Math.round(markSize * 2.1);
    const cropH = Math.round(markSize * 2.8);
    return (
      <View style={[styles.wrap, containerStyle]}>
        <View style={[styles.markClip, { width: markSize, height: markSize }]}>
          <Image
            source={logoSource}
            style={[
              {
                width: cropW,
                height: cropH,
                position: 'absolute',
                left: (markSize - cropW) / 2,
                top: 0,
              },
              style,
            ]}
            resizeMode="cover"
            accessibilityLabel="SalonePlate"
            {...(onDark ? { blendMode: 'screen' as const } : {})}
          />
        </View>
        {(showWordmark || variant === 'sidebar') && (
          <Text style={styles.wordmark}>
            Salone<Text style={styles.gold}>Plate</Text>
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Image
        source={logoSource}
        style={[{ width: size, height }, style]}
        resizeMode="contain"
        accessibilityLabel="SalonePlate logo"
        {...(onDark ? { blendMode: 'screen' as const } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  markClip: { overflow: 'hidden', alignItems: 'center' },
  wordmark: { color: colors.white, fontWeight: '800', fontSize: 16, marginTop: 6 },
  gold: { color: colors.gold },
});
