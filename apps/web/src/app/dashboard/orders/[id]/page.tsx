'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus';

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/orders/${id}`);
      return data;
    },
    enabled: status === 'authenticated' && !!id,
  });

  if (isLoading || !order) {
    return <p className="text-brand-gray">Loading order…</p>;
  }

  const addr = order.deliveryAddress as { street?: string; city?: string; distanceKm?: number } | undefined;
  const communications = order.communications || [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/orders" className="text-brand-gold text-sm hover:underline">
          ← Back to orders
        </Link>
        <h1 className="text-2xl font-bold mt-2">{order.orderNumber}</h1>
        <p className="text-brand-gray">
          {ORDER_STATUS_LABEL[order.status] || order.status} · {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h3 className="font-semibold">Restaurant</h3>
          <p>{order.restaurant?.name}</p>
          <p className="text-sm text-brand-gray">{order.restaurant?.address}</p>
          <p className="text-sm">
            Open: {order.restaurant?.isOpen ? 'Yes' : 'No'} · Phone: {order.restaurant?.phone || '—'}
          </p>
          <p className="text-sm text-brand-gray">
            Owner: {order.restaurant?.owner?.firstName} {order.restaurant?.owner?.lastName} ·{' '}
            {order.restaurant?.owner?.phone}
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <h3 className="font-semibold">Customer</h3>
          <p>
            {order.customer?.firstName} {order.customer?.lastName}
          </p>
          <p className="text-sm text-brand-gray">{order.customer?.phone}</p>
          <p className="text-sm text-brand-gray">{order.customer?.email}</p>
        </div>
      </div>

      {addr?.street && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-2">Delivery</h3>
          <p>
            {addr.street}
            {addr.city ? `, ${addr.city}` : ''}
          </p>
          {addr.distanceKm != null && <p className="text-sm text-brand-gray">{addr.distanceKm} km</p>}
          {order.deliveryInstructions && (
            <p className="text-sm text-brand-gray mt-2">Note: {order.deliveryInstructions}</p>
          )}
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Items</h3>
        {order.items?.map((item: { id: string; name: string; quantity: number; totalPrice: number }) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-white/5">
            <span>
              {item.quantity}× {item.name}
            </span>
            <span>{formatCurrency(item.totalPrice)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-4 font-bold text-brand-gold">
          <span>Total</span>
          <span>{formatCurrency(order.totalAmount)}</span>
        </div>
        <p className="text-sm text-brand-gray mt-2">
          Payment: {order.payment?.method?.replace(/_/g, ' ')} · {order.payment?.status}
        </p>
      </div>

      {order.review && (
        <div className="glass-card p-6 border border-brand-gold/30">
          <h3 className="font-semibold mb-2">Customer rating</h3>
          <p className="text-brand-gold text-lg">{order.review.rating}★</p>
          {order.review.comment && <p className="text-brand-gray mt-2">{order.review.comment}</p>}
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Communications & timeline</h3>
        <p className="text-brand-gray text-sm mb-4">
          All status updates between customer and restaurant for this order
        </p>
        <div className="space-y-4">
          {communications.map(
            (c: { id: string; type: string; message: string; createdAt: string; actor: string; status: string }) => (
              <div key={c.id} className="flex gap-4 border-l-2 border-brand-gold/40 pl-4">
                <div className="flex-1">
                  <p className="text-xs text-brand-gold uppercase">{c.actor} · {c.type.replace(/_/g, ' ')}</p>
                  <p className="mt-1">{c.message}</p>
                  <p className="text-xs text-brand-gray mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
