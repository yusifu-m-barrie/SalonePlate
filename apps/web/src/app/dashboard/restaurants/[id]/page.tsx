'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus';
import { formatDateTime } from '@/lib/formatDate';
import { MediaImage } from '@/components/ui/MediaImage';

type RestaurantDetail = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    address: string;
    phone?: string | null;
    email?: string | null;
    status: string;
    isOpen: boolean;
    isVerified: boolean;
    isFeatured: boolean;
    rating: number;
    reviewCount: number;
    categories: string[];
    coverImage?: string | null;
    logoUrl?: string | null;
    deliveryFee?: number | null;
    minOrderAmount: number;
    commissionRate: number;
    createdAt: string;
    walletBalance: number;
    escrowBalance: number;
    owner?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
    };
    city?: { name: string; slug: string };
  };
  stats: {
    totalOrders: number;
    menuItemCount: number;
    favoriteCount: number;
    reviewCount: number;
    customerCount: number;
    deliveredOrderCount: number;
    revenueSubtotal: number;
    revenueTotal: number;
    revenueTodaySubtotal: number;
    revenueTodayTotal: number;
    ordersDeliveredToday: number;
    walletBalance?: number;
  };
  menuCategories: {
    id: string;
    name: string;
    isActive: boolean;
    items: {
      id: string;
      name: string;
      price: number;
      isAvailable: boolean;
      imageUrl?: string | null;
    }[];
  }[];
  promotions: {
    id: string;
    code: string;
    title: string;
    type: string;
    value: number;
    isActive: boolean;
    usedCount: number;
    expiresAt?: string | null;
  }[];
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    customer?: { firstName?: string | null; lastName?: string | null; phone?: string | null };
    payment?: { method: string; status: string };
  }[];
  customers: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    source: string;
    orderCount: number;
    favorited: boolean;
  }[];
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
  REJECTED: 'bg-gray-500/20 text-gray-400',
};

