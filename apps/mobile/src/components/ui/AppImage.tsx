import { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveImageUrl, PLACEHOLDER } from '../../lib/imageUrl';
import { colors } from '../../constants/theme';

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AppImage({ uri, style, containerStyle }: Props) {
  const [failed, setFailed] = useState(false);
  const src = failed ? PLACEHOLDER : resolveImageUrl(uri);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Image
        source={{ uri: src }}
        style={[styles.img, style]}
        onError={() => setFailed(true)}
      />
      {failed && !uri && (
        <View style={styles.iconOverlay} pointerEvents="none">
          <Ionicons name="image-outline" size={28} color={colors.softGray} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.border },
  img: { width: '100%', height: '100%' },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
  },
});
