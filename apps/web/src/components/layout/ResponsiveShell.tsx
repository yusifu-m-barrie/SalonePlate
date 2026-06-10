'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SalonePlateLogo } from '@/components/brand/SalonePlateLogo';

type Props = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
};

export function ResponsiveShell({ sidebar, children, title }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // close drawer on navigation
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      {/* Desktop / tablet: fixed sidebar — stays in place while main content scrolls */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:block md:w-64">
        {sidebar}
      </div>

      <div className="flex min-h-screen flex-col md:ml-64">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-brand-dark/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SalonePlateLogo variant="mark" onDark width={28} height={28} className="shrink-0" />
            <span className="truncate text-sm font-semibold">{title || 'SalonePlate'}</span>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-[85vw] max-w-sm shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  );
}

