import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}

export function StarRating({ value, onChange, size = 36 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7} hitSlop={8}>
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? colors.gold : colors.softGray}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
