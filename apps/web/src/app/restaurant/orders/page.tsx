'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { formatDateTime, isValidDateInput } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus';
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

function orderMatchesFilters(order: OrderRow, filters: OwnerOrderFilters): boolean {
  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const addr = [order.deliveryAddress?.street, order.deliveryAddress?.city]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const itemsText = order.items.map((i) => i.name).join(' ').toLowerCase();

  if (filters.q) {
    const q = filters.q.toLowerCase();
    const hay = `${order.orderNumber} ${customerName} ${order.customer?.phone || ''} ${addr} ${itemsText}`;
    if (!hay.includes(q)) return false;
  }
  if (filters.customer && !customerName.includes(filters.customer.toLowerCase())) return false;
  if (filters.location && !addr.includes(filters.location.toLowerCase())) return false;
  if (filters.food && !itemsText.includes(filters.food.toLowerCase())) return false;
  if (filters.status && order.status !== filters.status) return false;

  if (filters.from || filters.to) {
    const placed = new Date(order.createdAt);
    if (Number.isNaN(placed.getTime())) return false;
    if (filters.from) {
      const from = new Date(`${filters.from}T00:00:00`);
      if (placed < from) return false;
    }
    if (filters.to) {
      const to = new Date(`${filters.to}T23:59:59.999`);
      if (placed > to) return false;
    }
  }

  return true;
}

type OwnerOrderFilters = {
  q?: string;
  customer?: string;
  location?: string;
  food?: string;
  status?: string;
  from?: string;
  to?: string;
};

export default function RestaurantOrdersPage() {
  const { data: session, status } = useSession();
  const [q, setQ] = useState('');
  const [customer, setCustomer] = useState('');
  const [location, setLocation] = useState('');
  const [food, setFood] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [filters, setFilters] = useState<OwnerOrderFilters>({});
  const [dateError, setDateError] = useState('');

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

  const runSearch = () => {
    setDateError('');
    if (from && !isValidDateInput(from)) {
      setDateError('Start date must be YYYY-MM-DD.');
      return;
    }
    if (to && !isValidDateInput(to)) {
      setDateError('End date must be YYYY-MM-DD.');
      return;
    }
    if (from && to && from > to) {
      setDateError('Start date cannot be after end date.');
      return;
    }

    const next: OwnerOrderFilters = {};
    if (q.trim()) next.q = q.trim();
    if (customer.trim()) next.customer = customer.trim();
    if (location.trim()) next.location = location.trim();
    if (food.trim()) next.food = food.trim();
    if (from) next.from = from;
    if (to) next.to = to;
    if (orderStatus) next.status = orderStatus;
    setFilters(next);
  };

  const filtered = useMemo(() => {
    if (Object.keys(filters).length === 0) return orders;
    return orders.filter((o) => orderMatchesFilters(o, filters));
  }, [orders, filters]);

  const active = filtered.filter((o) => ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-brand-gray text-sm">
            Filter by date, customer, address, items, or status — tap an order for details
          </p>
        </div>
        <button type="button" onClick={() => refetch()} className="text-sm text-brand-gold underline">
          Refresh
        </button>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            className="input-field"
            placeholder="Order # / phone / quick search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Customer name"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Delivery address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Food / dish name"
            value={food}
            onChange={(e) => setFood(e.target.value)}
          />
          <select
            className="input-field"
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <label className="block text-sm text-brand-gray">
            From date
            <input
              type="date"
              className="input-field mt-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block text-sm text-brand-gray">
            To date
            <input
              type="date"
              className="input-field mt-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={runSearch}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
        >
          <Search className="w-4 h-4" />
          Apply filters
        </button>
      </div>

      {dateError && (
        <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm">{dateError}</div>
      )}

      {error && (
        <p className="text-red-400 text-sm">
          Could not load orders. Ensure API is running and you are signed in as restaurant owner.
        </p>
      )}

      {isLoading && <p className="text-brand-gray">Loading…</p>}

      {!isLoading && (
        <p className="text-brand-gray text-sm">
          {filtered.length} order(s)
          {Object.keys(filters).length > 0 ? ' matching filters' : ''}
        </p>
      )}

      {!isLoading && orders.length === 0 && (
        <p className="text-brand-gray text-sm">
          No orders yet. Customers will see your menu on the app after approval.
        </p>
      )}

      {!isLoading && orders.length > 0 && filtered.length === 0 && (
        <p className="text-brand-gray text-sm">No orders match your filters.</p>
      )}

      {active.length > 0 && (
        <p className="text-brand-gold text-sm font-medium">{active.length} active order(s)</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((order) => {
          const customerName =
            [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') ||
            'Customer';
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
                  {ORDER_STATUS_LABEL[order.status] || order.status}
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
                <p className="text-[10px] text-brand-gray mt-1">{formatDateTime(order.createdAt)}</p>
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
