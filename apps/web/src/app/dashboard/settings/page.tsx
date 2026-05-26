'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type City = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  taxRate: number;
  deliveryBaseFee: number;
  country?: { name: string };
  _count?: { restaurants: number; users: number };
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await api.get<{
        cities: City[];
        roleCounts: { role: string; _count: { _all: number } }[];
        platform: { defaultCurrency: string; supportEmail: string; maintenanceMode: boolean };
      }>('/admin/settings');
      return data;
    },
    enabled: status === 'authenticated',
  });

  const updateCity = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { taxRate?: number; deliveryBaseFee?: number; isActive?: boolean };
    }) => api.patch(`/admin/cities/${id}`, patch),
    onSuccess: () => {
      setMessage('City settings saved.');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  if (isLoading) return <p className="text-brand-gray">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform settings</h1>
        <p className="text-brand-gray text-sm">Regional delivery fees, tax rates, and role overview</p>
      </div>

      {message && <p className="text-brand-gold text-sm">{message}</p>}

      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Platform</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-brand-gray">Currency</p>
            <p className="font-medium">{data?.platform.defaultCurrency}</p>
          </div>
          <div>
            <p className="text-brand-gray">Support email</p>
            <p className="font-medium">{data?.platform.supportEmail}</p>
          </div>
          <div>
            <p className="text-brand-gray">Maintenance</p>
            <p className="font-medium">{data?.platform.maintenanceMode ? 'On' : 'Off'}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Users by role</h2>
        <div className="flex flex-wrap gap-4">
          {(data?.roleCounts || []).map((r) => (
            <div key={r.role} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <p className="text-brand-gray text-xs">{r.role}</p>
              <p className="text-xl font-bold">{r._count._all}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Cities &amp; delivery</h2>
        {(data?.cities || []).map((city) => (
          <CityEditor key={city.id} city={city} onSave={(patch) => updateCity.mutate({ id: city.id, patch })} saving={updateCity.isPending} />
        ))}
      </div>
    </div>
  );
}

function CityEditor({
  city,
  onSave,
  saving,
}: {
  city: City;
  onSave: (patch: { taxRate?: number; deliveryBaseFee?: number; isActive?: boolean }) => void;
  saving: boolean;
}) {
  const [taxRate, setTaxRate] = useState(String((city.taxRate * 100).toFixed(1)));
  const [feeNle, setFeeNle] = useState(String(city.deliveryBaseFee / 1000));
  const [active, setActive] = useState(city.isActive);

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-medium text-lg">{city.name}</p>
          <p className="text-sm text-brand-gray">
            {city.country?.name} · {city._count?.restaurants ?? 0} restaurants · {city._count?.users ?? 0} users
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-brand-gray">
          Tax rate (%)
          <input className="input-field mt-1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </label>
        <label className="text-sm text-brand-gray">
          Base delivery fee (NLE)
          <input className="input-field mt-1" value={feeNle} onChange={(e) => setFeeNle(e.target.value)} />
          <p className="text-xs mt-1">Stored: {formatCurrency(Number(feeNle) * 1000)}</p>
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            taxRate: Number(taxRate) / 100,
            deliveryBaseFee: Number(feeNle) * 1000,
            isActive: active,
          })
        }
        className="mt-4 px-4 py-2 rounded-xl gold-gradient text-brand-dark text-sm font-semibold disabled:opacity-50"
      >
        Save {city.name}
      </button>
    </div>
  );
}
