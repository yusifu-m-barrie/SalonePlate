'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOwnerRealtime } from '@/hooks/useOwnerRealtime';

type OrderItem = { name: string; quantity: number; totalPrice: number };
type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  customer?: { firstName?: string; lastName?: string; phone?: string };
  payment?: { method: string };
  deliveryAddress?: { street?: string; city?: string };
  review?: { rating: number; comment?: string | null };
};

const STATUS_LABEL: Record<string, string> = {
  PLACED: 'New order',
  RESTAURANT_ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  RIDER_ASSIGNED: 'Ready',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  PLACED: 'bg-red-500/20 text-red-300',
  RESTAURANT_ACCEPTED: 'bg-blue-500/20 text-blue-300',
  PREPARING: 'bg-yellow-500/20 text-yellow-300',
  RIDER_ASSIGNED: 'bg-purple-500/20 text-purple-300',
  ON_THE_WAY: 'bg-cyan-500/20 text-cyan-300',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-gray-500/20 text-gray-400',
};

const ACTIVE_STATUSES = ['PLACED', 'RESTAURANT_ACCEPTED', 'PREPARING', 'RIDER_ASSIGNED', 'ON_THE_WAY'];

export default function RestaurantOrdersPage() {
  const { data: session, status } = useSession();

  const { data: restaurantInfo } = useQuery({
    queryKey: ['owner-restaurant'],
    queryFn: async () => {
      const { data } = await api.get<{ id: string }>('/restaurant-owner/restaurant');
      return data;
    },
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  useOwnerRealtime(restaurantInfo?.id, status === 'authenticated');

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['owner-orders'],
    queryFn: async () => {
      const { data } = await api.get<OrderRow[]>('/restaurant-owner/orders');
      return data;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
    staleTime: 15_000,
    refetchInterval: 20_000,
  });

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-brand-gray text-sm">Tap an order for full details, actions & timeline</p>
        </div>
        <button type="button" onClick={() => refetch()} className="text-sm text-brand-gold underline">
          Refresh
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm">
          Could not load orders. Ensure API is running and you are signed in as restaurant owner.
        </p>
      )}

      {isLoading && <p className="text-brand-gray">Loading…</p>}

      {!isLoading && orders.length === 0 && (
        <p className="text-brand-gray text-sm">No orders yet. Customers will see your menu on the app after approval.</p>
      )}

      {active.length > 0 && (
        <p className="text-brand-gold text-sm font-medium">{active.length} active order(s)</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map((order) => {
          const customerName =
            [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Customer';
          const addr = order.deliveryAddress;
          const itemPreview = order.items
            .slice(0, 3)
            .map((i) => `${i.quantity}× ${i.name}`)
            .join(', ');
          const moreItems = order.items.length > 3 ? ` +${order.items.length - 3} more` : '';
          const statusClass = STATUS_COLOR[order.status] ?? 'bg-white/10 text-brand-gray';

          return (
            <Link
              key={order.id}
              href={`/restaurant/orders/${order.id}`}
              className="glass-card p-4 flex flex-col h-full min-h-[200px] border border-white/5 hover:border-brand-gold/40 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <p className="font-semibold text-sm truncate">{order.orderNumber}</p>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusClass}`}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>

              <p className="text-sm text-white mt-2 font-medium truncate">{customerName}</p>
              {order.customer?.phone && (
                <p className="text-xs text-brand-gray truncate">{order.customer.phone}</p>
              )}

              {addr?.street && (
                <p className="text-xs text-brand-gray mt-1 line-clamp-2">
                  📍 {addr.street}
                  {addr.city ? `, ${addr.city}` : ''}
                </p>
              )}

              <p className="text-xs text-brand-gray mt-2 line-clamp-2 flex-1">
                {itemPreview}
                {moreItems}
              </p>

              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-brand-gold font-bold">{formatCurrency(order.totalAmount)}</p>
                <p className="text-[10px] text-brand-gray mt-1">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
                <p className="text-[10px] text-brand-gray capitalize">
                  {order.payment?.method?.replace(/_/g, ' ') || 'Payment'}
                </p>
                {order.review && (
                  <p className="text-xs text-brand-gold mt-1">★ {order.review.rating} rated</p>
                )}
              </div>

              <p className="text-[10px] text-brand-gold mt-2 font-medium">View details →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
