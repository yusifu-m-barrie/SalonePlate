'use client';

import { useState } from 'react';
import { PLACEHOLDER, resolveImageUrl } from '@/lib/imageUrl';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
};

export function MediaImage({ src, alt = '', className }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(src);
  const url = failed ? PLACEHOLDER : resolved;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
