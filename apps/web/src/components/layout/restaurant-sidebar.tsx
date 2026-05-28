'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Store, UtensilsCrossed, ShoppingBag, Settings, LogOut, Tag, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalonePlateLogo } from '@/components/brand/SalonePlateLogo';

const ownerNav = [
  { href: '/restaurant', label: 'My Restaurant', icon: Store },
  { href: '/restaurant/menu', label: 'Menu & Food', icon: UtensilsCrossed },
  { href: '/restaurant/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/restaurant/promotions', label: 'Coupons', icon: Tag },
  { href: '/restaurant/revenue', label: 'Revenue', icon: Banknote },
  { href: '/restaurant/settings', label: 'Settings', icon: Settings },
];

export function RestaurantSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen border-r border-white/10 bg-brand-dark/80 backdrop-blur-xl p-4 flex flex-col">
      <div className="mb-8 px-2 flex flex-col items-center gap-2">
        <SalonePlateLogo width={120} height={126} />
        <p className="text-xs text-brand-gold">Restaurant Owner</p>
        <p className="text-[10px] text-brand-gray text-center">Manage your menu & orders</p>
      </div>

      <nav className="flex-1 space-y-1">
        {ownerNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/restaurant' && pathname.startsWith(item.href));
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
          {session?.user?.name || session?.user?.email || 'Owner'}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all mt-3"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
