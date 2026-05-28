'use client';

import { signIn, getSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SalonePlateLogo } from '@/components/brand/SalonePlateLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@saloneplate.sl');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError('Invalid credentials');
      return;
    }
    const session = await getSession();
    if (session?.accessToken) {
      localStorage.setItem('accessToken', session.accessToken);
    }
    const role = session?.user?.role;
    const allowed =
      role === 'SUPER_ADMIN' ||
      role === 'CITY_MANAGER' ||
      role === 'RESTAURANT_OWNER';
    if (!allowed) {
      localStorage.removeItem('accessToken');
      await signOut({ redirect: false });
      setError('Use the mobile app for customer/rider accounts.');
      return;
    }
    if (role === 'RESTAURANT_OWNER') {
      router.push('/restaurant');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8"
      >
        <div className="flex flex-col items-center mb-8 gap-3">
          <SalonePlateLogo variant="sidebar" onDark showWordmark />
          <p className="text-brand-gray text-sm">Admin or restaurant owner sign-in</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-brand-gray">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-brand-gold outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-brand-gray">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-brand-gold outline-none"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl gold-gradient font-semibold text-brand-dark disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-brand-gray text-xs mt-6">
          Admin demo: admin@saloneplate.sl · Restaurant owners: use the email from mobile sign-up
        </p>
      </motion.div>
    </div>
  );
}
