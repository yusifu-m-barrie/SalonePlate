'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatDate';
import { appConfirm } from '@/lib/appAlert';
import {
  PROMO_FILTERS,
  type PromoFilterId,
  type PromoWithStats,
  matchesPromoFilter,
  promoFilterLabel,
} from '@/lib/promotionFilters';

function promoValueLabel(p: PromoWithStats): string {
  if (p.type === 'PERCENTAGE') return `${p.value}% off`;
  if (p.type === 'FREE_DELIVERY') return 'Free delivery';
  return `${formatCurrency(p.value)} off`;
}

function PromoStatusBadge({ promo }: { promo: PromoWithStats }) {
  if (promo.isExpired) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/20 text-gray-400">Expired</span>;
  }
  if (!promo.isActive) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400">Paused</span>;
  }
  if (promo.isUsed || promo.stats.orderCount > 0) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400">Used</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-300">Unused</span>;
}

function PromoCard({
  promo,
  onToggle,
  onDelete,
  busy,
}: {
  promo: PromoWithStats;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { stats } = promo;
  const scopeLabel = promo.restaurant?.name ?? 'Platform-wide';
  const usageLimitReached =
    promo.usageLimit != null && (stats.orderCount >= promo.usageLimit || promo.usedCount >= promo.usageLimit);

  return (
    <div className="glass-card p-4 h-full flex flex-col border border-white/5 min-h-[280px]">
      <div className="flex justify-between items-start gap-2">
        <p className="font-mono text-brand-gold text-lg font-semibold truncate">{promo.code}</p>
        <PromoStatusBadge promo={promo} />
      </div>

      <p className="font-medium text-sm mt-1 line-clamp-2">{promo.title}</p>
      <p className="text-xs text-brand-gray mt-1">{promoValueLabel(promo)}</p>
      <p className="text-xs text-brand-gray mt-0.5 truncate" title={scopeLabel}>
        {scopeLabel}
      </p>

      <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-brand-gray">Customers</p>
          <p className="font-semibold text-white">{stats.uniqueCustomers}</p>
        </div>
        <div>
          <p className="text-brand-gray">Times used</p>
          <p className="font-semibold text-white">
            {stats.orderCount}
            {promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
          </p>
        </div>
        <div>
          <p className="text-brand-gray">Discount given</p>
          <p className="font-semibold text-brand-gold">{formatCurrency(stats.totalDiscount)}</p>
        </div>
        <div>
          <p className="text-brand-gray">Order value</p>
          <p className="font-semibold text-white">{formatCurrency(stats.totalOrderValue)}</p>
        </div>
      </div>

      {stats.lastUsedAt && (
        <p className="text-[10px] text-brand-gray mt-2">Last used {formatDateTime(stats.lastUsedAt)}</p>
      )}

      {stats.restaurants.length > 0 && (
        <div className="mt-3 flex-1">
          <p className="text-[10px] uppercase text-brand-gray mb-1.5">Used at restaurant(s)</p>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {stats.restaurants.map((r) => (
              <div
                key={r.id}
                className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/5"
              >
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-brand-gray mt-0.5">
                  {r.orderCount} order{r.orderCount !== 1 ? 's' : ''} · {formatCurrency(r.totalOrderValue)} spent ·{' '}
                  {formatCurrency(r.totalDiscount)} saved
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.orderCount === 0 && (
        <p className="text-[10px] text-brand-gray mt-3 italic">No customer has redeemed this code yet.</p>
      )}

      {usageLimitReached && (
        <p className="text-[10px] text-yellow-400 mt-2">Usage limit reached</p>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className="flex-1 text-xs border border-white/20 px-2 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50"
        >
          {promo.isActive ? 'Pause' : 'Activate'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="text-xs border border-red-500/40 text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState<PromoFilterId>('all');
  const [form, setForm] = useState({
    code: '',
    title: '',
    type: 'PERCENTAGE',
    value: '15',
    minOrder: '',
    usageLimit: '',
    expiresAt: '',
  });

  const { data: promos = [], isLoading, isFetching } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data } = await api.get<PromoWithStats[]>('/promotions/admin/all');
      return data;
    },
    enabled: status === 'authenticated',
    refetchInterval: 30000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });

  const filteredPromos = useMemo(
    () => promos.filter((p) => matchesPromoFilter(p, filter)),
    [promos, filter],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<PromoFilterId, number>> = { all: promos.length };
    for (const f of PROMO_FILTERS) {
      if (f.id === 'all') continue;
      map[f.id] = promos.filter((p) => matchesPromoFilter(p, f.id)).length;
    }
    return map;
  }, [promos]);

  const totals = useMemo(
    () =>
      promos.reduce(
        (acc, p) => ({
          discount: acc.discount + p.stats.totalDiscount,
          revenue: acc.revenue + p.stats.totalOrderValue,
          orders: acc.orders + p.stats.orderCount,
        }),
        { discount: 0, revenue: 0, orders: 0 },
      ),
    [promos],
  );

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/promotions/admin', {
        code: form.code,
        title: form.title,
        type: form.type,
        value: Number(form.value),
        minOrder: form.minOrder ? Number(form.minOrder) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
    },
    onSuccess: () => {
      setModal(false);
      setForm({
        code: '',
        title: '',
        type: 'PERCENTAGE',
        value: '15',
        minOrder: '',
        usageLimit: '',
        expiresAt: '',
      });
      invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/promotions/admin/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/admin/${id}`),
    onSuccess: invalidate,
  });

  const busy = toggle.isPending || remove.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Promotions &amp; coupons</h1>
          <p className="text-brand-gray text-sm">
            Track usage, customers, restaurants, and money saved per coupon
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="px-4 py-2 rounded-xl gold-gradient text-brand-dark font-medium text-sm shrink-0"
        >
          Create platform coupon
        </button>
      </div>

      {!isLoading && promos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-brand-gray">Total promo orders</p>
            <p className="text-xl font-bold text-brand-gold mt-1">{totals.orders}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-brand-gray">Customer savings (discounts)</p>
            <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(totals.discount)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-brand-gray">Order value with promos</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totals.revenue)}</p>
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <p className="text-xs text-brand-gray mb-3 uppercase tracking-wide">Filter coupons</p>
        <div className="flex flex-wrap gap-2">
          {PROMO_FILTERS.map((f) => {
            const active = filter === f.id;
            const count = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold'
                    : 'border-white/15 text-brand-gray hover:border-white/30 hover:text-white'
                }`}
              >
                {f.label}
                {!isLoading && <span className="ml-1.5 opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 text-sm text-brand-gray">
        <span>
          {filteredPromos.length} coupon(s)
          {filter !== 'all' && ` · ${promoFilterLabel(filter)}`}
        </span>
        {isFetching && <span>Updating…</span>}
      </div>

      {isLoading && <p className="text-brand-gray">Loading…</p>}

      {!isLoading && filteredPromos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredPromos.map((p) => (
            <PromoCard
              key={p.id}
              promo={p}
              busy={busy}
              onToggle={() => toggle.mutate({ id: p.id, isActive: !p.isActive })}
              onDelete={() =>
                appConfirm('Delete promotion?', 'This coupon will be removed.', () => remove.mutate(p.id), {
                  confirmText: 'Delete',
                  destructive: true,
                })
              }
            />
          ))}
        </div>
      )}

      {!isLoading && filteredPromos.length === 0 && (
        <p className="text-brand-gray text-center py-12 glass-card">
          {promos.length === 0
            ? 'No promotions yet. Create a platform coupon to get started.'
            : `No coupons match “${promoFilterLabel(filter)}”.`}
        </p>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModal(false)} />
          <div className="relative glass-card p-6 w-full max-w-md space-y-3">
            <h2 className="font-semibold">Platform coupon</h2>
            <input
              className="input-field"
              placeholder="CODE"
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
              <option value="PERCENTAGE">Percentage off</option>
              <option value="FIXED_AMOUNT">Fixed NLE off</option>
              <option value="FREE_DELIVERY">Free delivery</option>
            </select>
            <input
              className="input-field"
              type="number"
              placeholder="Value"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Min order (NLE, optional)"
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Usage limit (optional)"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
            <input
              className="input-field"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
            <button
              type="button"
              disabled={create.isPending || !form.code.trim() || !form.title.trim()}
              onClick={() => create.mutate()}
              className="w-full py-3 gold-gradient rounded-xl text-brand-dark font-semibold disabled:opacity-50"
            >
              {create.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
