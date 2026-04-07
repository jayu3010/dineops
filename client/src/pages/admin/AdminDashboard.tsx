import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  ArrowUpRight,
  MoreVertical,
  Plus,
  Loader2
} from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useSocket } from '../../hooks/useSocket';
import { sortTablesByNumber } from '../../utils/sortTables';

const fmt = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type DashboardData = {
  todayBookings: number;
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  revenueToday: number;
  revenueWeek: number;
  orderTypeToday?: {
    DINE_IN: number;
    TAKEAWAY: number;
    DELIVERY: number;
    OTHER: number;
  };
  bookingTrend7d: { name: string; date: string; bookings: number }[];
  recentBookings: {
    id: string;
    guestName: string;
    tableNumber: string;
    date: string;
    status: string;
    guestCount: number;
  }[];
};

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurantId;
  const tenantId = user?.tenantId || '';

  useSocket(tenantId);

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['admin-dashboard', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/analytics/dashboard/restaurant/${restaurantId}`);
      return res.data.data as DashboardData;
    },
    enabled: !!restaurantId
  });

  const { data: tablesRaw, isLoading: tablesLoading } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/tables/all/${restaurantId}`);
      return res.data.data as { id: string; tableNumber: string; status: string }[];
    },
    enabled: !!restaurantId
  });

  const tablesSorted = useMemo(
    () => (tablesRaw?.length ? sortTablesByNumber(tablesRaw) : []),
    [tablesRaw]
  );

  const loading = dashLoading || tablesLoading;

  if (!restaurantId) {
    return (
      <div className="p-8">
        <p className="text-muted">Complete restaurant setup to see your dashboard.</p>
        <Link to="/admin/profile" className="text-primary font-semibold mt-2 inline-block">
          Go to setup
        </Link>
      </div>
    );
  }

  if (loading || !dash) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const stats = [
    {
      label: "Today's bookings",
      value: String(dash.todayBookings),
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: 'Tables',
      value: `${dash.totalTables}`,
      sub: `${dash.availableTables} available · ${dash.occupiedTables} occupied`,
      icon: Users,
      color: 'text-orange-600 bg-orange-50'
    },
    {
      label: 'Available now',
      value: String(dash.availableTables),
      icon: Clock,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: "Today's revenue",
      value: fmt(dash.revenueToday),
      sub: `This week ${fmt(dash.revenueWeek)}`,
      icon: ArrowUpRight,
      color: 'text-purple-600 bg-purple-50'
    }
  ];

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Restaurant dashboard</h1>
          <p className="text-muted text-sm mt-1">Live stats from bookings, tables, and paid orders</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/tables" className="btn-secondary flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" /> Tables
          </Link>
          <Link to="/admin/pos" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> POS
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
            <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
              <item.icon size={24} />
            </div>
            <p className="text-muted text-sm font-medium">{item.label}</p>
            <h3 className="text-2xl font-bold text-secondary mt-1">{item.value}</h3>
            {item.sub && <p className="text-xs text-muted mt-1">{item.sub}</p>}
          </div>
        ))}
      </div>

      {dash.orderTypeToday && (
        <div className="mb-10">
          <h2 className="text-lg font-serif font-bold text-secondary mb-3">Today&apos;s paid orders by type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'DINE_IN', label: 'Dine in' },
              { key: 'TAKEAWAY', label: 'Takeaway' },
              { key: 'DELIVERY', label: 'Delivery' },
              { key: 'OTHER', label: 'Other' }
            ].map(({ key, label }) => (
              <div
                key={key}
                className="bg-white rounded-xl border border-stone-100 p-4 text-center shadow-sm"
              >
                <p className="text-xs font-bold uppercase text-muted">{label}</p>
                <p className="text-xl font-black text-secondary mt-1">
                  {dash.orderTypeToday![key as keyof NonNullable<typeof dash.orderTypeToday>]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-base p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary">Booking trends</h2>
            <span className="text-xs text-muted font-medium">Last 7 days</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dash.bookingTrend7d}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#f97316"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBookings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-base flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-secondary">Live tables</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
          <div className="p-6 grid grid-cols-3 gap-3 overflow-y-auto max-h-[350px]">
            {tablesSorted.map((table) => (
              <div
                key={table.id}
                className={`
                  aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold
                  ${
                    table.status === 'OCCUPIED'
                      ? 'bg-red-50 border-red-100 text-red-700'
                      : table.status === 'RESERVED'
                        ? 'bg-amber-50 border-amber-100 text-amber-800'
                        : 'bg-green-50 border-green-100 text-green-700'
                  }
                `}
              >
                <span>{table.tableNumber}</span>
                <Users size={14} className={table.status === 'OCCUPIED' ? 'opacity-80' : ''} />
              </div>
            ))}
            {tablesSorted.length === 0 && (
              <div className="col-span-3 text-center py-10 text-muted text-sm">No tables configured.</div>
            )}
          </div>
          <div className="mt-auto p-4 bg-gray-50 border-t border-gray-100 flex justify-around text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Free
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Occupied
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Reserved
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-3 card-base">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-secondary">Recent bookings</h2>
            <Link to="/admin/tables" className="text-primary text-sm font-semibold hover:underline">
              Manage tables
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {dash.recentBookings.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">No bookings yet.</div>
            ) : (
              dash.recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 flex items-center justify-between hover:bg-orange-50/20 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-500 flex-shrink-0">
                      {b.guestName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-secondary truncate">{b.guestName}</h4>
                      <p className="text-xs text-muted truncate">
                        Table {b.tableNumber} · {b.guestCount} guests ·{' '}
                        {new Date(b.date).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        b.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {b.status}
                    </span>
                    <button type="button" className="p-2 text-gray-400 hover:text-secondary rounded-lg" aria-label="More">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
