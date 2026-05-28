'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import api from '@/lib/api';

type Step = 'send' | 'verify' | 'create';

export function CustomerRegisterClient() {
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [step, setStep] = useState<Step>('send');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/auth/register/send-code`, { email });
      setStep('verify');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/auth/register/verify-code`, { email, code });
      setStep('create');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ accessToken: string; refreshToken?: string }>(`/auth/register`, {
        email,
        password,
        name,
        code,
        role: 'CUSTOMER',
      });
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      window.location.href = next;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-6">
        <h1 className="text-xl font-semibold">Create customer account</h1>
        <p className="mt-1 text-sm text-muted-foreground">We’ll email a code to verify your address.</p>

        {error ? <div className="mt-4 rounded-md border bg-background p-3 text-sm">{error}</div> : null}

        {step === 'send' ? (
          <form className="mt-6 flex flex-col gap-3" onSubmit={sendCode}>
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <button
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Sending…' : 'Send verification code'}
            </button>
          </form>
        ) : null}

        {step === 'verify' ? (
          <form className="mt-6 flex flex-col gap-3" onSubmit={verifyCode}>
            <div className="text-sm text-muted-foreground">
              Code sent to <span className="text-foreground">{email}</span>
            </div>
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
                type="button"
                onClick={() => setStep('send')}
                disabled={loading}
              >
                Change email
              </button>
              <button
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Checking…' : 'Verify code'}
              </button>
            </div>
          </form>
        ) : null}

        {step === 'create' ? (
          <form className="mt-6 flex flex-col gap-3" onSubmit={createAccount}>
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </form>
        ) : null}

        <div className="mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link className="text-foreground underline" href={`/account/login?next=${encodeURIComponent(next)}`}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

