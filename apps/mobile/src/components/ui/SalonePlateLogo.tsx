import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

const logoSource = require('../../../assets/logo.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function SalonePlateLogo({ size = 120, style, containerStyle }: Props) {
  const height = Math.round(size * 1.05);
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Image
        source={logoSource}
        style={[{ width: size, height }, style]}
        resizeMode="contain"
        accessibilityLabel="SalonePlate logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
