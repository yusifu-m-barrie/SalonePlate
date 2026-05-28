'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';

export function CustomerLoginClient() {
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(`/auth/login`, {
        email,
        password,
      });
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = next;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-6">
        <h1 className="text-xl font-semibold">Customer login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to place orders and track deliveries.</p>

        {error ? <div className="mt-4 rounded-md border bg-background p-3 text-sm">{error}</div> : null}

        <form className="mt-6 flex flex-col gap-3" onSubmit={onSubmit}>
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          <button
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-sm text-muted-foreground">
          Don’t have an account?{' '}
          <Link className="text-foreground underline" href={`/account/register?next=${encodeURIComponent(next)}`}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

