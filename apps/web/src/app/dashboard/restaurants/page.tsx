'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

type RestaurantRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  isOpen: boolean;
  isBusy?: boolean;
  phone?: string | null;
  createdAt: string;
  city?: { name: string };
  owner?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  activeOrdersCount?: number;
  pendingOrdersCount?: number;
  needsAttention?: boolean;
  isActive?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
  REJECTED: 'bg-gray-500/20 text-gray-400',
};

export default function RestaurantsPage() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();

  const { data: restaurants = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: async () => {
      const { data } = await api.get<RestaurantRow[]>('/admin/restaurants');
      return data;
    },
    enabled: status === 'authenticated',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/restaurants/${id}/approve`),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/restaurants/${id}/reject`),
    onSuccess: invalidate,
  });

  const suspend = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/restaurants/${id}/suspend`),
    onSuccess: invalidate,
  });

  const pending = restaurants.filter((r) => r.status === 'PENDING');
  const others = restaurants.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Restaurant Management</h1>
        <p className="text-brand-gray">Approve new sign-ups, suspend, or verify businesses</p>
      </div>

      {error && (
        <div className="glass-card p-4 border border-red-500/30">
          <p className="text-red-400 text-sm">
            Could not load restaurants. Ensure the API is running (
            <code className="text-xs">npm run dev</code> in services/api) and you are signed in as admin.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 text-sm text-brand-gold underline"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading && <p className="text-brand-gray">Loading...</p>}

      {pending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-brand-gold mb-3">
            Pending approval ({pending.length})
          </h2>
          <div className="grid gap-4">
            {pending.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                onApprove={() => approve.mutate(r.id)}
                onReject={() => reject.mutate(r.id)}
                busy={approve.isPending || reject.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && !isLoading && (
        <p className="text-brand-gray text-sm">No restaurants waiting for approval.</p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">All restaurants ({others.length})</h2>
        <div className="grid gap-4">
          {others.map((r) => (
            <div key={r.id} className="glass-card p-4 flex flex-wrap justify-between items-center gap-4">
              <RestaurantInfo restaurant={r} />
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/dashboard/restaurants/${r.id}`}
                  className="px-3 py-1 rounded-lg text-xs border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10"
                >
                  View details
                </Link>
                <span className={`px-3 py-1 rounded-full text-xs ${STATUS_STYLES[r.status] || ''}`}>
                  {r.status}
                </span>
                {r.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => suspend.mutate(r.id)}
                    disabled={suspend.isPending}
                    className="px-3 py-1 rounded-lg text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Suspend
                  </button>
                )}
                {r.status === 'SUSPENDED' && (
                  <button
                    type="button"
                    onClick={() => approve.mutate(r.id)}
                    disabled={approve.isPending}
                    className="px-3 py-1 rounded-lg text-xs bg-green-500/20 text-green-400"
                  >
                    Re-approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RestaurantInfo({ restaurant: r }: { restaurant: RestaurantRow }) {
  const owner = r.owner;
  const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || '—';
  return (
    <div>
      <p className="font-medium text-lg flex items-center gap-2 flex-wrap">
        <Link href={`/dashboard/restaurants/${r.id}`} className="hover:text-brand-gold transition-colors">
          {r.name}
        </Link>
        <span className={`text-xs px-2 py-0.5 rounded-full ${r.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {r.isOpen ? 'Open' : 'Closed'}
        </span>
        {r.needsAttention && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
            {r.pendingOrdersCount} pending order(s)
          </span>
        )}
      </p>
      <p className="text-brand-gray text-sm">{r.address}</p>
      <p className="text-brand-gray text-sm mt-1">
        {r.city?.name || 'Makeni'} · Owner: {ownerName}
        {owner?.email ? ` · ${owner.email}` : ''}
        {owner?.phone || r.phone ? ` · ${owner?.phone || r.phone}` : ''}
      </p>
      {(r.activeOrdersCount ?? 0) > 0 && (
        <p className="text-brand-gold text-xs mt-1">{r.activeOrdersCount} active order(s)</p>
      )}
    </div>
  );
}

function RestaurantCard({
  restaurant: r,
  onApprove,
  onReject,
  busy,
}: {
  restaurant: RestaurantRow;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <div className="glass-card p-5 border border-brand-gold/30">
      <RestaurantInfo restaurant={r} />
      <div className="flex gap-2 mt-4 flex-wrap">
        <Link
          href={`/dashboard/restaurants/${r.id}`}
          className="px-4 py-2 rounded-lg text-sm border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10"
        >
          View details
        </Link>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm font-semibold gold-gradient text-brand-dark disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm border border-red-500/40 text-red-400 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
