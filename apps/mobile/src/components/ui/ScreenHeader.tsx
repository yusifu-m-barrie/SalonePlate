import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { safeGoBack } from '../../lib/safeNavigation';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const handleBack = onBack ?? (() => safeGoBack());

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={colors.white} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{right ?? <View style={{ width: 24 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  backBtn: { width: 32 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.white, textAlign: 'center' },
  right: { width: 32, alignItems: 'flex-end' },
});
