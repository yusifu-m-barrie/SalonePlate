import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { uploadMenuImage } from '../../src/lib/uploadImage';
import { useRequireRole } from '../../src/hooks/useRequireRole';
import { Button } from '../../src/components/ui/Button';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { AppImage } from '../../src/components/ui/AppImage';
import { colors, spacing } from '../../src/constants/theme';
import { formatCurrency, fromNleAmount, toNleAmount } from '../../src/lib/currency';
import { appAlert, appConfirm } from '../../src/lib/appAlert';

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  galleryUrls?: string[];
  prepTimeMin: number;
  isAvailable: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  tags: string[];
  categoryId?: string;
};

type MenuCategory = { id: string; name: string; items: MenuItem[] };

type MenuData = {
  restaurant: { name: string; status: string };
  categories: MenuCategory[];
  uncategorized: MenuItem[];
};

type CategoryOption = { id: string; name: string; sortOrder: number };

const emptyForm = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  categoryId: '',
  thumbnailUri: '' as string,
  thumbnailUrl: '' as string,
  galleryUris: [] as string[],
  galleryUrls: [] as string[],
  prepTimeMin: '15',
  isAvailable: true,
  isPopular: false,
  isFeatured: false,
  tags: '',
};

export default function RestaurantMenuScreen() {
  const { isLoading: authLoading } = useRequireRole('RESTAURANT_OWNER');
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categoryData } = useQuery({
    queryKey: ['owner-menu-categories'],
    queryFn: async () => {
      const { data } = await api.get<{
        categories: CategoryOption[];
        restaurantCuisines?: string[];
        presets?: { name: string; cuisineTags: string[] }[];
      }>('/restaurant-owner/menu/categories');
      return data;
    },
    enabled: !authLoading,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['owner-menu'],
    queryFn: async () => {
      const { data } = await api.get<MenuData>('/restaurant-owner/menu');
      return data;
    },
    enabled: !authLoading,
  });

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return (categoryData?.categories || []).filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [categoryData?.categories]);

  const selectedCategoryName =
    categoryOptions.find((c) => c.id === form.categoryId)?.name || 'Select category *';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-menu'] });
    queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
    queryClient.invalidateQueries({ queryKey: ['owner-menu-categories'] });
    queryClient.invalidateQueries({ queryKey: ['discover-home'] });
  };

  const pickImage = async (mode: 'thumbnail' | 'gallery') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert('Permission needed', 'Allow photo library access to upload dish images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: mode === 'thumbnail',
      aspect: mode === 'thumbnail' ? [1, 1] : undefined,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const uri = result.assets[0].uri;
    if (mode === 'thumbnail') {
      setForm((f) => ({ ...f, thumbnailUri: uri, thumbnailUrl: '' }));
    } else {
      setForm((f) => ({ ...f, galleryUris: [...f.galleryUris, uri] }));
    }
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!form.categoryId) throw new Error('category');
      setUploading(true);
      let thumbnailUrl = form.thumbnailUrl;
      if (form.thumbnailUri) {
        thumbnailUrl = await uploadMenuImage(form.thumbnailUri);
      }
      const newGalleryUrls: string[] = [...form.galleryUrls];
      for (const uri of form.galleryUris) {
        newGalleryUrls.push(await uploadMenuImage(uri));
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: fromNleAmount(Number(form.price)),
        compareAtPrice: form.compareAtPrice ? fromNleAmount(Number(form.compareAtPrice)) : undefined,
        categoryId: form.categoryId,
        imageUrl: thumbnailUrl || undefined,
        galleryUrls: newGalleryUrls,
        prepTimeMin: Number(form.prepTimeMin) || 15,
        isAvailable: form.isAvailable,
        isPopular: form.isPopular,
        isFeatured: form.isFeatured,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (editingId) {
        await api.patch(`/restaurant-owner/menu/items/${editingId}`, payload);
      } else {
        await api.post('/restaurant-owner/menu/items', payload);
      }
    },
    onSuccess: () => {
      appAlert('Saved', editingId ? 'Dish updated' : 'Dish added to menu');
      setForm(emptyForm);
      setEditingId(null);
      setFormModal(false);
      invalidate();
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const apiMsg = ax.response?.data?.message;
      const detail = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg || ax.message;
      if (err instanceof Error && err.message === 'category') {
        appAlert('Error', 'Please select a category');
        return;
      }
      appAlert('Error', detail || 'Could not save dish. Restart the API if you just updated the app.');
    },
    onSettled: () => setUploading(false),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/restaurant-owner/menu/items/${id}`),
    onSuccess: () => {
      invalidate();
      appAlert('Removed', 'Dish deleted from menu');
    },
  });

  const openNewDish = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormModal(true);
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setFormModal(true);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(toNleAmount(item.price)),
      compareAtPrice: item.compareAtPrice ? String(toNleAmount(item.compareAtPrice)) : '',
      categoryId: item.categoryId || '',
      thumbnailUri: '',
      thumbnailUrl: item.imageUrl || '',
      galleryUris: [],
      galleryUrls: item.galleryUrls || [],
      prepTimeMin: String(item.prepTimeMin),
      isAvailable: item.isAvailable,
      isPopular: item.isPopular,
      isFeatured: item.isFeatured ?? false,
      tags: (item.tags || []).join(', '),
    });
  };

  const allItems = [
    ...(data?.uncategorized || []),
    ...(data?.categories || []).flatMap((c) => c.items),
  ];

  const thumbnailPreview = form.thumbnailUri || form.thumbnailUrl;

  if (authLoading) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Menu & Food</Text>
              <Text style={styles.subtitle}>{data?.restaurant?.name}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openNewDish}>
              <Ionicons name="add-circle" size={20} color={colors.darkBlue} />
              <Text style={styles.addBtnText}>Add new menu</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.listTitle}>Your menu ({allItems.length})</Text>
          {isLoading && <Text style={styles.muted}>Loading…</Text>}

          {allItems.map((item) => (
            <GlassCard key={item.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                {item.imageUrl ? (
                  <AppImage uri={item.imageUrl} style={styles.itemThumb} />
                ) : (
                  <View style={[styles.itemThumb, styles.itemThumbEmpty]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.price)}
                    {!item.isAvailable && ' · Hidden'}
                    {item.isPopular && ' · ★ Popular'}
                    {item.isFeatured && ' · Featured'}
                  </Text>
                </View>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => startEdit(item)}>
                  <Text style={styles.actionGold}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    api
                      .patch(`/restaurant-owner/menu/items/${item.id}`, {
                        isAvailable: !item.isAvailable,
                      })
                      .then(invalidate)
                  }
                >
                  <Text style={styles.actionGold}>{item.isAvailable ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    appConfirm('Delete dish?', item.name, () => deleteItem.mutate(item.id), {
                      confirmText: 'Delete',
                      destructive: true,
                    })
                  }
                >
                  <Text style={styles.actionDanger}>Delete</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={formModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formModalSheet}>
            <View style={styles.formModalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit dish' : 'Add new menu item'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setFormModal(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                hitSlop={12}
              >
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Label text="Category *" />
              <Text style={styles.hint}>
                Sections match your cuisine tags in Settings. African and Local share African & Local
                Specialties.
              </Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setCategoryModal(true)}>
                <Text style={form.categoryId ? styles.selectText : styles.selectPlaceholder}>
                  {selectedCategoryName}
                </Text>
              </TouchableOpacity>

              <Label text="Dish name *" />
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(name) => setForm({ ...form, name })}
                placeholder="e.g. Cassava Leaves & Rice"
                placeholderTextColor={colors.softGray}
              />

              <Label text="Price (NLE) *" />
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={(price) => setForm({ ...form, price })}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor={colors.softGray}
              />

              <Label text="Description" />
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.description}
                onChangeText={(description) => setForm({ ...form, description })}
                multiline
                placeholder="Ingredients, portion…"
                placeholderTextColor={colors.softGray}
              />

              <Label text="Menu thumbnail *" />
              <Text style={styles.hint}>Square photo shown on your restaurant menu list.</Text>
              {thumbnailPreview ? (
                <AppImage uri={thumbnailPreview} style={styles.thumbnail} />
              ) : null}
              <Button title="Upload thumbnail" variant="outline" onPress={() => pickImage('thumbnail')} />

              <Label text="Extra photos" />
              <Text style={styles.hint}>Shown below the description when customers view the dish.</Text>
              <View style={styles.galleryRow}>
                {[...form.galleryUrls, ...form.galleryUris].map((uri, i) => (
                  <AppImage key={`${uri}-${i}`} uri={uri} style={styles.galleryThumb} />
                ))}
              </View>
              <Button title="Add photo" variant="outline" onPress={() => pickImage('gallery')} />

              <Label text="Prep time (min)" />
              <TextInput
                style={styles.input}
                value={form.prepTimeMin}
                onChangeText={(prepTimeMin) => setForm({ ...form, prepTimeMin })}
                keyboardType="numeric"
              />

              <Label text="Compare-at price (NLE)" />
              <TextInput
                style={styles.input}
                value={form.compareAtPrice}
                onChangeText={(compareAtPrice) => setForm({ ...form, compareAtPrice })}
                keyboardType="numeric"
                placeholder="Optional"
                placeholderTextColor={colors.softGray}
              />

              <Label text="Tags (comma-separated)" />
              <TextInput
                style={styles.input}
                value={form.tags}
                onChangeText={(tags) => setForm({ ...form, tags })}
                placeholder="spicy, vegetarian"
                placeholderTextColor={colors.softGray}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Available on app</Text>
                <Switch
                  value={form.isAvailable}
                  onValueChange={(isAvailable) => setForm({ ...form, isAvailable })}
                  trackColor={{ true: colors.gold }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Popular dish</Text>
                <Switch
                  value={form.isPopular}
                  onValueChange={(isPopular) => setForm({ ...form, isPopular })}
                  trackColor={{ true: colors.gold }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Featured on home</Text>
                <Switch
                  value={form.isFeatured}
                  onValueChange={(isFeatured) => setForm({ ...form, isFeatured })}
                  trackColor={{ true: colors.gold }}
                />
              </View>

              <View style={{ marginTop: spacing.md, gap: spacing.sm, marginBottom: spacing.xl }}>
                <Button
                  title={editingId ? 'Update dish' : 'Save to menu'}
                  loading={saveItem.isPending || uploading}
                  disabled={!form.name.trim() || !form.price || !form.categoryId}
                  onPress={() => saveItem.mutate()}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={categoryModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select category</Text>
            <FlatList
              data={categoryOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setForm((f) => ({ ...f, categoryId: item.id }));
                    setCategoryModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Close" variant="outline" onPress={() => setCategoryModal(false)} />
          </View>
        </View>
      </Modal>

      {(saveItem.isPending || uploading) && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.uploadText}>Uploading images…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBlue },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.white },
  subtitle: { color: colors.softGray, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: colors.darkBlue, fontWeight: '700', fontSize: 12 },
  formModalSheet: {
    backgroundColor: colors.darkBlue,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '92%',
    marginTop: 'auto',
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: { color: colors.softGray, fontSize: 12, marginTop: spacing.sm, marginBottom: 4 },
  hint: { color: colors.softGray, fontSize: 11, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.white,
    fontSize: 15,
  },
  selectBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { color: colors.white, fontSize: 15 },
  selectPlaceholder: { color: colors.softGray, fontSize: 15 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  thumbnail: { width: 96, height: 96, borderRadius: 12, marginBottom: spacing.sm },
  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  galleryThumb: { width: 72, height: 72, borderRadius: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  switchLabel: { color: colors.white, fontSize: 14 },
  listTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: spacing.md },
  muted: { color: colors.softGray, fontSize: 13 },
  itemCard: { marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', gap: spacing.sm },
  itemThumb: { width: 56, height: 56, borderRadius: 8 },
  itemThumbEmpty: { backgroundColor: colors.border },
  itemName: { color: colors.white, fontSize: 16, fontWeight: '600' },
  itemPrice: { color: colors.gold, marginTop: 4, fontSize: 14 },
  itemActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  actionGold: { color: colors.gold, fontWeight: '600' },
  actionDanger: { color: colors.error, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.darkBlue,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemText: { color: colors.white, fontSize: 16 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,26,47,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: { color: colors.gold, marginTop: 12 },
});
