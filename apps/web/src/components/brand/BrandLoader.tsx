'use client';

import { SalonePlateLogo } from './SalonePlateLogo';

type Props = {
  message?: string;
};

export function BrandLoader({ message = 'Loading…' }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-6 p-6">
      <div className="animate-pulse">
        <SalonePlateLogo width={160} height={168} priority />
      </div>
      <div className="h-8 w-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
      <p className="text-brand-gray text-sm">{message}</p>
    </div>
  );
}
