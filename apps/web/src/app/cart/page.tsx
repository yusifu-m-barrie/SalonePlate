'use client';

import Link from 'next/link';
import { CustomerShell } from '@/components/shop/CustomerShell';
import { MediaImage } from '@/components/ui/MediaImage';
import { useCartStore } from '@/stores/cartStore';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CustomerShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
          {items.length ? (
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={clear} type="button">
              Clear
            </button>
          ) : null}
        </div>

        {!items.length ? (
          <div className="mt-8 rounded-xl border bg-card p-6 text-sm">
            <div className="font-medium">Your cart is empty</div>
            <div className="mt-1 text-muted-foreground">Browse restaurants and add items.</div>
            <Link className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/">
              Browse restaurants
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-3">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                  <MediaImage src={i.imageUrl} alt={i.name} className="h-14 w-14 rounded-md object-cover" />
                  <div className="flex-1">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.restaurantName}</div>
                    <div className="mt-1 text-sm">{i.price}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-md border hover:bg-accent"
                      onClick={() => setQty(i.id, i.qty - 1)}
                    >
                      -
                    </button>
                    <div className="w-8 text-center text-sm">{i.qty}</div>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-md border hover:bg-accent"
                      onClick={() => setQty(i.id, i.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => remove(i.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-xl border bg-card p-5">
              <div className="text-sm text-muted-foreground">Subtotal</div>
              <div className="mt-1 text-2xl font-semibold">{subtotal}</div>
              <div className="mt-4 text-xs text-muted-foreground">
                Checkout will require login and delivery address. (We’ll wire full checkout next.)
              </div>
              <Link
                className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                href="/account/login?next=/checkout"
              >
                Continue to checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

