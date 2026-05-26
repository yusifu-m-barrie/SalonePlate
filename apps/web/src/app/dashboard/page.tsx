'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { DollarSign, ShoppingBag, Users, Store, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus';
import { formatDateTime } from '@/lib/formatDate';
import { useAdminRealtime } from '@/hooks/useAdminRealtime';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useAdminRealtime(status === 'authenticated' && session?.user?.role !== 'RESTAURANT_OWNER');

  useEffect(() => {
    if (session?.user?.role === 'RESTAURANT_OWNER') {
      router.replace('/restaurant');
    }
  }, [session?.user?.role, router]);

  if (session?.user?.role === 'RESTAURANT_OWNER') {
    return null;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard');
      return data;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
    refetchInterval: 20000,
  });

  const stats = data || {
    totalRevenue: 0,
    ordersToday: 0,
    activeUsers: 0,
    totalRestaurants: 0,
    revenueChart: [],
    liveOrders: [],
    topRestaurants: [],
    notifications: [],
    restaurantActivity: [],
    stats: { pendingRestaurantAlerts: 0 },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 glass-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const alerts = (stats.restaurantActivity || []).filter(
    (r: { needsAttention: boolean }) => r.needsAttention,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-brand-gray">Track orders, restaurants, and customer communications</p>
      </div>

      {alerts.length > 0 && (
        <div className="glass-card p-4 border border-yellow-500/40 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">
              {alerts.length} restaurant(s) have unaccepted orders
            </p>
            <p className="text-sm text-brand-gray mt-1">
              The owner may be busy — call or message them to check their dashboard (app or web).
            </p>
            <ul className="mt-2 text-sm space-y-1">
              {alerts.slice(0, 5).map((r: { id: string; name: string; phone?: string; pendingOrders: number }) => (
                <li key={r.id}>
                  <Link href="/dashboard/restaurants" className="text-brand-gold hover:underline">
                    {r.name}
                  </Link>
                  {' — '}
                  {r.pendingOrders} pending · {r.phone || 'no phone'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} delay={0} />
        <StatCard title="Orders Today" value={String(stats.ordersToday)} icon={ShoppingBag} delay={0.1} />
        <StatCard title="Active Users" value={String(stats.activeUsers)} icon={Users} delay={0.2} />
        <StatCard title="Restaurants" value={String(stats.totalRestaurants)} icon={Store} delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={stats.revenueChart || []} />
        </div>
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Top Restaurants</h3>
          <div className="space-y-3">
            {(stats.topRestaurants || []).map(
              (r: { id: string; name: string; rating: number; isOpen?: boolean }) => (
                <div key={r.id} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span>
                    {r.name}
                    <span className={`ml-2 text-xs ${r.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                      {r.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </span>
                  <span className="text-brand-gold">★ {r.rating?.toFixed(1)}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Recent platform activity</h3>
          <Link href="/dashboard/communications" className="text-sm text-brand-gold hover:underline">
            View all activity
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {(stats.notifications || []).slice(0, 15).map(
            (n: {
              id: string;
              orderId: string;
              message: string;
              restaurantName: string;
              type?: string;
              createdAt: string;
            }) => (
              <Link
                key={n.id}
                href={`/dashboard/orders/${n.orderId}`}
                className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-gold/40 transition-colors min-h-[120px] flex flex-col"
              >
                {n.type && (
                  <span className="text-[10px] uppercase text-brand-gold font-semibold">
                    {n.type.replace(/_/g, ' ')}
                  </span>
                )}
                <p className="text-sm font-medium mt-1 line-clamp-3 flex-1">{n.message}</p>
                <p className="text-xs text-brand-gray mt-2 truncate">{n.restaurantName}</p>
                <p className="text-[10px] text-brand-gray mt-1">{formatDateTime(n.createdAt)}</p>
              </Link>
            ),
          )}
        </div>
        {(stats.notifications || []).length === 0 && (
          <p className="text-brand-gray text-sm text-center py-6">No recent activity.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Restaurant status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {(stats.restaurantActivity || []).slice(0, 15).map(
              (r: {
                id: string;
                name: string;
                isOpen: boolean;
                pendingOrders: number;
                activeOrders: number;
                needsAttention: boolean;
              }) => (
                <div
                  key={r.id}
                  className={`p-3 rounded-xl bg-white/5 border ${
                    r.needsAttention ? 'border-yellow-500/40 text-yellow-400' : 'border-white/5'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{r.name}</p>
                  <p className="text-xs mt-2 text-brand-gray">
                    {r.isOpen ? 'Open' : 'Closed'}
                  </p>
                  <p className="text-xs mt-1">
                    {r.activeOrders} active
                    {r.pendingOrders > 0 && ` · ${r.pendingOrders} awaiting`}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Live Orders</h3>
          <Link href="/dashboard/orders" className="text-sm text-brand-gold hover:underline">
            Search all orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-brand-gray border-b border-white/10">
                <th className="text-left py-2">Order</th>
                <th className="text-left py-2">Restaurant</th>
                <th className="text-left py-2">Customer</th>
                <th className="text-left py-2">Status</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(stats.liveOrders || []).slice(0, 10).map(
                (o: {
                  id: string;
                  orderNumber: string;
                  status: string;
                  totalAmount: number;
                  restaurant?: { name: string; isOpen?: boolean };
                  customer?: { firstName?: string; lastName?: string };
                }) => (
                  <tr key={o.id} className="border-b border-white/5">
                    <td className="py-3">
                      <Link href={`/dashboard/orders/${o.id}`} className="text-brand-gold hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {o.restaurant?.name}
                      <span className={`ml-1 text-xs ${o.restaurant?.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                        {o.restaurant?.isOpen ? '●' : '○'}
                      </span>
                    </td>
                    <td>
                      {[o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td>
                      <span className="px-2 py-1 rounded-full text-xs bg-brand-gold/20 text-brand-gold">
                        {ORDER_STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="text-right">{formatCurrency(o.totalAmount)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
