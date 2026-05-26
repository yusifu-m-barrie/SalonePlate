import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatCurrency as formatNle } from '@saloneplate/shared-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return formatNle(amount);
}
