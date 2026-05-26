/** Parse YYYY-MM-DD (HTML date input) or ISO datetime; returns null if invalid. */
export function parseDateParam(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const date = new Date(year, month, day, 0, 0, 0, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isDateOnlyQuery(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}
