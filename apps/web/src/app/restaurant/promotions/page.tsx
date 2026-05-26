'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatDate';
import { appConfirm } from '@/lib/appAlert';
import { SaveButton } from '@/components/ui/SaveButton';

type RestaurantPromo = {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: string;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  isUsed?: boolean;
  isExpired?: boolean;
  expiresAt?: string;
  stats: {
    orderCount: number;
    uniqueCustomers: number;
    totalDiscount: number;
    totalOrderValue: number;
    lastUsedAt?: string | null;
    menuItems: { name: string; totalQuantity: number }[];
  };
};

const TYPES = [
  { value: 'PERCENTAGE', label: '% off order' },
  { value: 'FIXED_AMOUNT', label: 'Fixed amount off (NLE)' },
  { value: 'FREE_DELIVERY', label: 'Free delivery' },
];

function promoValueLabel(p: RestaurantPromo): string {
  if (p.type === 'PERCENTAGE') return `${p.value}% off`;
  if (p.type === 'FREE_DELIVERY') return 'Free delivery';
  return `${formatCurrency(p.value)} off`;
}

function PromoStatusBadge({ promo }: { promo: RestaurantPromo }) {
  if (promo.isExpired) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/20 text-gray-400">Expired</span>;
  }
  if (!promo.isActive) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400">Paused</span>;
  }
  if (promo.isUsed || promo.stats.orderCount > 0) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400">Used</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300">Not used yet</span>;
}

export default function RestaurantPromotionsPage() {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    type: 'PERCENTAGE',
    value: '10',
    minOrder: '',
    maxDiscount: '',
    usageLimit: '',
    expiresAt: '',
  });

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['owner-promotions'],
    queryFn: async () => {
      const { data } = await api.get<RestaurantPromo[]>('/restaurant-owner/promotions');
      return data;
    },
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['owner-promotions'] });

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/restaurant-owner/promotions', {
        code: form.code,
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value),
        minOrder: form.minOrder ? Number(form.minOrder) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
    },
    onSuccess: () => {
      setModal(false);
      setForm({
        code: '',
        title: '',
        description: '',
        type: 'PERCENTAGE',
        value: '10',
        minOrder: '',
        maxDiscount: '',
        usageLimit: '',
        expiresAt: '',
      });
      invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/restaurant-owner/promotions/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/restaurant-owner/promotions/${id}`),
    onSuccess: invalidate,
  });

  const busy = create.isPending || toggle.isPending || remove.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Coupons &amp; promotions</h1>
          <p className="text-brand-gray text-sm">
            Customers enter your code at checkout. See which dishes were ordered with each coupon.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="px-5 py-2.5 rounded-xl gold-gradient text-brand-dark font-semibold text-sm shrink-0"
        >
          + Create coupon
        </button>
      </div>

      {isLoading && <p className="text-brand-gray">Loading…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {promos.map((p) => (
          <div
            key={p.id}
            className="glass-card p-4 flex flex-col h-full min-h-[260px] border border-white/5"
          >
            <div className="flex justify-between items-start gap-2">
              <p className="font-mono text-brand-gold text-lg font-semibold truncate">{p.code}</p>
              <PromoStatusBadge promo={p} />
            </div>

            <p className="font-medium text-sm mt-1 line-clamp-2">{p.title}</p>
            <p className="text-xs text-brand-gray mt-1">{promoValueLabel(p)}</p>
            {p.minOrder != null && p.minOrder > 0 && (
              <p className="text-xs text-brand-gray">Min order {formatCurrency(p.minOrder)}</p>
            )}

            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-brand-gray">Customers</p>
                <p className="font-semibold">{p.stats.uniqueCustomers}</p>
              </div>
              <div>
                <p className="text-brand-gray">Times used</p>
                <p className="font-semibold">
                  {p.stats.orderCount}
                  {p.usageLimit ? ` / ${p.usageLimit}` : ''}
                </p>
              </div>
              <div>
                <p className="text-brand-gray">Discount</p>
                <p className="font-semibold text-brand-gold">{formatCurrency(p.stats.totalDiscount)}</p>
              </div>
              <div>
                <p className="text-brand-gray">Order value</p>
                <p className="font-semibold">{formatCurrency(p.stats.totalOrderValue)}</p>
              </div>
            </div>

            {p.stats.lastUsedAt && (
              <p className="text-[10px] text-brand-gray mt-2">
                Last used {formatDateTime(p.stats.lastUsedAt)}
              </p>
            )}

            {p.stats.menuItems.length > 0 ? (
              <div className="mt-3 flex-1">
                <p className="text-[10px] uppercase text-brand-gray mb-1.5">Food items ordered</p>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {p.stats.menuItems.map((item) => (
                    <div
                      key={item.name}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/5 flex justify-between gap-2"
                    >
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-brand-gray shrink-0">×{item.totalQuantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-brand-gray mt-3 italic flex-1">
                {p.stats.orderCount === 0
                  ? 'No customer has used this coupon yet.'
                  : 'No line-item detail for past uses.'}
              </p>
            )}

            <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                disabled={busy}
                onClick={() => toggle.mutate({ id: p.id, isActive: !p.isActive })}
                className="flex-1 text-xs border border-white/20 px-2 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50"
              >
                {p.isActive ? 'Pause' : 'Activate'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  appConfirm('Delete coupon?', 'This promotion will be removed.', () => remove.mutate(p.id), {
                    confirmText: 'Delete',
                    destructive: true,
                  })
                }
                className="text-xs border border-red-500/40 text-red-400 px-2 py-1.5 rounded-lg disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && promos.length === 0 && (
        <p className="text-brand-gray text-sm">No coupons yet. Create one for your customers.</p>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !create.isPending && setModal(false)} />
          <div className="relative glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="font-semibold text-lg">New coupon</h2>
            <input
              className="input-field"
              placeholder="Code e.g. LUNCH20"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
            <input
              className="input-field"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="input-field"
              type="number"
              placeholder={form.type === 'PERCENTAGE' ? 'Percent e.g. 15' : 'Amount NLE'}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Min order (NLE) optional"
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Max discount (NLE) optional"
              value={form.maxDiscount}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Usage limit optional"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
            <input
              className="input-field"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
            <SaveButton saving={create.isPending} onClick={() => create.mutate()} />
          </div>
        </div>
      )}
    </div>
  );
}
