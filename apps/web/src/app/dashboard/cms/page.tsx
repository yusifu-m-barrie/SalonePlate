'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { uploadMenuImage } from '@/lib/uploadImage';
import { appConfirm } from '@/lib/appAlert';
import { MediaImage } from '@/components/ui/MediaImage';

type Banner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  city?: { name: string };
};

const emptyForm = { title: '', subtitle: '', linkUrl: '', sortOrder: '0' };

export default function CmsPage() {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [formError, setFormError] = useState('');

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data } = await api.get<Banner[]>('/cms/banners/all');
      return data;
    },
    enabled: status === 'authenticated',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] });

  const sortedBanners = useMemo(() => {
    return [...banners].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [banners]);

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setPreview('');
    setFormError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (create.isPending) return;
    setModalOpen(false);
    resetForm();
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('image');
      const imageUrl = await uploadMenuImage(imageFile);
      await api.post('/cms/banners', {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl,
        linkUrl: form.linkUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      });
    },
    onSuccess: () => {
      resetForm();
      setModalOpen(false);
      invalidate();
    },
    onError: (err: Error) => {
      setFormError(err.message === 'image' ? 'Please upload a banner image.' : 'Could not save banner. Try again.');
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/cms/banners/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/cms/banners/${id}`),
    onSuccess: invalidate,
  });

  const saving = create.isPending;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">CMS — Homepage banners</h1>
          <p className="text-brand-gray text-sm">Banners appear on the customer app home screen (Makeni discover).</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="px-5 py-2.5 rounded-xl gold-gradient text-brand-dark font-semibold text-sm shrink-0"
        >
          + Add new
        </button>
      </div>

      <div>
        <h2 className="font-semibold mb-4">Banners ({banners.length})</h2>
        {isLoading && <p className="text-brand-gray">Loading…</p>}
        {!isLoading && banners.length === 0 && (
          <p className="text-brand-gray text-sm glass-card p-8 text-center">
            No banners yet. Click &quot;Add new&quot; to publish your first banner.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedBanners.map((b) => (
            <div key={b.id} className="glass-card overflow-hidden">
              <MediaImage src={b.imageUrl} alt={b.title} className="w-full h-36 object-cover" />
              <div className="p-4">
                <p className="font-medium">{b.title}</p>
                {b.subtitle && <p className="text-sm text-brand-gray">{b.subtitle}</p>}
                <p className="text-xs text-brand-gray mt-2">
                  {b.isActive ? 'Live' : 'Hidden'} · Order {b.sortOrder}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: b.id, isActive: !b.isActive })}
                    className="text-xs border border-white/20 px-2 py-1 rounded"
                  >
                    {b.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      appConfirm('Delete banner?', 'This cannot be undone.', () => remove.mutate(b.id), {
                        confirmText: 'Delete',
                        destructive: true,
                      })
                    }
                    className="text-xs border border-red-500/40 text-red-400 px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} aria-hidden />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-brand-dark border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Add banner</h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="p-1 text-brand-gray hover:text-white disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                className="input-field w-full"
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Subtitle"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
              <input
                className="input-field w-full"
                placeholder="Link URL (optional)"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              />
              <input
                className="input-field w-full"
                type="number"
                placeholder="Sort order"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />

              {preview && (
                <MediaImage src={preview} alt="" className="w-full h-32 object-cover rounded-xl" />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    setPreview(URL.createObjectURL(f));
                    setFormError('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="text-sm border border-white/20 px-4 py-2 rounded-lg hover:bg-white/5 disabled:opacity-50"
              >
                {imageFile ? 'Change image' : 'Upload image *'}
              </button>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <button
                type="button"
                disabled={saving || !form.title.trim() || !imageFile}
                onClick={() => create.mutate()}
                className="w-full py-3 rounded-xl gold-gradient text-brand-dark font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && (
                  <span
                    className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin shrink-0"
                    aria-hidden
                  />
                )}
                {saving ? 'Saving' : 'Publish banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
