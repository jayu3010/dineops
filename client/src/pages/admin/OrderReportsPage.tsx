import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
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
    dateFilter: {
      applied: boolean;
      from: string | null;
      to: string | null;
      note: string;
    };
  };
  orders: Array<{
    id: string;
    createdAt: string;
    completedAt: string | null;
    status: string;
    paymentStatus: string;
    paymentMode: string | null;
    totalAmount: number;
    tableNumber: string | null;
    customerName: string | null;
    customerPhone: string | null;
    itemCount: number;
    itemsPreview: string[];
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const fmtMoney = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OrderReportsPage = () => {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurantId;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['order-report', restaurantId, appliedFrom, appliedTo, page],
    queryFn: async () => {
      const res = await api.get(`/orders/reports/restaurant/${restaurantId}`, {
        params: {
          page,
          limit,
          ...(appliedFrom ? { from: appliedFrom } : {}),
          ...(appliedTo ? { to: appliedTo } : {})
        }
      });
      return res.data.data as ReportData;
    },
    enabled: !!restaurantId
  });

  const applyFilters = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
    setPage(1);
  };

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setAppliedFrom('');
    setAppliedTo('');
    setPage(1);
  };

  if (!restaurantId) {
    return (
      <div className="p-8">
        <p className="text-muted">No restaurant linked to this account.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <p className="text-danger">
          {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load report'}
        </p>
      </div>
    );
  }

  const s = data?.summary;
  const pm = s?.byPaymentMode;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary flex items-center gap-2">
            <FileBarChart className="text-primary" size={32} />
            Orders & payments
          </h1>
          <p className="text-muted text-sm mt-1">
            Paid totals by Cash, Card, and UPI — browse every order with pagination (e.g. 200+).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 md:p-6 space-y-4">
        <p className="text-xs text-stone-500 leading-relaxed">{s?.dateFilter.note}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-muted mb-1">From</label>
            <input
              type="date"
              className="input-field text-sm py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-muted mb-1">To</label>
            <input
              type="date"
              className="input-field text-sm py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button type="button" onClick={applyFilters} className="btn-primary py-2 text-sm">
            Apply range
          </button>
          <button type="button" onClick={clearFilters} className="btn-secondary py-2 text-sm">
            All time
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-muted">Paid orders</p>
              <p className="text-2xl font-black text-secondary mt-1">{s?.totalPaidOrders ?? 0}</p>
              <p className="text-xs text-stone-500 mt-1">Completed & settled</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-muted">Total revenue</p>
              <p className="text-2xl font-black text-primary mt-1">{fmtMoney(s?.totalRevenue ?? 0)}</p>
              <p className="text-xs text-stone-500 mt-1">In selected period</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-muted">Open / unpaid</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{s?.openUnpaidOrders ?? 0}</p>
              <p className="text-xs text-stone-500 mt-1">Current floor (not date-filtered)</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-muted">Orders in list</p>
              <p className="text-2xl font-black text-secondary mt-1">{data?.pagination.total ?? 0}</p>
              <p className="text-xs text-stone-500 mt-1">Matching date filter (placed)</p>
            </div>
          </div>

          <div>
            <h2 className="font-serif text-lg font-bold text-secondary mb-3">Payment trail (owner)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'CASH', label: 'Cash', icon: Banknote, bg: 'bg-emerald-50 border-emerald-100' },
                { key: 'CARD', label: 'Card', icon: CreditCard, bg: 'bg-blue-50 border-blue-100' },
                { key: 'UPI', label: 'UPI', icon: Smartphone, bg: 'bg-violet-50 border-violet-100' },
                { key: 'OTHER', label: 'Other / unset', icon: Wallet, bg: 'bg-stone-50 border-stone-200' }
              ].map(({ key, label, icon: Icon, bg }) => {
                const row = pm?.[key as keyof typeof pm];
                if (!row) return null;
                return (
                  <div key={key} className={`rounded-2xl border p-5 shadow-sm ${bg}`}>
                    <div className="flex items-center gap-2 text-stone-600 mb-2">
                      <Icon size={20} />
                      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                    </div>
                    <p className="text-xl font-black text-secondary">{row.count} orders</p>
                    <p className="text-lg font-bold text-primary mt-1">{fmtMoney(row.amount)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-lg font-bold text-secondary">Order log</h2>
              <span className="text-sm text-muted">
                Page {data?.pagination.page} of {data?.pagination.totalPages} · {data?.pagination.total}{' '}
                orders
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-muted text-xs uppercase tracking-wider bg-stone-50 border-b border-stone-100">
                    <th className="px-4 py-3">Placed</th>
                    <th className="px-4 py-3">Table</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.orders.map((o) => (
                    <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50/80">
                      <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                        {new Date(o.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold">{o.tableNumber ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <span className="text-stone-500">{o.itemCount} pcs</span>
                        <p className="text-xs text-muted truncate" title={o.itemsPreview.join(', ')}>
                          {o.itemsPreview.join(', ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">{fmtMoney(o.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-xs uppercase">{o.paymentMode || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{o.paymentStatus}</span>
                        <span className="text-muted text-xs"> / {o.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600 max-w-[140px] truncate">
                        {[o.customerName, o.customerPhone].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-stone-100 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-stone-200 text-sm font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={18} /> Previous
              </button>
              <button
                type="button"
                disabled={page >= (data?.pagination.totalPages ?? 1) || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-stone-200 text-sm font-semibold disabled:opacity-40"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderReportsPage;
