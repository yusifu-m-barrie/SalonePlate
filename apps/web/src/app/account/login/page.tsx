import { Suspense } from 'react';
import { CustomerShell } from '@/components/shop/CustomerShell';
import { CustomerLoginClient } from './CustomerLoginClient';

export default function CustomerLoginPage() {
  return (
    <CustomerShell>
      <Suspense
        fallback={<div className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">Loading…</div>}
      >
        <CustomerLoginClient />
      </Suspense>
    </CustomerShell>
  );
}

