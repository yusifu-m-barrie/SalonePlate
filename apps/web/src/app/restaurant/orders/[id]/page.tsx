'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ORDER_STATUS_LABEL, ACTIVE_ORDER_STATUSES } from '@/lib/orderStatus';
import { formatDateTime } from '@/lib/formatDate';

export default function RestaurantOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();

  const { data: order, isLoading } = useQuery({
    queryKey: ['owner-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/restaurant-owner/orders/${id}`);
      return data;
    },
    enabled: status === 'authenticated' && !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status, note }: { orderId: string; status: string; note?: string }) => {
      await api.patch(`/restaurant-owner/orders/${orderId}/status`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-order', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
    },
  });

  if (isLoading || !order) {
    return <p className="text-brand-gray">Loading order…</p>;
  }

  const addr = order.deliveryAddress as { street?: string; city?: string; distanceKm?: number } | undefined;
  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Customer';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/restaurant/orders" className="text-brand-gold text-sm hover:underline">
          ← Back to orders
        </Link>
        <h1 className="text-2xl font-bold mt-2">{order.orderNumber}</h1>
        <p className="text-brand-gray">
          {ORDER_STATUS_LABEL[order.status] || order.status} · {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-2">Customer</h3>
          <p>{customerName}</p>
          <p className="text-sm text-brand-gray">{order.customer?.phone}</p>
          <p className="text-sm text-brand-gray">{order.customer?.email}</p>
        </div>
        {addr?.street && (
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-2">Delivery</h3>
            <p>
              {addr.street}
              {addr.city ? `, ${addr.city}` : ''}
            </p>
            {addr.distanceKm != null && <p className="text-sm text-brand-gray">{addr.distanceKm} km away</p>}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Items</h3>
        {order.items?.map((item: { name: string; quantity: number; totalPrice: number }, i: number) => (
          <div key={i} className="flex justify-between py-2 border-b border-white/5">
            <span>
              {item.quantity}× {item.name}
            </span>
            <span>{formatCurrency(item.totalPrice)}</span>
          </div>
        ))}
        <p className="text-brand-gold font-bold text-lg mt-4">{formatCurrency(order.totalAmount)}</p>
      </div>

      {order.timeline && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Timeline</h3>
          {order.timeline.map((t: { id: string; status: string; note?: string; createdAt: string }) => (
            <div key={t.id} className="border-l-2 border-brand-gold/40 pl-4 mb-4">
              <p className="font-medium">{ORDER_STATUS_LABEL[t.status] || t.status}</p>
              {t.note && <p className="text-sm text-brand-gray">{t.note}</p>}
              <p className="text-xs text-brand-gray">{formatDateTime(t.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {order.review && (
        <div className="glass-card p-6 border border-brand-gold/30">
          <h3 className="font-semibold mb-2">Customer rating</h3>
          <p className="text-brand-gold text-xl">{order.review.rating}★</p>
          {order.review.comment && <p className="text-brand-gray mt-2">{order.review.comment}</p>}
        </div>
      )}

      {ACTIVE_ORDER_STATUSES.includes(order.status) && (
        <div className="glass-card p-6 flex flex-wrap gap-2">
          {order.status === 'PLACED' && (
            <>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ orderId: order.id, status: 'RESTAURANT_ACCEPTED', note: 'Accepted' })
                }
                className="px-4 py-2 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ orderId: order.id, status: 'CANCELLED', note: 'Declined' })
                }
                className="px-4 py-2 rounded-xl border border-red-500/40 text-red-400 text-sm"
              >
                Decline
              </button>
            </>
          )}
          {order.status === 'RESTAURANT_ACCEPTED' && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate({ orderId: order.id, status: 'PREPARING', note: 'Preparing' })
              }
              className="px-4 py-2 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
            >
              Start preparing
            </button>
          )}
          {order.status === 'PREPARING' && (
            <>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ orderId: order.id, status: 'RIDER_ASSIGNED', note: 'Ready' })
                }
                className="px-4 py-2 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
              >
                Mark ready
              </button>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ orderId: order.id, status: 'ON_THE_WAY', note: 'Out for delivery' })
                }
                className="px-4 py-2 rounded-xl border border-brand-gold/40 text-brand-gold text-sm"
              >
                Out for delivery
              </button>
            </>
          )}
          {order.status === 'RIDER_ASSIGNED' && (
            <button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate({ orderId: order.id, status: 'ON_THE_WAY', note: 'On the way' })
              }
              className="px-4 py-2 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
            >
              Out for delivery
            </button>
          )}
          {order.status === 'ON_THE_WAY' && (
            <p className="text-brand-gray text-sm italic">Waiting for customer to confirm delivery</p>
          )}
        </div>
      )}
    </div>
  );
}
