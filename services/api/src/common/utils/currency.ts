/** Sierra Leone Leone (SLE / NLE). Stored amounts use legacy units (1 NLE = 1,000). */
const CURRENCY_SYMBOL = 'NLE';
const LEGACY_DIVISOR = 1000;

/** Convert NLE entered by humans to stored legacy units. */
export function fromNleAmount(nle: number): number {
  return Math.round(nle * LEGACY_DIVISOR);
}

export function formatCurrency(storedAmount: number): string {
  const nle = storedAmount / LEGACY_DIVISOR;
  const hasFraction = Math.abs(nle - Math.round(nle)) > 0.001;
  const formatted = nle.toLocaleString('en-SL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
  return `${CURRENCY_SYMBOL} ${formatted}`;
}
