import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { useRequireRole } from '../../src/hooks/useRequireRole';
import { colors, spacing, radius } from '../../src/constants/theme';
import { CUSTOMER_CUISINE_FILTERS } from '../../src/lib/cuisineMenu';
import { toNleAmount } from '../../src/lib/currency';
import { appAlert } from '../../src/lib/appAlert';

const CUISINE_OPTIONS = CUSTOMER_CUISINE_FILTERS;

type RestaurantProfile = {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  address: string;
  isOpen: boolean;
  isBusy: boolean;
  isFeatured: boolean;
  minOrderAmount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  categories: string[];
};

export default function OwnerSettingsScreen() {
  const { isLoading: authLoading } = useRequireRole('RESTAURANT_OWNER');
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<RestaurantProfile & { minOrderNle: string }>>({});

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['owner-restaurant'],
    queryFn: async () => {
      const { data } = await api.get<RestaurantProfile>('/restaurant-owner/restaurant');
      return data;
    },
    enabled: !authLoading,
  });

  useEffect(() => {
    if (restaurant) {
      setForm({
        ...restaurant,
        categories: restaurant.categories ?? [],
        minOrderNle: String(toNleAmount(restaurant.minOrderAmount)),
      });
    }
  }, [restaurant]);

  const save = useMutation({
    mutationFn: async () => {
      await api.patch('/restaurant-owner/restaurant', {
        name: form.name?.trim(),
        description: form.description?.trim(),
        phone: form.phone?.trim(),
        address: form.address?.trim(),
        isOpen: form.isOpen,
        isBusy: form.isBusy,
        isFeatured: form.isFeatured,
        minOrderAmount: form.minOrderNle ? Number(form.minOrderNle) : 0,
        deliveryTimeMin: Number(form.deliveryTimeMin ?? 30),
        deliveryTimeMax: Number(form.deliveryTimeMax ?? 45),
        categories: form.categories ?? [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      appAlert('Saved', 'Your profile is updated on the customer app.');
    },
    onError: () => appAlert('Error', 'Could not save. Check your connection and try again.'),
  });

  const toggleCategory = (id: string) => {
    const cur = form.categories ?? [];
    setForm({
      ...form,
      categories: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };

  if (authLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Restaurant settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Changes appear in the customer Browse tab and search filters.</Text>

        <Text style={styles.label}>Restaurant name</Text>
        <TextInput
          style={styles.input}
          value={form.name ?? ''}
          onChangeText={(name) => setForm({ ...form, name })}
          placeholderTextColor={colors.softGray}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description ?? ''}
          onChangeText={(description) => setForm({ ...form, description })}
          multiline
          placeholderTextColor={colors.softGray}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={form.phone ?? ''}
          onChangeText={(phone) => setForm({ ...form, phone })}
          keyboardType="phone-pad"
          placeholderTextColor={colors.softGray}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={form.address ?? ''}
          onChangeText={(address) => setForm({ ...form, address })}
          placeholderTextColor={colors.softGray}
        />

        <Text style={styles.sectionTitle}>Cuisine tags</Text>
        <Text style={styles.hint}>Select all that apply — customers filter by these on Browse.</Text>
        <View style={styles.chipWrap}>
          {CUISINE_OPTIONS.map((c) => {
            const selected = (form.categories ?? []).includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleCategory(c.id)}
              >
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Open for orders</Text>
          <Switch
            value={form.isOpen ?? true}
            onValueChange={(isOpen) => setForm({ ...form, isOpen })}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Busy (longer prep)</Text>
          <Switch
            value={form.isBusy ?? false}
            onValueChange={(isBusy) => setForm({ ...form, isBusy })}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelBlock}>
            <Text style={styles.switchLabel}>Featured on home</Text>
            <Text style={styles.switchHint}>
              Show your restaurant in the customer Featured restaurants section and Featured filter
            </Text>
          </View>
          <Switch
            value={form.isFeatured ?? false}
            onValueChange={(isFeatured) => setForm({ ...form, isFeatured })}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.row3}>
          <View style={styles.fieldThird}>
            <Text style={styles.label}>Min order (NLE)</Text>
            <TextInput
              style={styles.input}
              value={form.minOrderNle ?? '0'}
              onChangeText={(minOrderNle) => setForm({ ...form, minOrderNle })}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.softGray}
            />
          </View>
          <View style={styles.fieldThird}>
            <Text style={styles.label}>Del. min</Text>
            <TextInput
              style={styles.input}
              value={String(form.deliveryTimeMin ?? 30)}
              onChangeText={(v) => setForm({ ...form, deliveryTimeMin: Number(v) || 30 })}
              keyboardType="number-pad"
              placeholderTextColor={colors.softGray}
            />
          </View>
          <View style={styles.fieldThird}>
            <Text style={styles.label}>Del. max</Text>
            <TextInput
              style={styles.input}
              value={String(form.deliveryTimeMax ?? 45)}
              onChangeText={(v) => setForm({ ...form, deliveryTimeMax: Number(v) || 45 })}
              keyboardType="number-pad"
              placeholderTextColor={colors.softGray}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, save.isPending && styles.saveBtnDisabled]}
          onPress={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? (
            <ActivityIndicator color={colors.darkBlue} />
          ) : (
            <Text style={styles.saveBtnText}>Save profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  screenTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  scroll: { padding: spacing.lg, paddingBottom: 48 },
  hint: { color: colors.softGray, fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  label: { color: colors.softGray, fontSize: 12, marginBottom: 6, marginTop: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: spacing.lg },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.white,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm },
  chip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
    minWidth: 88,
  },
  chipSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipEmoji: { fontSize: 18, marginBottom: 2 },
  chipLabel: { color: colors.softGray, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  chipLabelSelected: { color: colors.darkBlue },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLabel: { color: colors.white, fontSize: 15 },
  switchLabelBlock: { flex: 1, paddingRight: spacing.md },
  switchHint: { color: colors.softGray, fontSize: 12, marginTop: 4, lineHeight: 16 },
  row3: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  fieldThird: { flex: 1 },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.darkBlue, fontSize: 16, fontWeight: '700' },
});
