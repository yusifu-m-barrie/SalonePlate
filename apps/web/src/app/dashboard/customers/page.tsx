'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { appConfirm } from '@/lib/appAlert';

type Customer = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
  isBanned: boolean;
  createdAt: string;
  orderCount: number;
  city?: { name: string };
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      const { data } = await api.get<{ customers: Customer[]; meta: { total: number } }>('/admin/customers', {
        params: { q: search || undefined, limit: 100 },
      });
      return data;
    },
    enabled: status === 'authenticated' && !!session?.accessToken,
  });

  const ban = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/ban`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-customers'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-brand-gray text-sm">All registered customer accounts on SalonePlate</p>
      </div>

      <div className="flex gap-3">
        <input
          className="input-field flex-1 max-w-md"
          placeholder="Search name, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(q)}
        />
        <button type="button" onClick={() => setSearch(q)} className="px-4 py-2 rounded-xl gold-gradient text-brand-dark font-semibold text-sm flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      <p className="text-brand-gray text-sm">{data?.meta?.total ?? 0} customer(s)</p>

      {isLoading && <p className="text-brand-gray">Loading…</p>}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-brand-gray border-b border-white/10">
              <th className="text-left p-4">Customer</th>
              <th className="text-left p-4">Contact</th>
              <th className="text-left p-4">Orders</th>
              <th className="text-left p-4">Joined</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.customers || []).map((c) => (
              <tr key={c.id} className="border-b border-white/5">
                <td className="p-4">
                  <p className="font-medium">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p className="text-xs text-brand-gray">★ {c.loyaltyPoints} pts</p>
                </td>
                <td className="p-4 text-brand-gray">
                  {c.email || '—'}
                  {c.phone && <p className="text-xs">{c.phone}</p>}
                </td>
                <td className="p-4">{c.orderCount}</td>
                <td className="p-4 text-brand-gray">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  {!c.isBanned ? (
                    <button
                      type="button"
                      onClick={() => appConfirm('Ban customer?', 'They will not be able to place orders.', () => ban.mutate(c.id), { confirmText: 'Ban', destructive: true })}
                      className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg"
                    >
                      Ban
                    </button>
                  ) : (
                    <span className="text-xs text-red-400">Banned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && (data?.customers?.length ?? 0) === 0 && (
          <p className="p-8 text-center text-brand-gray">No customers found.</p>
        )}
      </div>
    </div>
  );
}
