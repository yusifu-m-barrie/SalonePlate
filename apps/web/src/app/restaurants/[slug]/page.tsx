'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { CustomerShell } from '@/components/shop/CustomerShell';
import { MediaImage } from '@/components/ui/MediaImage';
import { useCartStore } from '@/stores/cartStore';

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
};

type RestaurantResponse = {
  id: string;
  name: string;
  slug: string;
  coverImage?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  deliveryFee?: number | null;
  deliveryTimeMin?: number | null;
  deliveryTimeMax?: number | null;
  menuCategories: Array<{
    id: string;
    name: string;
    items: MenuItem[];
  }>;
  menuItems: MenuItem[];
};

export default function CustomerRestaurantPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const add = useCartStore((s) => s.add);

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async () => {
      const res = await api.get<RestaurantResponse>(`/restaurants/${slug}`);
      return res.data;
    },
  });

  return (
    <CustomerShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error || !data ? (
          <div className="rounded-md border bg-card p-4 text-sm">
            <div className="font-medium">Restaurant not found</div>
            <div className="mt-1 text-muted-foreground">Try going back and selecting another restaurant.</div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="relative h-44 w-full bg-muted">
                <MediaImage
                  src={data.coverImage || data.logoUrl}
                  alt={data.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold">{data.name}</h1>
                  <div className="text-sm text-muted-foreground">
                    {data.deliveryTimeMin ?? '-'}–{data.deliveryTimeMax ?? '-'} min · Delivery fee{' '}
                    {data.deliveryFee ?? 0}
                  </div>
                  {data.description ? (
                    <div className="mt-2 text-sm text-muted-foreground">{data.description}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-8">
              {data.menuCategories.map((cat) => (
                <section key={cat.id}>
                  <h2 className="text-lg font-semibold">{cat.name}</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {cat.items.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-xl border bg-card p-4">
                        <MediaImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description ? (
                                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.description}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-sm font-medium">{item.price}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              add(
                                {
                                  id: item.id,
                                  name: item.name,
                                  imageUrl: item.imageUrl,
                                  price: item.price,
                                  restaurantId: data.id,
                                  restaurantName: data.name,
                                },
                                1,
                              )
                            }
                            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                          >
                            Add to cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {data.menuItems?.length ? (
                <section>
                  <h2 className="text-lg font-semibold">More</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {data.menuItems.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-xl border bg-card p-4">
                        <MediaImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-16 w-16 rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description ? (
                                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.description}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-sm font-medium">{item.price}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              add(
                                {
                                  id: item.id,
                                  name: item.name,
                                  imageUrl: item.imageUrl,
                                  price: item.price,
                                  restaurantId: data.id,
                                  restaurantName: data.name,
                                },
                                1,
                              )
                            }
                            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                          >
                            Add to cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        )}
      </div>
    </CustomerShell>
  );
}

