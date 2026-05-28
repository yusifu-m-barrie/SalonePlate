import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function SalonePlateLogo({ width = 140, height = 148, className, priority }: Props) {
  return (
    <Image
      src="/logo.png"
      alt="SalonePlate"
      width={width}
      height={height}
      priority={priority}
      className={cn('object-contain', className)}
    />
  );
}
