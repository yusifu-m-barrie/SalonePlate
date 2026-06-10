const LEGACY_DIVISOR = 1000;

export function nleToStored(nle: number): number {
  return Math.round(nle * LEGACY_DIVISOR);
}

export function storedToNle(stored: number): number {
  return stored / LEGACY_DIVISOR;
}

export function formatNle(stored: number): string {
  const nle = storedToNle(stored);
  const hasFraction = Math.abs(nle - Math.round(nle)) > 0.001;
  return nle.toLocaleString('en-SL', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

/** Normalize to +232XXXXXXXX for Orange SL. */
export function normalizeOrangePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('232')) return `+${digits}`;
  if (digits.length === 8 || digits.length === 9) return `+232${digits}`;
  return `+${digits}`;
}

export function buildOrangeSmsMessage(
  amountNleFormatted: string,
  merchantName: string,
  merchantMsisdn: string,
): string {
  const payTo = merchantMsisdn
    ? `${merchantName.toUpperCase()} (${merchantMsisdn})`
    : merchantName.toUpperCase();
  return (
    `YOU WILL DO A PAYOUT OF NLE ${amountNleFormatted} TO ${payTo}. ` +
    `PLEASE dial #144# and follow instructions to confirm your payment.`
  );
}

export function getOrangeMoneyConfig() {
  return {
    merchantName: process.env.ORANGE_MONEY_MERCHANT_NAME || 'SalonePlate',
    merchantMsisdn: process.env.ORANGE_MONEY_MERCHANT_MSISDN || '+23279506010',
    ussdCode: process.env.ORANGE_MONEY_USSD || '#144#',
    currency: 'SLE',
    simulate: process.env.ORANGE_MONEY_SIMULATE !== 'false',
    apiUrl: process.env.ORANGE_MONEY_API_URL || '',
  };
}
