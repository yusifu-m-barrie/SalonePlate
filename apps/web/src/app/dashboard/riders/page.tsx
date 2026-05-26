'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

type RiderRow = {
  id: string;
  vehicleType: string;
  licenseNumber?: string;
  status: string;
  totalDeliveries: number;
  rating: number;
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string; phone?: string };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
  OFFLINE: 'bg-gray-500/20 text-gray-400',
  ONLINE: 'bg-blue-500/20 text-blue-400',
};

export default function RidersPage() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();

  const { data: riders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-riders'],
    queryFn: async () => {
      const { data } = await api.get<RiderRow[]>('/admin/riders');
      return data;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-riders'] });

  const approve = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/riders/${id}/approve`),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/riders/${id}/reject`),
    onSuccess: invalidate,
  });

  const pending = riders.filter((r) => r.status === 'PENDING');
  const others = riders.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Courier Management</h1>
        <p className="text-brand-gray">Approve rider sign-ups and manage delivery partners</p>
      </div>

      {error && (
        <div className="glass-card p-4 border border-red-500/30">
          <p className="text-red-400 text-sm">
            Could not load riders. Ensure the API is running and you are signed in as admin.
          </p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm text-brand-gold underline">
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
              <RiderCard
                key={r.id}
                rider={r}
                onApprove={() => approve.mutate(r.id)}
                onReject={() => reject.mutate(r.id)}
                busy={approve.isPending || reject.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && !isLoading && (
        <p className="text-brand-gray text-sm">No riders waiting for approval.</p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">All riders ({others.length})</h2>
        <div className="grid gap-4">
          {others.map((r) => (
            <div key={r.id} className="glass-card p-4 flex flex-wrap justify-between items-center gap-4">
              <RiderInfo rider={r} />
              <span className={`px-3 py-1 rounded-full text-xs ${STATUS_STYLES[r.status] || ''}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RiderInfo({ rider: r }: { rider: RiderRow }) {
  const u = r.user;
  const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—';
  return (
    <div>
      <p className="font-medium text-lg">{name}</p>
      <p className="text-brand-gray text-sm">
        {r.vehicleType}
        {r.licenseNumber ? ` · License ${r.licenseNumber}` : ''}
      </p>
      <p className="text-brand-gray text-sm mt-1">
        ★ {r.rating?.toFixed(1)} · {r.totalDeliveries} deliveries
        {u?.email ? ` · ${u.email}` : ''}
        {u?.phone ? ` · ${u.phone}` : ''}
      </p>
    </div>
  );
}

function RiderCard({
  rider: r,
  onApprove,
  onReject,
  busy,
}: {
  rider: RiderRow;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <div className="glass-card p-5 border border-brand-gold/30">
      <RiderInfo rider={r} />
      <div className="flex gap-2 mt-4">
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
