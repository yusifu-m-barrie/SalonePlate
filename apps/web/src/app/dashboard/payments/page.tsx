'use client';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="text-brand-gray">Orange Money, COD, escrow, restaurant & rider payouts</p>
      <div className="grid grid-cols-3 gap-4">
        {['Orange Money SL', 'Cash on Delivery', 'Stripe (Ready)'].map((m) => (
          <div key={m} className="glass-card p-4 text-center">
            <p className="font-medium">{m}</p>
            <p className="text-brand-gray text-xs mt-1">Architecture ready</p>
          </div>
        ))}
      </div>
    </div>
  );
}
