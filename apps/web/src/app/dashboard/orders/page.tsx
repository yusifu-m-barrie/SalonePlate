'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { formatDateTime, getApiErrorMessage, isValidDateInput } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [food, setFood] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateError, setDateError] = useState('');

  useAdminRealtime(status === 'authenticated');

  const { data, isLoading, refetch, isFetching, error, isError } = useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/orders', { params: filters });
      return data as {
        orders: Array<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          createdAt: string;
          deliveryAddress?: { street?: string; city?: string };
          items: { name: string; quantity: number }[];
          restaurant?: { name: string };
          customer?: { firstName?: string; lastName?: string; phone?: string };
        }>;
        meta: { total: number; page: number; totalPages: number };
      };
    },
    enabled: status === 'authenticated',
  });

  const runSearch = () => {
    setDateError('');
    if (from && !isValidDateInput(from)) {
      setDateError('Start date must be YYYY-MM-DD (use the date picker).');
      return;
    }
    if (to && !isValidDateInput(to)) {
      setDateError('End date must be YYYY-MM-DD (use the date picker).');
      return;
    }
    if (from && to && from > to) {
      setDateError('Start date cannot be after end date.');
      return;
    }

    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    if (location.trim()) params.location = location.trim();
    if (food.trim()) params.food = food.trim();
    if (minAmount.trim()) params.minAmount = minAmount.trim();
    if (maxAmount.trim()) params.maxAmount = maxAmount.trim();
    if (from) params.from = from;
    if (to) params.to = to;
    if (orderStatus) params.status = orderStatus;
    setFilters(params);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-brand-gray text-sm">
          Search by order ID, customer, location, food item, amount (NLE), or date
        </p>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            className="input-field"
            placeholder="Order ID / number / customer phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Delivery location (street, city)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Food / dish name"
            value={food}
            onChange={(e) => setFood(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Min amount (NLE)"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Max amount (NLE)"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
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
        <div className="flex gap-3">
          <button
            type="button"
            onClick={runSearch}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-brand-dark font-semibold text-sm"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-5 py-2.5 rounded-xl border border-white/20 text-sm text-brand-gray hover:text-white"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {(dateError || isError) && (
        <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm">
          {dateError ||
            getApiErrorMessage(error, 'Could not search orders. Check your filters and try again.')}
        </div>
      )}

      {isLoading && <p className="text-brand-gray">Loading orders…</p>}

      {data && (
        <p className="text-brand-gray text-sm">
          {data.meta.total} order(s) found
          {Object.keys(filters).length === 0 && ' — showing latest'}
        </p>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-brand-gray border-b border-white/10">
              <th className="text-left p-4">Order</th>
              <th className="text-left p-4">Restaurant</th>
              <th className="text-left p-4">Customer</th>
              <th className="text-left p-4">Items</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {(data?.orders || []).map((o) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4">
                  <Link href={`/dashboard/orders/${o.id}`} className="text-brand-gold font-medium hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="p-4">{o.restaurant?.name}</td>
                <td className="p-4">
                  {[o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(' ') || '—'}
                  {o.customer?.phone && <p className="text-xs text-brand-gray">{o.customer.phone}</p>}
                </td>
                <td className="p-4 text-brand-gray max-w-[200px] truncate">
                  {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </td>
                <td className="p-4 text-brand-gray whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-full text-xs bg-brand-gold/20 text-brand-gold">
                    {ORDER_STATUS_LABEL[o.status] || o.status}
                  </span>
                </td>
                <td className="p-4 text-right font-semibold">{formatCurrency(o.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.orders.length === 0 && (
          <p className="p-8 text-center text-brand-gray">No orders match your search.</p>
        )}
      </div>
    </div>
  );
}
