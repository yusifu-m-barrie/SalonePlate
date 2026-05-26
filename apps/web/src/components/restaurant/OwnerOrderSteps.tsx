'use client';

const STEPS = [
  { status: 'PREPARING', label: 'Start preparing', note: 'Preparation started' },
  { status: 'RIDER_ASSIGNED', label: 'Make food ready', note: 'Order ready — customer notified' },
  { status: 'ON_THE_WAY', label: 'Out for delivery', note: 'Left restaurant — on the way to customer' },
] as const;

export function fulfillmentProgress(orderStatus: string): number {
  if (orderStatus === 'RESTAURANT_ACCEPTED') return -1;
  if (orderStatus === 'PREPARING') return 0;
  if (orderStatus === 'RIDER_ASSIGNED') return 1;
  if (orderStatus === 'ON_THE_WAY' || orderStatus === 'DELIVERED') return 2;
  return -2;
}

function stepState(progress: number, stepIndex: number) {
  if (progress >= 2) return 'completed';
  if (progress >= stepIndex) return 'completed';
  if (progress + 1 === stepIndex) return 'active';
  return 'locked';
}

type Props = {
  orderStatus: string;
  loading?: boolean;
  onAdvance: (status: string, note: string) => void;
};

export function OwnerOrderSteps({ orderStatus, loading, onAdvance }: Props) {
  const progress = fulfillmentProgress(orderStatus);
  if (progress < -1) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-gray">Order progress</p>
      {STEPS.map((step, index) => {
        const state = stepState(progress, index);
        return (
          <button
            key={step.status}
            type="button"
            disabled={state !== 'active' || loading}
            onClick={() => onAdvance(step.status, step.note)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left text-sm font-semibold transition ${
              state === 'active'
                ? 'border-brand-gold bg-brand-gold/10 text-white'
                : state === 'completed'
                  ? 'border-white/10 opacity-50 text-brand-gray'
                  : 'border-white/10 opacity-40 text-brand-gray cursor-not-allowed'
            }`}
          >
            <span>{step.label}</span>
            {state === 'completed' && <span className="text-green-400 text-xs">Done</span>}
            {state === 'active' && loading && (
              <span className="w-4 h-4 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
            )}
          </button>
        );
      })}
    </div>
  );
}
