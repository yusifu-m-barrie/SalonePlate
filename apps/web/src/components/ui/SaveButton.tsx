'use client';

type Props = {
  saving: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function SaveButton({ saving, disabled, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || saving}
      onClick={onClick}
      className={`relative w-full py-3 rounded-xl gold-gradient text-brand-dark font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 ${className}`}
    >
      {saving && (
        <span
          className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin shrink-0"
          aria-hidden
        />
      )}
      {saving ? 'Saving' : 'Save'}
    </button>
  );
}
