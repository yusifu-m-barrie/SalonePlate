'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { uploadMenuImage } from '@/lib/uploadImage';
import { MediaImage } from '@/components/ui/MediaImage';
import { toNleAmount } from '@saloneplate/shared-types';

type Restaurant = {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address: string;
  lat: number;
  lng: number;
  logoUrl?: string;
  coverImage?: string;
  isOpen: boolean;
  isBusy: boolean;
  minOrderAmount: number;
  deliveryTimeMin: number;
  deliveryTimeMax: number;
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  categories?: string[];
};

/** Matches customer search filters and menu section names in Menu & Food. */
const CUISINE_OPTIONS = [
  { id: 'african', label: 'African', menuSection: 'African & Local Specialties' },
  { id: 'local', label: 'Local', menuSection: 'African & Local Specialties' },
  { id: 'european', label: 'European', menuSection: 'European & Continental' },
  { id: 'fast', label: 'Fast food', menuSection: 'Fast Food & Snacks' },
  { id: 'rice', label: 'Rice dishes', menuSection: 'Rice Dishes' },
  { id: 'bbq', label: 'BBQ & grill', menuSection: 'Grilled & BBQ' },
  { id: 'pizza', label: 'Pizza', menuSection: 'Pizza' },
  { id: 'desserts', label: 'Desserts', menuSection: 'Desserts & Sweets' },
  { id: 'drinks', label: 'Drinks', menuSection: 'Drinks & Beverages' },
];

export default function RestaurantSettingsPage() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['owner-restaurant'],
    queryFn: async () => {
      const { data } = await api.get<Restaurant>('/restaurant-owner/restaurant');
      return data;
    },
    enabled: status === 'authenticated',
  });

  const [form, setForm] = useState<Partial<Restaurant & { minOrderNle: string }>>({ categories: [] });

  const loadForm = (r: Restaurant) => {
    setForm({
      ...r,
      minOrderNle: String(toNleAmount(r.minOrderAmount)),
      openingHours: (r.openingHours as Restaurant['openingHours']) || {
        mon: { open: '08:00', close: '22:00' },
        tue: { open: '08:00', close: '22:00' },
        wed: { open: '08:00', close: '22:00' },
        thu: { open: '08:00', close: '22:00' },
        fri: { open: '08:00', close: '23:00' },
        sat: { open: '09:00', close: '23:00' },
        sun: { open: '10:00', close: '21:00' },
      },
    });
  };

  useEffect(() => {
    if (restaurant) loadForm(restaurant);
  }, [restaurant]);

  const save = useMutation({
    mutationFn: async () => {
      setSaving(true);
      let logoUrl = form.logoUrl;
      let coverImage = form.coverImage;
      const logoFile = (form as { logoFile?: File }).logoFile;
      const coverFile = (form as { coverFile?: File }).coverFile;
      if (logoFile) logoUrl = await uploadMenuImage(logoFile);
      if (coverFile) coverImage = await uploadMenuImage(coverFile);

      await api.patch('/restaurant-owner/restaurant', {
        name: form.name,
        description: form.description,
        phone: form.phone,
        email: form.email,
        address: form.address,
        lat: Number(form.lat),
        lng: Number(form.lng),
        logoUrl,
        coverImage,
        isOpen: form.isOpen,
        isBusy: form.isBusy,
        minOrderAmount: form.minOrderNle ? Number(form.minOrderNle) : 0,
        deliveryTimeMin: Number(form.deliveryTimeMin),
        deliveryTimeMax: Number(form.deliveryTimeMax),
        openingHours: form.openingHours,
        categories: form.categories ?? [],
      });
    },
    onSuccess: () => {
      setMessage('Profile updated — visible to customers and admin.');
      queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['owner-menu'] });
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    },
    onError: () => setMessage('Could not save. Check all required fields.'),
    onSettled: () => setSaving(false),
  });

  if (isLoading) return <p className="text-brand-gray">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Restaurant settings</h1>
      <p className="text-brand-gray text-sm">Updates sync to the customer app and admin dashboard.</p>

      {saving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-dark/90">
          <div className="w-12 h-12 border-4 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-brand-gold mt-4">Saving…</p>
        </div>
      )}

      <div className="glass-card p-6 space-y-4">
        <Field label="Restaurant name">
          <input className="input-field" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className="input-field min-h-[80px]" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Address">
          <input className="input-field" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input className="input-field" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input-field" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input className="input-field" type="number" step="any" value={form.lat ?? ''} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} />
          </Field>
          <Field label="Longitude">
            <input className="input-field" type="number" step="any" value={form.lng ?? ''} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} />
          </Field>
        </div>

        <Field label="Logo">
          {form.logoUrl && (
            <MediaImage src={form.logoUrl} alt="" className="w-20 h-20 rounded-lg object-cover mb-2" />
          )}
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setForm({ ...form, logoUrl: URL.createObjectURL(f), logoFile: f } as typeof form);
          }} />
          <button type="button" onClick={() => logoRef.current?.click()} className="text-sm border border-white/20 px-3 py-1.5 rounded-lg">Upload logo</button>
        </Field>

        <Field label="Cover image">
          {form.coverImage && (
            <MediaImage src={form.coverImage} alt="" className="w-full h-32 rounded-lg object-cover mb-2" />
          )}
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setForm({ ...form, coverImage: URL.createObjectURL(f), coverFile: f } as typeof form);
          }} />
          <button type="button" onClick={() => coverRef.current?.click()} className="text-sm border border-white/20 px-3 py-1.5 rounded-lg">Upload cover</button>
        </Field>

        <div>
          <p className="text-sm text-brand-gray mb-1">Cuisine tags (customer search filters)</p>
          <p className="text-xs text-brand-gray/80 mb-2">
            These control which menu sections appear in Menu &amp; Food. African and Local share one section:
            African &amp; Local Specialties.
          </p>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => {
              const selected = (form.categories ?? []).includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  title={`Menu section: ${c.menuSection}`}
                  onClick={() => {
                    const cur = form.categories ?? [];
                    setForm({
                      ...form,
                      categories: selected ? cur.filter((x) => x !== c.id) : [...cur, c.id],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    selected
                      ? 'border-brand-gold bg-brand-gold/20 text-brand-gold'
                      : 'border-white/20 text-brand-gray hover:border-white/40'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isOpen ?? true} onChange={(e) => setForm({ ...form, isOpen: e.target.checked })} />
            Open for orders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isBusy ?? false} onChange={(e) => setForm({ ...form, isBusy: e.target.checked })} />
            Busy (longer prep)
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Min order (NLE)">
            <input className="input-field" type="number" value={form.minOrderNle || '0'} onChange={(e) => setForm({ ...form, minOrderNle: e.target.value })} />
          </Field>
          <Field label="Delivery min (min)">
            <input className="input-field" type="number" value={form.deliveryTimeMin ?? 30} onChange={(e) => setForm({ ...form, deliveryTimeMin: Number(e.target.value) })} />
          </Field>
          <Field label="Delivery max (min)">
            <input className="input-field" type="number" value={form.deliveryTimeMax ?? 45} onChange={(e) => setForm({ ...form, deliveryTimeMax: Number(e.target.value) })} />
          </Field>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => save.mutate()}
          className="w-full py-3 rounded-xl gold-gradient text-brand-dark font-semibold disabled:opacity-50"
        >
          Save profile
        </button>
        {message && <p className="text-brand-gold text-sm">{message}</p>}
        <p className="text-xs text-brand-gray">Signed in as {session?.user?.email}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-brand-gray">{label}{children}</label>;
}
