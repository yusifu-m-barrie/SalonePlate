import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}>
        <LinearGradient
          colors={[colors.gold, colors.goldDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.primary, (disabled || loading) && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.darkBlue} />
          ) : (
            <Text style={styles.primaryText}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.outline, variant === 'ghost' && styles.ghost, (disabled || loading) && styles.disabled]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : (
        <Text style={styles.outlineText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: { color: colors.darkBlue, fontWeight: '700', fontSize: 16 },
  outline: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { borderWidth: 0 },
  outlineText: { color: colors.white, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
