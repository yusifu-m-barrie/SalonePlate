'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Bike,
  Users,
  Tag,
  Image,
  CreditCard,
  Settings,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonePlateLogo } from '@/components/brand/SalonePlateLogo';

const adminNav = [
  { href: '/dashboard', label: 'Analytics', icon: LayoutDashboard },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/dashboard/communications', label: 'Activity', icon: MessageSquare },
  { href: '/dashboard/restaurants', label: 'Restaurants', icon: Store },
  { href: '/dashboard/riders', label: 'Couriers', icon: Bike },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/promotions', label: 'Promotions', icon: Tag },
  { href: '/dashboard/cms', label: 'CMS', icon: Image },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const navItems = adminNav;

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen border-r border-white/10 bg-brand-dark/80 backdrop-blur-xl p-4 flex flex-col">
      <div className="mb-6 px-2">
        <SalonePlateLogo variant="sidebar" onDark showWordmark />
        <p className="text-[10px] text-brand-gray text-center mt-2">Makeni Admin</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                active
                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                  : 'text-brand-gray hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-white/10">
        <p className="px-2 text-xs text-brand-gray truncate" title={session?.user?.email || ''}>
          {session?.user?.name || session?.user?.email || 'User'}
        </p>
        <p className="px-2 text-[10px] text-brand-gray/80 mb-3">{session?.user?.role}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
