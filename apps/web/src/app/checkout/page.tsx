'use client';

import Link from 'next/link';
import { CustomerShell } from '@/components/shop/CustomerShell';
import { useCartStore } from '@/stores/cartStore';

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);

  return (
    <CustomerShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the customer web checkout placeholder. Next we can wire delivery address + payment + order creation.
        </p>

        <div className="mt-6 rounded-xl border bg-card p-6 text-sm">
          <div className="font-medium">Items</div>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {i.qty}× {i.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{i.restaurantName}</div>
                </div>
                <div>{i.price * i.qty}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <Link className="rounded-md border px-4 py-2 hover:bg-accent" href="/cart">
              Back to cart
            </Link>
            <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90" href="/">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}

