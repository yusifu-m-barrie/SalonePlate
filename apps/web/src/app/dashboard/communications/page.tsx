'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/formatDate';
import {
  ACTIVITY_FILTERS,
  type ActivityFilterId,
  activityFilterLabel,
  matchesActivityFilter,
} from '@/lib/activityFilters';
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';

type ActivityItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  customerName: string;
  message: string;
  type: string;
  status?: string;
  orderStatus?: string;
  createdAt: string;
};

const TYPE_STYLES: Record<string, string> = {
  ORDER_PLACED: 'bg-blue-500/20 text-blue-300',
  ORDER_UPDATE: 'bg-brand-gold/20 text-brand-gold',
  RATING: 'bg-purple-500/20 text-purple-300',
  STATUS_UPDATE: 'bg-green-500/20 text-green-300',
};

function activityTypeLabel(item: ActivityItem): string {
  if (item.type === 'RATING') return 'Rating';
  if (item.type === 'ORDER_PLACED') return 'Order placed';
  if (item.status && ORDER_STATUS_LABEL[item.status]) {
    return ORDER_STATUS_LABEL[item.status];
  }
  return item.type.replace(/_/g, ' ');
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const typeLabel = activityTypeLabel(item);
  const typeStyle = TYPE_STYLES[item.type] || 'bg-white/10 text-brand-gray';

  return (
    <Link
      href={`/dashboard/orders/${item.orderId}`}
      className="glass-card p-3 h-full min-h-[140px] flex flex-col border border-white/5 hover:border-brand-gold/40 transition-colors"
    >
      <span
        className={`self-start text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${typeStyle}`}
      >
        {typeLabel}
      </span>
      <p className="text-sm font-medium mt-2 line-clamp-3 flex-1 leading-snug">{item.message}</p>
      <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
        <p className="text-xs text-brand-gray truncate" title={item.customerName}>
          {item.customerName}
        </p>
        <p className="text-xs text-brand-gray truncate" title={item.restaurantName}>
          {item.restaurantName}
        </p>
        <p className="text-[10px] text-brand-gold font-mono truncate">{item.orderNumber}</p>
        {item.orderStatus && item.orderStatus !== item.status && (
          <p className="text-[10px] text-yellow-400/90">
            Current: {ORDER_STATUS_LABEL[item.orderStatus] || item.orderStatus}
          </p>
        )}
        <p className="text-[10px] text-brand-gray">{formatDateTime(item.createdAt)}</p>
      </div>
    </Link>
  );
}

export default function CommunicationsPage() {
  const { status } = useSession();
  const [filter, setFilter] = useState<ActivityFilterId>('all');
  useAdminRealtime(status === 'authenticated');

  const { data: feed = [], isLoading, isFetching } = useQuery({
    queryKey: ['admin-communications'],
    queryFn: async () => {
      const { data } = await api.get<ActivityItem[]>('/admin/communications', {
        params: { limit: 150 },
      });
      return data;
    },
    enabled: status === 'authenticated',
    refetchInterval: 20000,
  });

  const filteredFeed = useMemo(
    () => feed.filter((item) => matchesActivityFilter(item, filter)),
    [feed, filter],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<ActivityFilterId, number>> = { all: feed.length };
    for (const f of ACTIVITY_FILTERS) {
      if (f.id === 'all') continue;
      map[f.id] = feed.filter((item) => matchesActivityFilter(item, f.id)).length;
    }
    return map;
  }, [feed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-brand-gray text-sm">
            Filter by order stage — placed, preparing, completed, ratings, and more (last 14 days)
          </p>
        </div>
        {!isLoading && (
          <p className="text-brand-gray text-sm">
            {filteredFeed.length} shown
            {filter !== 'all' && ` · ${activityFilterLabel(filter)}`}
            {isFetching && ' · updating…'}
          </p>
        )}
      </div>

      <div className="glass-card p-4">
        <p className="text-xs text-brand-gray mb-3 uppercase tracking-wide">Filter by event</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map((f) => {
            const count = counts[f.id] ?? 0;
            const active = filter === f.id;
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
                {!isLoading && (
                  <span className={`ml-1.5 ${active ? 'text-brand-gold' : 'text-brand-gray/80'}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && <p className="text-brand-gray">Loading…</p>}

      {!isLoading && filteredFeed.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredFeed.map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {!isLoading && filteredFeed.length === 0 && (
        <p className="text-brand-gray text-center py-12 glass-card">
          {feed.length === 0
            ? 'No activity yet.'
            : `No events match “${activityFilterLabel(filter)}”. Try another filter.`}
        </p>
      )}
    </div>
  );
}
