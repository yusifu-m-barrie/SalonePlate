'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { BrandLoader } from '@/components/brand/BrandLoader';

export function RestaurantAuthGuard({ children }: { children: React.ReactNode }) {
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
    if (status !== 'authenticated') return;
    const role = session?.user?.role;
    if (role === 'SUPER_ADMIN' || role === 'CITY_MANAGER') {
      router.replace('/dashboard');
    }
  }, [status, session?.user?.role, router]);

  if (status === 'loading') {
    return <BrandLoader message="Loading restaurant dashboard…" />;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (session?.user?.role !== 'RESTAURANT_OWNER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-8">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-lg font-semibold">Restaurant account required</p>
          <p className="text-brand-gray mt-2 text-sm">
            Sign in with the email you used when registering your restaurant on the mobile app.
            Admin accounts use the admin dashboard instead.
          </p>
          <button
            type="button"
            onClick={async () => {
              localStorage.removeItem('accessToken');
              await signOut({ redirect: false });
              router.push('/login');
            }}
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