export default function AdminRestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useSession();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-restaurant', id],
    queryFn: async () => {
      const { data } = await api.get<RestaurantDetail>(`/admin/restaurants/${id}`);
      return data;
    },
    enabled: status === 'authenticated' && !!id,
  });

  if (isLoading) {
    return <p className="text-brand-gray">Loading restaurant…</p>;
  }

  if (error || !data) {
    return (
      <div>
        <Link href="/dashboard/restaurants" className="text-brand-gold text-sm hover:underline">
          ← Back to restaurants
        </Link>
        <p className="text-red-400 mt-4">Failed to load restaurant details.</p>
        <button type="button" onClick={() => refetch()} className="text-brand-gold underline text-sm mt-2">
          Retry
        </button>
      </div>
    );
  }

  const { restaurant: r, stats, menuCategories, promotions, orders, customers } = data;
  const ownerName = [r.owner?.firstName, r.owner?.lastName].filter(Boolean).join(' ') || '—';
  const menuItemTotal = menuCategories.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/restaurants" className="text-brand-gold text-sm hover:underline">
          ← Back to restaurants
        </Link>
        <div className="flex flex-wrap items-start gap-4 mt-3">
          {r.logoUrl && (
            <MediaImage src={r.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{r.name}</h1>
            <p className="text-brand-gray text-sm">{r.address}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs ${STATUS_STYLES[r.status] || ''}`}>
                {r.status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs ${r.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
              >
                {r.isOpen ? 'Open' : 'Closed'}
              </span>
              {r.isVerified && (
                <span className="px-3 py-1 rounded-full text-xs bg-brand-gold/20 text-brand-gold">Verified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenue (delivered)" value={formatCurrency(stats.revenueSubtotal)} />
        <StatCard label="Today" value={formatCurrency(stats.revenueTodaySubtotal)} sub={`${stats.ordersDeliveredToday} orders`} />
        <StatCard label="Wallet balance" value={formatCurrency(r.walletBalance)} />
        <StatCard label="Customers" value={String(stats.customerCount)} sub={`${stats.favoriteCount} favorites`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h3 className="font-semibold">Business details</h3>
          <InfoRow label="City" value={r.city?.name || '—'} />
          <InfoRow label="Phone" value={r.phone || '—'} />
          <InfoRow label="Email" value={r.email || '—'} />
          <InfoRow label="Slug" value={r.slug} />
          <InfoRow label="Min order" value={formatCurrency(r.minOrderAmount)} />
          <InfoRow label="Commission" value={`${(r.commissionRate * 100).toFixed(0)}%`} />
          <InfoRow label="Rating" value={`${r.rating.toFixed(1)}★ (${stats.reviewCount} reviews)`} />
          <InfoRow
            label="Cuisines"
            value={r.categories?.length ? r.categories.join(', ') : '—'}
          />
          {r.description && <p className="text-sm text-brand-gray pt-2">{r.description}</p>}
          <p className="text-xs text-brand-gray">
            Registered {formatDateTime(r.createdAt)}
            {r.status === 'APPROVED' && <> · Approved {formatDateTime(r.approvedAt)}</>}
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <h3 className="font-semibold">Owner</h3>
          <InfoRow label="Name" value={ownerName} />
          <InfoRow label="Email" value={r.owner?.email || '—'} />
          <InfoRow label="Phone" value={r.owner?.phone || '—'} />
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-brand-gray">Total orders</p>
              <p className="font-semibold">{stats.totalOrders}</p>
            </div>
            <div>
              <p className="text-brand-gray">Delivered</p>
              <p className="font-semibold">{stats.deliveredOrderCount}</p>
            </div>
            <div>
              <p className="text-brand-gray">Menu items</p>
              <p className="font-semibold">{menuItemTotal}</p>
            </div>
            <div>
              <p className="text-brand-gray">Gross (incl. fees)</p>
              <p className="font-semibold text-brand-gold">{formatCurrency(stats.revenueTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="glass-card p-6">
        <h3 className="font-semibold mb-4">Menu ({menuItemTotal} items)</h3>
        {menuCategories.length === 0 ? (
          <p className="text-brand-gray text-sm">No menu categories yet.</p>
        ) : (
          <div className="space-y-6">
            {menuCategories.map((cat) => (
              <div key={cat.id}>
                <h4 className="text-brand-gold text-sm font-medium mb-2">
                  {cat.name}
                  {!cat.isActive && (
                    <span className="text-brand-gray ml-2">(inactive)</span>
                  )}
                  <span className="text-brand-gray ml-2">({cat.items.length})</span>
                </h4>
                {cat.items.length === 0 ? (
                  <p className="text-xs text-brand-gray">No items</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/5"
                      >
                        {item.imageUrl && (
                          <MediaImage
                            src={item.imageUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-brand-gold text-sm">{formatCurrency(item.price)}</p>
                          {!item.isAvailable && (
                            <p className="text-xs text-red-400">Hidden</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <h3 className="font-semibold mb-4">Coupons & promotions ({promotions.length})</h3>
        {promotions.length === 0 ? (
          <p className="text-brand-gray text-sm">No promotions for this restaurant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-brand-gray text-left border-b border-white/10">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Value</th>
                  <th className="py-2 pr-4">Used</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-mono text-brand-gold">{p.code}</td>
                    <td className="py-2 pr-4">{p.title}</td>
                    <td className="py-2 pr-4">{p.type}</td>
                    <td className="py-2 pr-4">
                      {p.type === 'PERCENTAGE' ? `${p.value}%` : formatCurrency(p.value)}
                    </td>
                    <td className="py-2 pr-4">{p.usedCount}</td>
                    <td className="py-2">{p.isActive ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <h3 className="font-semibold mb-4">Connected customers ({customers.length})</h3>
        {customers.length === 0 ? (
          <p className="text-brand-gray text-sm">No customers have ordered or favorited this restaurant yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-brand-gray text-left border-b border-white/10">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Orders</th>
                  <th className="py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="py-2 pr-4 text-brand-gray">
                      {c.phone || c.email || '—'}
                    </td>
                    <td className="py-2 pr-4">{c.orderCount}</td>
                    <td className="py-2 text-xs">
                      {c.favorited && <span className="text-brand-gold mr-2">★ Favorite</span>}
                      {c.source === 'order' && !c.favorited && 'Ordered'}
                      {c.source === 'favorite' && !c.orderCount && 'Favorite only'}
                      {c.source === 'both' && c.orderCount > 0 && c.favorited && 'Both'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass-card p-6">
        <h3 className="font-semibold mb-4">Recent orders ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-brand-gray text-sm">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/dashboard/orders/${o.id}`}
                className="flex flex-wrap justify-between items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-brand-gold/30 transition-colors"
              >
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-brand-gray">
                    {[o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(' ') || 'Customer'}{' '}
                    · {formatDateTime(o.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-brand-gold font-medium">{formatCurrency(o.totalAmount)}</p>
                  <p className="text-xs text-brand-gray">
                    {ORDER_STATUS_LABEL[o.status] || o.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-brand-gray text-xs">{label}</p>
      <p className="text-xl font-bold text-brand-gold mt-1">{value}</p>
      {sub && <p className="text-xs text-brand-gray mt-1">{sub}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-brand-gray">{label}: </span>
      {value}
    </p>
  );
}
