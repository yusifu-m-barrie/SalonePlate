'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { BrandLoader } from '@/components/brand/BrandLoader';

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.accessToken) {
      localStorage.setItem('accessToken', session.accessToken);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'RESTAURANT_OWNER') {
      router.replace('/restaurant');
    }
  }, [status, session?.user?.role, router]);

  if (status === 'loading') {
    return <BrandLoader message="Loading dashboard…" />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const role = session?.user?.role;
  const allowed = role === 'SUPER_ADMIN' || role === 'CITY_MANAGER';

  if (role === 'RESTAURANT_OWNER') {
    return null;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-8">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-lg font-semibold">Dashboard access denied</p>
          <p className="text-brand-gray mt-2 text-sm">
            Admins and city managers use this dashboard. Restaurant owners are redirected to the restaurant
            dashboard. Customers and riders should use the mobile app.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-6 px-6 py-2 rounded-xl gold-gradient text-brand-dark font-semibold"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
