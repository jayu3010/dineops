import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { TrendingUp, IndianRupee, Calendar, PieChart } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { Loader2 } from 'lucide-react';

const ORANGE = '#F97316';

type AnalyticsPeriodPreset = 'last7' | 'last15' | 'last30' | 'thisMonth' | 'lastMonth';

type AnalyticsPayload = {
  period: { preset: string; label: string; start: string; end: string };
  revenue: {
    today: number;
    periodTotal: number;
    periodPaidOrders: number;
    bookingsInPeriod: number;
    week: number;
    month: number;
    avgOrderValue: number;
  };
  bookingTrend: { date: string; count: number }[];
  topMenuItems: { name: string; timesOrdered: number; revenue: number }[];
  tableUtilization: {
    tableId: string;
    tableNumber: string;
    orderCount: number;
    avgOccupancyMinutes: number;
  }[];
  heatmap: { dayOfWeek: number; hour: number; count: number }[];
  recentOrders: {
    id: string;
    date: string;
    tableNumber: string;
    itemCount: number;
    amount: number;
    paymentMode: string;
    status: string;
    paymentStatus: string;
  }[];
  orderTypeBreakdown?: {
    DINE_IN: number;
    TAKEAWAY: number;
    DELIVERY: number;
    OTHER: number;
  };
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmtWhole = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PERIOD_OPTIONS: { preset: AnalyticsPeriodPreset; label: string }[] = [
  { preset: 'last7', label: 'Last 7 days' },
  { preset: 'last15', label: 'Last 15 days' },
  { preset: 'last30', label: 'Last 30 days' },
  { preset: 'thisMonth', label: 'This month' },
  { preset: 'lastMonth', label: 'Last month' }
];

const AnalyticsPage = () => {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurantId;
  const [period, setPeriod] = useState<AnalyticsPeriodPreset>('last30');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', restaurantId, period],
    queryFn: async () => {
      const res = await api.get(`/analytics/restaurant/${restaurantId}`, {
        params: { period }
      });
      return res.data.data as AnalyticsPayload;
    },
    enabled: !!restaurantId,
    retry: 1
  });

  if (!restaurantId) {
    return (
      <div className="p-8">
        <p className="text-muted">No restaurant linked.</p>
      </div>
    );
  }

  if (isError) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error as Error)?.message ||
      'Could not load analytics';
    return (
      <div className="p-8 max-w-lg">
        <h2 className="font-serif text-xl font-bold text-secondary mb-2">Analytics unavailable</h2>
        <p className="text-muted text-sm mb-4">{msg}</p>
        <p className="text-sm text-stone-600">
          If you recently updated the API, run <code className="bg-stone-100 px-1 rounded">npx prisma generate</code> and{' '}
          <code className="bg-stone-100 px-1 rounded">npx prisma db push</code> in the <code className="bg-stone-100 px-1 rounded">server</code> folder, then restart the server.
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const maxHeat = Math.max(1, ...data.heatmap.map((h) => h.count));

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Analytics</h1>
          <p className="text-muted text-sm mt-1">
            Period: <strong className="text-secondary">{data.period.label}</strong>
            <span className="text-stone-400 ml-2">({new Date(data.period.start).toLocaleDateString('en-IN')} –{' '}
            {new Date(data.period.end).toLocaleDateString('en-IN')})</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.preset}
              type="button"
              onClick={() => setPeriod(o.preset)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                period === o.preset ? 'bg-primary text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue cards — amounts rounded to whole rupees */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's revenue (actual today)",
            value: fmtWhole(data.revenue.today),
            icon: IndianRupee
          },
          {
            label: `${data.period.label} — revenue`,
            value: fmtWhole(data.revenue.periodTotal),
            icon: TrendingUp
          },
          {
            label: 'Paid orders in period',
            value: String(data.revenue.periodPaidOrders),
            icon: PieChart
          },
          {
            label: 'Bookings in period',
            value: String(data.revenue.bookingsInPeriod),
            sub: `Avg order ${fmtWhole(data.revenue.avgOrderValue)}`,
            icon: Calendar
          }
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">{c.label}</span>
              <c.icon size={18} className="text-primary" />
            </div>
            <p className="text-2xl font-black text-secondary">{c.value}</p>
            {'sub' in c && c.sub ? <p className="text-xs text-muted mt-1">{c.sub}</p> : null}
          </div>
        ))}
      </div>

      {data.orderTypeBreakdown && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-serif text-lg font-bold text-secondary mb-4">Paid orders by type (period)</h2>
          <p className="text-xs text-muted mb-4">Counts from completed, paid bills in the selected period.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'DINE_IN', label: 'Dine in' },
              { key: 'TAKEAWAY', label: 'Takeaway' },
              { key: 'DELIVERY', label: 'Delivery' },
              { key: 'OTHER', label: 'Other' }
            ].map(({ key, label }) => (
              <div
                key={key}
                className="rounded-xl border border-stone-100 bg-stone-50/80 p-4 text-center"
              >
                <p className="text-xs font-bold uppercase text-muted">{label}</p>
                <p className="text-2xl font-black text-secondary mt-1">
                  {data.orderTypeBreakdown![key as keyof NonNullable<typeof data.orderTypeBreakdown>]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking trend */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-serif text-lg font-bold text-secondary">Booking trends</h2>
          <span className="text-xs text-muted font-medium">Same period as filters above</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.bookingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #fed7aa' }}
                labelStyle={{ fontWeight: 700 }}
              />
              <Line type="monotone" dataKey="count" name="Bookings" stroke={ORANGE} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-serif text-lg font-bold text-secondary mb-4">Top menu items (selected period)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topMenuItems.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12 }}
                  formatter={(v: number, name: string) => {
                    if (name === 'revenue') return [fmtWhole(v), 'Revenue'];
                    return [v, 'Times ordered'];
                  }}
                />
                <Bar dataKey="timesOrdered" name="timesOrdered" radius={[0, 4, 4, 0]}>
                  {data.topMenuItems.slice(0, 8).map((entry, i) => (
                    <Cell key={entry.name} fill={i % 2 === 0 ? ORANGE : '#fb923c'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-stone-100">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topMenuItems.slice(0, 12).map((row) => (
                  <tr key={row.name} className="border-b border-stone-50">
                    <td className="py-2 font-medium text-secondary truncate max-w-[180px]">{row.name}</td>
                    <td className="py-2 tabular-nums">{row.timesOrdered}</td>
                    <td className="py-2 tabular-nums">{fmtWhole(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table utilization */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h2 className="font-serif text-lg font-bold text-secondary mb-4">Table utilization</h2>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-stone-100">
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Avg duration</th>
                </tr>
              </thead>
              <tbody>
                {data.tableUtilization.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted">
                      No completed orders in this period yet
                    </td>
                  </tr>
                ) : (
                  data.tableUtilization.map((t) => (
                    <tr key={`${t.tableId}-${t.tableNumber}`} className="border-b border-stone-50">
                      <td className="py-2 font-bold">{t.tableNumber}</td>
                      <td className="py-2 tabular-nums">{t.orderCount}</td>
                      <td className="py-2 tabular-nums">{t.avgOccupancyMinutes} min</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 overflow-x-auto">
        <h2 className="font-serif text-lg font-bold text-secondary mb-2">
          Peak hours (orders, {data.period.label.toLowerCase()})
        </h2>
        <p className="text-xs text-muted mb-4">Day of week × hour of day</p>
        <div className="inline-block min-w-[800px]">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: '48px repeat(24, minmax(20px, 1fr))' }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-[9px] text-center text-muted font-bold">
                {h}
              </div>
            ))}
            {dayLabels.map((d, di) => (
              <React.Fragment key={d}>
                <div className="text-[10px] font-bold text-secondary flex items-center pr-1">{d}</div>
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = data.heatmap.find((x) => x.dayOfWeek === di && x.hour === h);
                  const c = cell?.count ?? 0;
                  const intensity = c / maxHeat;
                  return (
                    <div
                      key={`${di}-${h}`}
                      title={`${d} ${h}:00 — ${c} orders`}
                      className="aspect-square rounded-sm border border-white/50 min-h-[20px]"
                      style={{
                        backgroundColor: `rgba(249, 115, 22, ${0.08 + intensity * 0.92})`
                      }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 overflow-x-auto">
        <h2 className="font-serif text-lg font-bold text-secondary mb-4">Recent orders</h2>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wider border-b border-stone-100">
              <th className="pb-2">Date</th>
              <th className="pb-2">Table</th>
              <th className="pb-2">Items</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Payment</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o.id} className="border-b border-stone-50">
                <td className="py-2 whitespace-nowrap">
                  {new Date(o.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="py-2 font-semibold">{o.tableNumber}</td>
                <td className="py-2 tabular-nums">{o.itemCount}</td>
                <td className="py-2 tabular-nums">{fmtWhole(o.amount)}</td>
                <td className="py-2">{o.paymentMode}</td>
                <td className="py-2">
                  <span className="text-xs font-bold">{o.paymentStatus}</span>
                  <span className="text-muted text-xs"> / {o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsPage;
