import type { AxiosError } from 'axios';

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{ message?: string | string[] }>;
  if (!ax.response) {
    const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    return (
      `Cannot reach the server at ${base}.\n\n` +
      '1. In services/api run: npm run dev (port must be 4000, not 400)\n' +
      '2. On PC run ipconfig → use Wi‑Fi IPv4 in apps/mobile/.env\n' +
      '3. Phone and PC on same Wi‑Fi, then: npx expo start -c\n' +
      '4. On phone browser try: ' + base.replace('/api/v1', '/api/v1/health')
    );
  }
  const msg = ax.response.data?.message;
  if (Array.isArray(msg)) return msg[0] || fallback;
  if (typeof msg === 'string') return msg;
  return fallback;
}
