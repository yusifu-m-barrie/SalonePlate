'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Banknote, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type RevenuePeriod = 'day' | 'month' | 'year';

type RevenueRow = {
  key: string;
  label: string;
  orderCount: number;
  revenue: number;
};

type RevenueReport = {
  period: RevenuePeriod;
  year: number | null;
  month: number | null;
  rangeStart: string;
  rangeEnd: string;
  totalRevenue: number;
  totalOrders: number;
  rows: RevenueRow[];
};

const PERIOD_OPTIONS: { id: RevenuePeriod; label: string; hint: string }[] = [
  { id: 'day', label: 'Daily', hint: 'Last 30 days, or pick a month' },
  { id: 'month', label: 'Monthly', hint: 'Last 12 months, or pick a year' },
  { id: 'year', label: 'Yearly', hint: 'All years with sales' },
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function RestaurantRevenuePage() {
  const { status } = useSession();
  const currentYear = new Date().getFullYear();
  const [period, setPeriod] = useState<RevenuePeriod>('day');
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { period };
    if (year) p.year = year;
    if (month && period === 'day') p.month = month;
    return p;
  }, [period, year, month]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['owner-revenue', queryParams],
    queryFn: async () => {
      const { data } = await api.get<RevenueReport>('/restaurant-owner/revenue', {
        params: queryParams,
      });
      return data;
    },
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);
    return years;
  }, [currentYear]);

  const rangeLabel = data
    ? `${new Date(data.rangeStart).toLocaleDateString()} – ${new Date(data.rangeEnd).toLocaleDateString()}`
    : '';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="w-7 h-7 text-brand-gold" />
            Revenue
          </h1>
          <p className="text-brand-gray text-sm mt-1">
            Cash from completed deliveries — grouped by day, month, or year.
          </p>
        </div>
        <Link
          href="/restaurant"
          className="text-sm text-brand-gold hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setPeriod(opt.id);
              if (opt.id !== 'day') setMonth('');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === opt.id
                ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                : 'border border-white/10 text-brand-gray hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-4 items-end">
        <label className="block text-sm">
          <span className="text-brand-gray">Year</span>
          <select
            className="input-field mt-1 min-w-[120px]"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">
              {period === 'day' ? 'Last 30 days' : period === 'month' ? 'Last 12 months' : 'All years'}
            </option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {period === 'day' && (
          <label className="block text-sm">
            <span className="text-brand-gray">Month (optional)</span>
            <select
              className="input-field mt-1 min-w-[160px]"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={!year}
            >
              <option value="">All months in year</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}

        <p className="text-xs text-brand-gray pb-2">
          {PERIOD_OPTIONS.find((o) => o.id === period)?.hint}
        </p>
      </div>

      {error && (
        <div className="text-red-400 text-sm">
          <p>Could not load revenue.</p>
          <button type="button" onClick={() => refetch()} className="text-brand-gold underline mt-1">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5 border border-brand-gold/20">
          <div className="flex items-center gap-2 text-brand-gray text-sm mb-1">
            <TrendingUp className="w-4 h-4 text-brand-gold" />
            Total in range
          </div>
          <p className="text-3xl font-bold text-brand-gold">
            {isLoading ? '…' : formatCurrency(data?.totalRevenue ?? 0)}
          </p>
          {rangeLabel && <p className="text-xs text-brand-gray mt-2">{rangeLabel}</p>}
        </div>
        <div className="glass-card p-5">
          <p className="text-brand-gray text-sm mb-1">Delivered orders in range</p>
          <p className="text-3xl font-bold">{isLoading ? '…' : (data?.totalOrders ?? 0)}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-semibold">Breakdown</h2>
          {isFetching && !isLoading && (
            <span className="text-xs text-brand-gray">Updating…</span>
          )}
        </div>

        {isLoading ? (
          <p className="p-6 text-brand-gray text-sm">Loading revenue…</p>
        ) : !data?.rows.length ? (
          <p className="p-6 text-brand-gray text-sm">
            No delivered orders in this period yet. Revenue appears when orders are marked delivered.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-gray border-b border-white/10">
                  <th className="px-4 py-3 font-medium">
                    {period === 'day' ? 'Day' : period === 'month' ? 'Month' : 'Year'}
                  </th>
                  <th className="px-4 py-3 font-medium text-right">Orders</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.key} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-right text-brand-gray">{row.orderCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-brand-gold">
                      {formatCurrency(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.03] font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{data.totalOrders}</td>
                  <td className="px-4 py-3 text-right text-brand-gold">
                    {formatCurrency(data.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
