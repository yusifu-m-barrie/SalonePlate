'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, toNleAmount } from '@saloneplate/shared-types';

interface RevenueChartProps {
  data: { date: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="glass-card p-6 h-80">
      <h3 className="font-semibold mb-4">Revenue (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
          <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${toNleAmount(v).toFixed(0)}`} />
          <Tooltip
            contentStyle={{ background: '#071A2F', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12 }}
            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="url(#goldGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
