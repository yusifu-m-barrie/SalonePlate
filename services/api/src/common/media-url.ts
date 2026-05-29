/** Base URL for uploaded assets (no trailing slash). */
export function getApiPublicBase(): string {
  return (
    process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
    `http://localhost:${process.env.PORT || 4000}`
  );
}

/** Rewrite upload URLs so phones, web, and admin all load images from the current API host. */
export function resolveMediaUrl(url: string | null | undefined): string | null | undefined {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return url;

  const base = getApiPublicBase();

  if (trimmed.startsWith('/uploads/')) {
    return `${base}${trimmed}`;
  }

  const uploadsPath = trimmed.match(/\/uploads\/[^\s?#]+/);
  if (uploadsPath) {
    return `${base}${uploadsPath[0]}`;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return `${base}${u.pathname}${u.search}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

const URL_LIKE_KEYS =
  /^(imageUrl|coverImage|logoUrl|avatarUrl|galleryUrls|photos|thumbnailUrl)$/i;

/** Deep-rewrite image fields in any API JSON payload. */
export function rewriteMediaInJson<T>(data: T): T {
  if (data == null) return data;
  if (data instanceof Date) {
    return data.toISOString() as T;
  }
  if (typeof data === 'string') {
    if (data.startsWith('/uploads/') || /\/uploads\//.test(data) || /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(data)) {
      return (resolveMediaUrl(data) ?? data) as T;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => rewriteMediaInJson(item)) as T;
  }
  if (typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'galleryUrls' && Array.isArray(value)) {
        out[key] = value.map((v) =>
          typeof v === 'string' ? resolveMediaUrl(v) ?? v : rewriteMediaInJson(v),
        );
      } else if (URL_LIKE_KEYS.test(key) && typeof value === 'string') {
        out[key] = resolveMediaUrl(value) ?? value;
      } else {
        out[key] = rewriteMediaInJson(value);
      }
    }
    return out as T;
  }
  return data;
}

export function mapMenuItem<T extends { imageUrl?: string | null; galleryUrls?: string[] | null }>(
  item: T,
): T {
  return {
    ...item,
    imageUrl: resolveMediaUrl(item.imageUrl) ?? item.imageUrl,
    galleryUrls: item.galleryUrls?.map((g) => resolveMediaUrl(g) || g) ?? item.galleryUrls,
  };
}

export function mapRestaurantMedia<
  T extends {
    coverImage?: string | null;
    logoUrl?: string | null;
    menuCategories?: { items: { imageUrl?: string | null; galleryUrls?: string[] | null }[] }[];
    menuItems?: { imageUrl?: string | null; galleryUrls?: string[] | null }[];
  },
>(restaurant: T): T {
  return {
    ...restaurant,
    coverImage: resolveMediaUrl(restaurant.coverImage) ?? restaurant.coverImage,
    logoUrl: resolveMediaUrl(restaurant.logoUrl) ?? restaurant.logoUrl,
    menuCategories: restaurant.menuCategories?.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => mapMenuItem(item)),
    })),
    menuItems: restaurant.menuItems?.map((item) => mapMenuItem(item)),
  };
}
