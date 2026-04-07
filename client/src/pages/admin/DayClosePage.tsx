import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Banknote, CreditCard, Smartphone, Wallet, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

type ReportData = {
  summary: {
    totalPaidOrders: number;
    totalRevenue: number;
    openUnpaidOrders: number;
    byPaymentMode: {
      CASH: { count: number; amount: number };
      CARD: { count: number; amount: number };
      UPI: { count: number; amount: number };
      OTHER: { count: number; amount: number };
    };
  };
};

const fmtMoney = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function localDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DayClosePage = () => {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurantId;
  const [day, setDay] = useState(() => localDateInput(new Date()));

  const fromTo = useMemo(() => {
    const start = new Date(day + 'T00:00:00');
    const end = new Date(day + 'T23:59:59.999');
    return { from: start.toISOString(), to: end.toISOString() };
  }, [day]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['day-close', restaurantId, day],
    queryFn: async () => {
      const res = await api.get(`/orders/reports/restaurant/${restaurantId}`, {
        params: { from: fromTo.from, to: fromTo.to, page: 1, limit: 5 }
      });
      return res.data.data as ReportData;
    },
    enabled: !!restaurantId && !!day
  });

  const modes = data?.summary.byPaymentMode;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-secondary flex items-center gap-2">
          <CalendarClock className="text-primary" /> Day close
        </h1>
        <p className="text-muted text-sm mt-1">
          Reconcile settled bills for a calendar day (cash, card, UPI). Uses the same report as Orders &amp; payments.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
        <label className="text-xs font-bold uppercase text-stone-500">Business date</label>
        <input type="date" className="input-field max-w-xs" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>

      {!restaurantId ? (
        <p className="text-muted">No restaurant linked.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : isError || !data ? (
        <p className="text-red-600 text-sm">Could not load day summary.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <p className="text-xs font-bold uppercase text-muted">Paid orders (completed)</p>
              <p className="text-2xl font-black text-secondary mt-1">{data.summary.totalPaidOrders}</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <p className="text-xs font-bold uppercase text-muted">Total collected</p>
              <p className="text-2xl font-black text-primary mt-1">{fmtMoney(data.summary.totalRevenue)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 font-serif font-bold text-secondary">By payment mode</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase bg-stone-50">
                  <th className="p-4">Mode</th>
                  <th className="p-4">Bills</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'CASH', label: 'Cash', Icon: Banknote },
                  { key: 'CARD', label: 'Card', Icon: CreditCard },
                  { key: 'UPI', label: 'UPI', Icon: Smartphone },
                  { key: 'OTHER', label: 'Other', Icon: Wallet }
                ].map(({ key, label, Icon }) => {
                  const row = modes?.[key as keyof typeof modes];
                  return (
                    <tr key={key} className="border-t border-stone-50">
                      <td className="p-4 font-medium flex items-center gap-2">
                        <Icon size={16} className="text-primary" /> {label}
                      </td>
                      <td className="p-4 tabular-nums">{row?.count ?? 0}</td>
                      <td className="p-4 text-right tabular-nums font-bold">{fmtMoney(row?.amount ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted">
            Open unpaid orders today: <strong>{data.summary.openUnpaidOrders}</strong> (still on tables / in kitchen).
          </p>
        </div>
      )}
    </div>
  );
};

export default DayClosePage;
