'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { uploadMenuImage } from '@/lib/uploadImage';
import { MediaImage } from '@/components/ui/MediaImage';
import { formatCurrency, fromNleAmount, toNleAmount } from '@saloneplate/shared-types';
import { SaveButton } from '@/components/ui/SaveButton';

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
  category?: { id: string; name: string };
};

type MenuCategory = { id: string; name: string; items: MenuItem[] };
type MenuData = {
  restaurant: { id: string; name: string; status: string };
  categories: MenuCategory[];
  uncategorized: MenuItem[];
};
type CategoryOption = { id: string; name: string; sortOrder: number };
type MenuPreset = { key: string; name: string; sortOrder: number; cuisineTags: string[] };
type CategoryResponse = {
  categories: CategoryOption[];
  restaurantCuisines?: string[];
  presets?: MenuPreset[];
};

const emptyForm = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  categoryId: '',
  thumbnailPreview: '',
  thumbnailUrl: '',
  galleryUrls: [] as string[],
  galleryPreviews: [] as string[],
  prepTimeMin: '15',
  isAvailable: true,
  isPopular: false,
  isFeatured: false,
  tags: '',
};

const inputClass = 'input-field w-full mt-1';
const selectClass = 'input-field w-full mt-1';

export default function RestaurantMenuPage() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { data: categoryData } = useQuery({
    queryKey: ['owner-menu-categories'],
    queryFn: async () => {
      const { data } = await api.get<CategoryResponse>('/restaurant-owner/menu/categories');
      return data;
    },
    enabled: status === 'authenticated',
    retry: 2,
    staleTime: 30_000,
  });

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['owner-menu'],
    queryFn: async () => {
      const { data } = await api.get<MenuData>('/restaurant-owner/menu');
      return data;
    },
    enabled: status === 'authenticated',
    retry: 2,
    staleTime: 30_000,
  });

  const categoryOptions = categoryData?.categories || [];
  const { coreCategoryOptions, cuisineCategoryOptions } = useMemo(() => {
    const presets = categoryData?.presets ?? [];
    const coreNames = new Set(presets.filter((p) => !p.cuisineTags?.length).map((p) => p.name));
    const cuisineNames = new Set(presets.filter((p) => p.cuisineTags?.length).map((p) => p.name));
    return {
      coreCategoryOptions: categoryOptions.filter((c) => coreNames.has(c.name)),
      cuisineCategoryOptions: categoryOptions.filter((c) => cuisineNames.has(c.name)),
    };
  }, [categoryData, categoryOptions]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['owner-menu'] });
    queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
    queryClient.invalidateQueries({ queryKey: ['owner-menu-categories'] });
    queryClient.invalidateQueries({ queryKey: ['discover-home'] });
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormModal(true);
  };

  const handleThumbFile = (file: File | undefined) => {
    if (!file) return;
    setForm((f) => ({
      ...f,
      thumbnailPreview: URL.createObjectURL(file),
      thumbnailUrl: '',
      thumbnailFile: file,
    }));
  };

  const handleGalleryFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const newFiles = Array.from(files);
    setForm((f) => ({
      ...f,
      galleryFiles: [...((f as { galleryFiles?: File[] }).galleryFiles || []), ...newFiles],
      galleryPreviews: [...f.galleryPreviews, ...newFiles.map((file) => URL.createObjectURL(file))],
    }));
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!form.categoryId) throw new Error('category');
      setUploading(true);
      let imageUrl = form.thumbnailUrl;
      const thumbFile = (form as { thumbnailFile?: File }).thumbnailFile;
      if (thumbFile) imageUrl = await uploadMenuImage(thumbFile);
      const galleryUrls = [...form.galleryUrls];
      for (const file of (form as { galleryFiles?: File[] }).galleryFiles || []) {
        galleryUrls.push(await uploadMenuImage(file));
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: fromNleAmount(Number(form.price)),
        compareAtPrice: form.compareAtPrice ? fromNleAmount(Number(form.compareAtPrice)) : undefined,
        categoryId: form.categoryId,
        imageUrl: imageUrl || undefined,
        galleryUrls,
        prepTimeMin: Number(form.prepTimeMin) || 15,
        isAvailable: form.isAvailable,
        isPopular: form.isPopular,
        isFeatured: form.isFeatured,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (editingId) {
        await api.patch(`/restaurant-owner/menu/items/${editingId}`, payload);
      } else {
        await api.post('/restaurant-owner/menu/items', payload);
      }
    },
    onSuccess: () => {
      setMessage(editingId ? 'Item updated' : 'Item added to menu');
      setForm(emptyForm);
      setEditingId(null);
      setFormModal(false);
      invalidate();
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const apiMsg = ax.response?.data?.message;
      const detail = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg;
      if (err instanceof Error && err.message === 'category') {
        setMessage('Please select a category.');
        return;
      }
      setMessage(detail || ax.message || 'Could not save item.');
    },
    onSettled: () => setUploading(false),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.delete(`/restaurant-owner/menu/items/${id}`),
    onSuccess: () => {
      setMessage('Item removed');
      invalidate();
    },
  });

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(toNleAmount(item.price)),
      compareAtPrice: item.compareAtPrice ? String(toNleAmount(item.compareAtPrice)) : '',
      categoryId: item.categoryId || '',
      thumbnailPreview: item.imageUrl || '',
      thumbnailUrl: item.imageUrl || '',
      galleryUrls: item.galleryUrls || [],
      galleryPreviews: [],
      prepTimeMin: String(item.prepTimeMin),
      isAvailable: item.isAvailable,
      isPopular: item.isPopular,
      isFeatured: item.isFeatured ?? false,
      tags: (item.tags || []).join(', '),
    });
    setFormModal(true);
  };

  const allItems = [
    ...(data?.uncategorized || []),
    ...(data?.categories || []).flatMap((c) => c.items),
  ];
  const thumbPreview = form.thumbnailPreview || form.thumbnailUrl;
  const saving = uploading || saveItem.isPending;

  const closeModal = () => {
    if (saving) return;
    setFormModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu &amp; Food</h1>
          <p className="text-brand-gray text-sm">
            Manage dishes for <strong>{data?.restaurant?.name}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-5 py-2.5 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
        >
          + Add new menu
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm">
          <p>Could not load menu. Check API and sign-in.</p>
          <button type="button" onClick={() => refetch()} className="text-brand-gold underline mt-1">
            Retry
          </button>
        </div>
      )}
      {message && <p className="text-brand-gold text-sm">{message}</p>}

      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Your menu ({allItems.length})</h2>
        {(isLoading || isFetching) && !data && (
          <p className="text-brand-gray">Loading…</p>
        )}
        {!isLoading && !isFetching && allItems.length === 0 && (
          <p className="text-brand-gray text-sm">No dishes yet. Click &quot;Add new menu&quot; to start.</p>
        )}
        {(data?.uncategorized || []).length > 0 && (
          <div>
            <h3 className="text-brand-gold text-sm font-semibold mb-2">Uncategorized</h3>
            <div className="space-y-2">
              {(data?.uncategorized || []).map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => startEdit(item)}
                  onDelete={() => deleteItem.mutate(item.id)}
                  onToggleAvailable={() =>
                    api
                      .patch(`/restaurant-owner/menu/items/${item.id}`, {
                        isAvailable: !item.isAvailable,
                      })
                      .then(invalidate)
                  }
                />
              ))}
            </div>
          </div>
        )}
        {(data?.categories || []).map((cat) =>
          cat.items.length > 0 ? (
            <div key={cat.id}>
              <h3 className="text-brand-gold text-sm font-semibold mb-2">{cat.name}</h3>
              <div className="space-y-2">
                {cat.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    onEdit={() => startEdit(item)}
                    onDelete={() => deleteItem.mutate(item.id)}
                    onToggleAvailable={() =>
                      api.patch(`/restaurant-owner/menu/items/${item.id}`, { isAvailable: !item.isAvailable }).then(invalidate)
                    }
                  />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>

      {formModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-brand-dark border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editingId ? 'Edit dish' : 'Add new menu item'}</h2>
              <button type="button" onClick={closeModal} className="p-1 text-brand-gray hover:text-white" disabled={saving}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Category *">
                <select
                  className={selectClass}
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                >
                  <option value="">Select a category…</option>
                  {coreCategoryOptions.length > 0 && (
                    <optgroup label="Core menu sections">
                      {coreCategoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {cuisineCategoryOptions.length > 0 && (
                    <optgroup label="Your cuisine specialties">
                      {cuisineCategoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {coreCategoryOptions.length === 0 &&
                    cuisineCategoryOptions.length === 0 &&
                    categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <p className="text-xs text-brand-gray mt-1">
                  Matches your cuisine tags in Settings (e.g. African + Local → African &amp; Local Specialties).
                  Save settings first if a section is missing.
                </p>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Dish name *">
                  <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Price (NLE) *">
                  <input className={inputClass} type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </Field>
              </div>

              <Field label="Description">
                <textarea className={`${inputClass} min-h-[80px]`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>

              <Field label="Menu thumbnail">
                {thumbPreview && (
                  <MediaImage src={thumbPreview} alt="" className="w-24 h-24 rounded-xl object-cover mb-2" />
                )}
                <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleThumbFile(e.target.files?.[0])} />
                <button type="button" onClick={() => thumbInputRef.current?.click()} className="text-sm px-4 py-2 rounded-xl border border-white/20">Upload thumbnail</button>
              </Field>

              <Field label="Extra photos">
                <div className="flex flex-wrap gap-2 mb-2">
                  {[...form.galleryUrls, ...form.galleryPreviews].map((url, i) => (
                    <MediaImage key={`${url}-${i}`} src={url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  ))}
                </div>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleGalleryFiles(e.target.files)} />
                <button type="button" onClick={() => galleryInputRef.current?.click()} className="text-sm px-4 py-2 rounded-xl border border-white/20">Add photos</button>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Prep (min)">
                  <input className={inputClass} type="number" value={form.prepTimeMin} onChange={(e) => setForm({ ...form, prepTimeMin: e.target.value })} />
                </Field>
                <Field label="Compare price (NLE)">
                  <input className={inputClass} type="number" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
                </Field>
              </div>

              <Field label="Tags">
                <input className={inputClass} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="spicy, vegetarian" />
              </Field>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
                  Available
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} />
                  Popular
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                  Featured
                </label>
              </div>

              <SaveButton
                saving={saving}
                disabled={!form.name.trim() || !form.price || !form.categoryId}
                onClick={() => saveItem.mutate()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-brand-gray">
      {label}
      {children}
    </label>
  );
}

function MenuItemRow({
  item,
  onEdit,
  onDelete,
  onToggleAvailable,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailable: () => void;
}) {
  return (
    <div className="glass-card p-4 flex flex-wrap gap-4 justify-between items-start">
      <div className="flex gap-3">
        {item.imageUrl && (
          <MediaImage src={item.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
        )}
        <div>
          <p className="font-medium">{item.name}</p>
          {item.category?.name && <p className="text-xs text-brand-gray">{item.category.name}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {!item.isAvailable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-brand-gray">Hidden</span>
            )}
            {item.isPopular && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold">Popular</span>
            )}
            {item.isFeatured && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/30 text-brand-dark font-semibold">Featured</span>
            )}
          </div>
          <p className="text-brand-gold text-sm mt-1">{formatCurrency(item.price)}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={onToggleAvailable} className="text-xs px-3 py-1 rounded-lg border border-white/20">{item.isAvailable ? 'Hide' : 'Show'}</button>
        <button type="button" onClick={onEdit} className="text-xs px-3 py-1 rounded-lg border border-brand-gold/40 text-brand-gold">Edit</button>
        <button type="button" onClick={onDelete} className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400">Delete</button>
      </div>
    </div>
  );
}
