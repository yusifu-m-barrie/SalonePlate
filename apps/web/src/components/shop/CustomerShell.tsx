'use client';

import Link from 'next/link';
import { useCartStore } from '@/stores/cartStore';

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            SalonePlate
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link className="text-muted-foreground hover:text-foreground" href="/cart">
              Cart{itemCount ? ` (${itemCount})` : ''}
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/account/login">
              Login
            </Link>
            <Link className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90" href="/account/register">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} SalonePlate</div>
            <Link className="hover:text-foreground" href="/dashboard">
              Restaurant/Admin Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

