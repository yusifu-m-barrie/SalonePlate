import Image from 'next/image';
import { cn } from '@/lib/utils';

type Variant = 'full' | 'mark' | 'sidebar';

type Props = {
  variant?: Variant;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  /** Hides black background on dark dashboards (mix-blend-screen). */
  onDark?: boolean;
  showWordmark?: boolean;
};

const PRESETS: Record<Variant, { width: number; height: number }> = {
  full: { width: 120, height: 126 },
  mark: { width: 44, height: 44 },
  sidebar: { width: 44, height: 44 },
};

/** Cropped emblem only (top of artwork) — for sidebars. */
function LogoMark({
  size,
  onDark,
  className,
  priority,
}: {
  size: number;
  onDark?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn('relative overflow-hidden shrink-0', onDark && 'mix-blend-screen', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt=""
        width={Math.round(size * 2.1)}
        height={Math.round(size * 2.8)}
        priority={priority}
        className="absolute left-1/2 top-0 max-w-none -translate-x-1/2 object-cover object-top"
        style={{ width: Math.round(size * 2.1), height: Math.round(size * 2.8) }}
      />
    </div>
  );
}

export function SalonePlateLogo({
  variant = 'full',
  width,
  height,
  className,
  priority,
  onDark = false,
  showWordmark = false,
}: Props) {
  const preset = PRESETS[variant];
  const w = width ?? preset.width;
  const h = height ?? preset.height;

  if (variant === 'mark' || variant === 'sidebar') {
    return (
      <div className={cn('flex flex-col items-center gap-1.5', className)}>
        <LogoMark size={w} onDark={onDark} priority={priority} />
        {showWordmark || variant === 'sidebar' ? (
          <p className="text-sm font-bold leading-tight text-center">
            Salone<span className="text-brand-gold">Plate</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="SalonePlate"
      width={w}
      height={h}
      priority={priority}
      className={cn('object-contain', onDark && 'mix-blend-screen', className)}
    />
  );
}
