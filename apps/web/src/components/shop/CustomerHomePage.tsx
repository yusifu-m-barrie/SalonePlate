'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MediaImage } from '@/components/ui/MediaImage';
import { CustomerShell } from './CustomerShell';

type DiscoverRestaurant = {
  id: string;
  name: string;
  slug: string;
  coverImage?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  deliveryTimeMin?: number | null;
  deliveryTimeMax?: number | null;
  deliveryFee?: number | null;
  isOpen?: boolean;
  description?: string | null;
  displayCategories?: string[];
};

type DiscoverResponse = {
  restaurants: DiscoverRestaurant[];
  featuredRestaurants?: DiscoverRestaurant[];
  meta?: { city?: { slug: string } };
};

const DEFAULT_CITY = 'makeni';

export function CustomerHomePage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discover', DEFAULT_CITY],
    queryFn: async () => {
      const res = await api.get<DiscoverResponse>(`/restaurants/discover/${DEFAULT_CITY}`);
      return res.data;
    },
  });

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = data?.restaurants ?? [];
    if (!term) return items;
    return items.filter((r) => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(term));
  }, [data, search]);

  return (
    <CustomerShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            Browse restaurants and add items to your cart. You’ll be asked to login at checkout.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring sm:max-w-md"
          />
          <button
            onClick={() => refetch()}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            type="button"
          >
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="mt-10 text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="mt-10 rounded-md border bg-card p-4 text-sm">
            <div className="font-medium">Could not load restaurants</div>
            <div className="mt-1 text-muted-foreground">Check your API URL and try again.</div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {list.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.slug}`}
                className="overflow-hidden rounded-xl border bg-card transition hover:bg-accent"
              >
                <div className="relative h-36 w-full bg-muted">
                  <MediaImage
                    src={r.coverImage || r.logoUrl}
                    alt={r.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.isOpen ? 'Open now' : 'Closed'} · {r.deliveryTimeMin ?? '-'}–{r.deliveryTimeMax ?? '-'} min
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{r.rating ? r.rating.toFixed(1) : '—'} ★</div>
                      <div>{r.reviewCount ?? 0} reviews</div>
                    </div>
                  </div>
                  {r.description ? (
                    <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

