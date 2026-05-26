'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { UtensilsCrossed, ShoppingBag, Star, Receipt, Banknote, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useOwnerRealtime } from '@/hooks/useOwnerRealtime';

type DashboardData = {
  restaurant: {
    id: string;
    name: string;
    status: string;
    isOpen: boolean;
    isBusy: boolean;
    rating: number;
    reviewCount: number;
    address: string;
    phone?: string | null;
    itemCount: number;
    city?: { name: string };
  };
  stats: {
    activeOrders: number;
    pendingOrders: number;
    completedToday: number;
    revenueToday: number;
    totalRevenue: number;
    totalDeliveredOrders: number;
  };
  notifications: {
    id: string;
    type: string;
    orderId: string;
    orderNumber: string;
    message: string;
    createdAt: string;
  }[];
};

export default function RestaurantHomePage() {
  const { data: session, status } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>('/restaurant-owner/dashboard');
      return data;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  useOwnerRealtime(data?.restaurant?.id, status === 'authenticated');

  const restaurant = data?.restaurant;
  const stats = data?.stats;
  const notifications = data?.notifications ?? [];

  if (isLoading) {
    return <p className="text-brand-gray">Loading your restaurant…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{restaurant?.name || 'My Restaurant'}</h1>
        <p className="text-brand-gray">
          {restaurant?.city?.name || 'Makeni'} · Status:{' '}
          <span className={restaurant?.status === 'APPROVED' ? 'text-green-400' : 'text-yellow-400'}>
            {restaurant?.status}
          </span>
          {' · '}
          <span className={restaurant?.isOpen ? 'text-green-400' : 'text-red-400'}>
            {restaurant?.isOpen ? 'Open for orders' : 'Closed'}
          </span>
          {restaurant?.isBusy && <span className="text-yellow-400"> · Busy</span>}
        </p>
        <p className="text-sm text-brand-gray mt-1">
          Desktop & mobile use the same dashboard — customers and admin see updates in real time.
        </p>
      </div>

      {restaurant?.status === 'PENDING' && (
        <div className="glass-card p-4 border border-yellow-500/40">
          <p className="text-yellow-400 text-sm">
            Waiting for admin approval. Add menu items now; they go live once approved.
          </p>
        </div>
      )}

      {restaurant?.status === 'APPROVED' && (
        <div className="glass-card p-4 border border-green-500/30">
          <p className="text-green-400 text-sm">
            Your restaurant is live. Keep dishes available and respond to new orders promptly.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <Receipt className="w-6 h-6 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-bold">{stats?.activeOrders ?? 0}</p>
          <p className="text-xs text-brand-gray">Active orders</p>
        </div>
        <div className="glass-card p-4 text-center">
          <ShoppingBag className="w-6 h-6 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-bold">{stats?.pendingOrders ?? 0}</p>
          <p className="text-xs text-brand-gray">Awaiting accept</p>
        </div>
        <Link
          href="/restaurant/revenue"
          className="glass-card p-4 border border-brand-gold/20 hover:border-brand-gold/50 transition-all col-span-2 md:col-span-1"
        >
          <Banknote className="w-6 h-6 text-brand-gold mx-auto mb-2" />
          <p className="text-base font-bold text-brand-gold">{formatCurrency(stats?.revenueToday ?? 0)}</p>
          <p className="text-[10px] text-brand-gray">Revenue today</p>
          <p className="text-base font-bold text-white mt-2">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
          <p className="text-[10px] text-brand-gray">Total revenue</p>
          <p className="text-[10px] text-brand-gold mt-2 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Report →
          </p>
        </Link>
        <div className="glass-card p-4 text-center col-span-2 md:col-span-1">
          <Star className="w-6 h-6 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-bold">{(restaurant?.rating ?? 0).toFixed(1)}</p>
          <p className="text-xs text-brand-gray">{restaurant?.reviewCount ?? 0} reviews</p>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Recent activity</h3>
          <div className="space-y-3">
            {notifications.slice(0, 6).map((n) => (
              <Link
                key={n.id}
                href={`/restaurant/orders/${n.orderId}`}
                className="block py-2 border-b border-white/5 hover:text-brand-gold"
              >
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-brand-gray">{new Date(n.createdAt).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6 space-y-2">
        <h3 className="font-semibold">Restaurant info</h3>
        <p className="text-sm text-brand-gray">{restaurant?.address}</p>
        {restaurant?.phone && <p className="text-sm">Phone: {restaurant.phone}</p>}
        <p className="text-sm text-brand-gold">{restaurant?.itemCount ?? 0} menu items</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/restaurant/menu"
          className="glass-card p-6 hover:border-brand-gold/40 border border-transparent transition-all block"
        >
          <UtensilsCrossed className="w-8 h-8 text-brand-gold mb-3" />
          <h2 className="text-lg font-semibold">Menu &amp; Food</h2>
          <p className="text-brand-gray text-sm mt-1">Add dishes, prices, photos, and categories.</p>
          <p className="text-brand-gold mt-3 text-sm font-medium">{restaurant?.itemCount ?? 0} items</p>
        </Link>

        <Link
          href="/restaurant/orders"
          className="glass-card p-6 hover:border-brand-gold/40 border border-transparent transition-all block"
        >
          <ShoppingBag className="w-8 h-8 text-brand-gold mb-3" />
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-brand-gray text-sm mt-1">Accept, prepare, deliver, and view ratings.</p>
          {(stats?.pendingOrders ?? 0) > 0 && (
            <p className="text-red-400 mt-3 text-sm font-medium">{stats!.pendingOrders} new order(s)</p>
          )}
        </Link>

        <Link
          href="/restaurant/revenue"
          className="glass-card p-6 hover:border-brand-gold/40 border border-transparent transition-all block md:col-span-2"
        >
          <Banknote className="w-8 h-8 text-brand-gold mb-3" />
          <h2 className="text-lg font-semibold">Revenue</h2>
          <p className="text-brand-gray text-sm mt-1">
            Daily, monthly, and yearly cash from delivered orders.
          </p>
          <p className="text-brand-gold mt-3 text-sm font-medium">
            {formatCurrency(stats?.totalRevenue ?? 0)} all-time · {stats?.totalDeliveredOrders ?? 0} deliveries
          </p>
        </Link>
      </div>
    </div>
  );
}
