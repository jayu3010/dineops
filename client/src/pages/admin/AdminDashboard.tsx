import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  MoreVertical,
  Plus
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

const data = [
  { name: 'Mon', bookings: 40 },
  { name: 'Tue', bookings: 30 },
  { name: 'Wed', bookings: 65 },
  { name: 'Thu', bookings: 45 },
  { name: 'Fri', bookings: 90 },
  { name: 'Sat', bookings: 120 },
  { name: 'Sun', bookings: 80 },
];

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const tenantId = 'gourmet-heaven-123'; // Mocked for now
  
  useSocket(tenantId);
  
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => ({
      todayBookings: 12,
      totalTables: 24,
      availableTables: 18,
      revenueToday: '₹8,450'
    })
  });

  const { data: tables } = useQuery({
    queryKey: ['tables', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tables/${tenantId}`);
      return res.data.data;
    }
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Restaurant Dashboard</h1>
          <p className="text-muted text-sm mt-1">Manage your tables and bookings for today</p>
        </div>
        <div className="flex gap-4">
          <button className="btn-secondary flex items-center gap-2">
            <Calendar className="w-4 h-4" /> View Calendar
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Today's Bookings", value: stats?.todayBookings, icon: Calendar, color: "text-blue-600 bg-blue-50" },
          { label: "Total Tables", value: stats?.totalTables, icon: Users, color: "text-orange-600 bg-orange-50" },
          { label: "Available Now", value: stats?.availableTables, icon: Clock, color: "text-green-600 bg-green-50" },
          { label: "Daily Revenue", value: stats?.revenueToday, icon: ArrowUpRight, color: "text-purple-600 bg-purple-50" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
            <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center mb-4`}>
              <item.icon size={24} />
            </div>
            <p className="text-muted text-sm font-medium">{item.label}</p>
            <h3 className="text-2xl font-bold text-secondary mt-1">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Trends Chart */}
        <div className="lg:col-span-2 card-base p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary">Booking Trends</h2>
            <select className="bg-stone-50 border-none text-sm rounded-lg px-3 py-1 text-muted">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#888', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#888', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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

        {/* Real-time Table Status Mini-map */}
        <div className="card-base flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-secondary">Live Tables</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-3 gap-3 overflow-y-auto max-h-[350px]">
            {tables?.map((table: any) => (
              <div 
                key={table.id} 
                className={`
                  aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all
                  ${table.status === 'OCCUPIED' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}
                `}
              >
                <span className="text-xs font-bold">{table.number}</span>
                <Users size={14} className={table.status === 'OCCUPIED' ? 'fill-red-700' : ''} />
              </div>
            ))}
            {(!tables || tables.length === 0) && (
               <div className="col-span-3 text-center py-10 text-muted text-sm">
                 No tables configured.
               </div>
            )}
          </div>
          <div className="mt-auto p-4 bg-gray-50 border-t border-gray-100 flex justify-around text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Available
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Occupied
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Recent Bookings List (Moved below) */}
        <div className="lg:col-span-3 card-base">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-secondary">Recent Bookings</h2>
            <button className="text-primary text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-orange-50/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-500">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary">Customer {i}</h4>
                    <p className="text-xs text-muted">Table {i * 2} • {i + 1} Guests • 7:30 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="badge-confirmed">Confirmed</span>
                  <button className="p-2 text-gray-400 hover:text-secondary rounded-lg">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
