import { Suspense } from 'react';
import { CustomerShell } from '@/components/shop/CustomerShell';
import { CustomerRegisterClient } from './CustomerRegisterClient';

export default function CustomerRegisterPage() {
  return (
    <CustomerShell>
      <Suspense
        fallback={<div className="mx-auto max-w-5xl px-6 py-10 text-sm text-muted-foreground">Loading…</div>}
      >
        <CustomerRegisterClient />
      </Suspense>
    </CustomerShell>
  );
}

