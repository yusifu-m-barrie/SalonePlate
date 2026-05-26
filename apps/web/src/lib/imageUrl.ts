const API_HOST =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:4000';

export const PLACEHOLDER =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';

/** Resolve menu/restaurant upload URLs for the current API host. */
export function resolveImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return PLACEHOLDER;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    return `${API_HOST}${trimmed}`;
  }
  const uploadsPath = trimmed.match(/\/uploads\/[^\s?#]+/);
  if (uploadsPath) {
    return `${API_HOST}${uploadsPath[0]}`;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return `${API_HOST}${u.pathname}${u.search}`;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

const URL_LIKE_KEYS =
  /^(imageUrl|coverImage|logoUrl|avatarUrl|galleryUrls|photos|thumbnailUrl)$/i;

export function rewriteMediaInJson<T>(data: T): T {
  if (data == null) return data;
  if (typeof data === 'string') {
    if (
      data.startsWith('/uploads/') ||
      /\/uploads\//.test(data) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(data)
    ) {
      return resolveImageUrl(data) as T;
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
          typeof v === 'string' ? resolveImageUrl(v) : rewriteMediaInJson(v),
        );
      } else if (URL_LIKE_KEYS.test(key) && typeof value === 'string') {
        out[key] = resolveImageUrl(value);
      } else {
        out[key] = rewriteMediaInJson(value);
      }
    }
    return out as T;
  }
  return data;
}
