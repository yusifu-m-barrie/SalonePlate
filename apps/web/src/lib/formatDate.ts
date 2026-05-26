export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

/** Validate HTML date input value (YYYY-MM-DD). */
export function isValidDateInput(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const msg = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.map(String).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
