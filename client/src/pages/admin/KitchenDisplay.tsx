import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, ChefHat, Layers, Filter } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'PREPARING', 'READY', 'SERVED'] as const;

function playNewOrderSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 160);
    setTimeout(() => {
      const ctx2 = new Ctx();
      const o2 = ctx2.createOscillator();
      const g2 = ctx2.createGain();
      o2.type = 'sine';
      o2.frequency.value = 660;
      g2.gain.value = 0.08;
      o2.connect(g2);
      g2.connect(ctx2.destination);
      o2.start();
      setTimeout(() => {
        o2.stop();
        ctx2.close();
      }, 160);
    }, 120);
  } catch {
    // ignore
  }
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function onlineSourceLabel(orderType: string) {
  switch (orderType) {
    case 'SWIGGY':
      return 'Swiggy';
    case 'ZOMATO':
      return 'Zomato';
    case 'OWN_WEBSITE':
      return 'Web order';
    case 'DELIVERY':
      return 'Delivery';
    default:
      return 'Online';
  }
}

function statusStyle(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 border-amber-400 text-amber-900';
    case 'PREPARING':
      return 'bg-blue-100 border-blue-500 text-blue-900';
    case 'READY':
      return 'bg-emerald-100 border-emerald-500 text-emerald-900';
    case 'SERVED':
      return 'bg-stone-200 border-stone-400 text-stone-800';
    default:
      return 'bg-stone-100 border-stone-300 text-stone-800';
  }
}

const KitchenDisplay = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId;
  const tenantId = user?.tenantId;
  const [filter, setFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: kitchenPayload, isLoading } = useQuery({
    queryKey: ['kitchen-orders', restaurantId, filter],
    queryFn: async () => {
      const q = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await api.get(`/orders/kitchen/restaurant/${restaurantId}${q}`);
      return res.data.data as { orders: any[]; groupedByTable: Record<string, any[]> };
    },
    enabled: !!restaurantId,
    refetchInterval: 45_000
  });

  const orders = kitchenPayload?.orders ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, { tableNumber: string; orders: any[] }>();
    for (const o of orders) {
      const tid = o.tableId || 'none';
      const tn = o.table?.tableNumber ?? '?';
      if (!map.has(tid)) map.set(tid, { tableNumber: tn, orders: [] });
      map.get(tid)!.orders.push(o);
    }
    return Array.from(map.entries()).sort((a, b) =>
      String(a[1].tableNumber).localeCompare(String(b[1].tableNumber), undefined, { numeric: true })
    );
  }, [orders]);

  const advanceMutation = useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/kitchen-status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Could not update status')
  });

  useEffect(() => {
    if (!tenantId) return;
    const socket: Socket = io(SOCKET_URL);
    socket.on('connect', () => {
      socket.emit('join-restaurant', tenantId);
    });
    socket.on('new-kitchen-order', () => {
      playNewOrderSound();
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });
    socket.on('kitchen-order-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [tenantId, queryClient]);

  const onAdvance = useCallback(
    (orderId: string) => {
      advanceMutation.mutate(orderId);
    },
    [advanceMutation]
  );

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light p-6">
        <p className="text-secondary font-medium">Restaurant not linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col">
      <header className="flex-shrink-0 border-b border-orange-100 bg-white/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/pos"
            className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} /> POS
          </Link>
          <div className="flex items-center gap-2">
            <ChefHat className="text-primary" size={28} />
            <div>
              <h1 className="font-serif text-xl font-bold text-secondary leading-tight">Kitchen Display</h1>
              <p className="text-xs text-muted">Tap to advance: PENDING → PREPARING → READY → SERVED</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-muted hidden sm:block" />
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                filter === s ? 'bg-primary text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {s === 'ALL' ? 'All orders' : s}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="text-center py-20 text-muted font-medium">Loading tickets…</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted">
            <Layers size={56} className="opacity-30 mb-4" />
            <p className="font-serif text-xl text-secondary">No orders in this view</p>
          </div>
        ) : (
          <div className="space-y-10 max-w-[1600px] mx-auto">
            {grouped.map(([tableKey, { tableNumber, orders: tableOrders }]) => (
              <section key={tableKey}>
                <h2 className="text-lg font-serif font-bold text-secondary mb-4 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-2xl text-sm font-black ${
                      tableKey === 'none' ? 'bg-orange-500 text-white' : 'bg-primary text-white'
                    }`}
                  >
                    {tableKey === 'none' ? 'WEB' : tableNumber}
                  </span>
                  {tableKey === 'none' ? 'Online, delivery & partners' : `Table ${tableNumber}`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {tableOrders.map((order) => (
                      <motion.article
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`rounded-2xl border-2 shadow-sm p-4 flex flex-col gap-3 ${statusStyle(order.status)}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Order</p>
                            <p className="font-mono text-xs opacity-70">{order.id.slice(-8)}</p>
                            {!order.tableId ? (
                              <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-500/25 text-orange-900 border border-orange-400/50">
                                {onlineSourceLabel(order.orderType || '')}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase opacity-80">{order.status}</p>
                            <p className="text-sm font-black">
                              {formatElapsed(now - new Date(order.createdAt).getTime())}
                            </p>
                            <p className="text-[10px] opacity-70">since placed</p>
                          </div>
                        </div>

                        <ul className="space-y-2 text-sm font-semibold">
                          {order.items?.map((it: any) => (
                            <li key={it.id} className="flex justify-between gap-2 border-b border-black/5 pb-1 last:border-0">
                              <span className="truncate">{it.name}</span>
                              <span className="tabular-nums whitespace-nowrap">×{it.quantity}</span>
                            </li>
                          ))}
                        </ul>

                        {order.status !== 'SERVED' ? (
                          <button
                            type="button"
                            disabled={advanceMutation.isPending}
                            onClick={() => onAdvance(order.id)}
                            className="mt-auto w-full py-3 rounded-xl bg-secondary text-white text-sm font-bold uppercase tracking-wide hover:bg-stone-800 transition-colors disabled:opacity-50"
                          >
                            Advance to{' '}
                            {order.status === 'PENDING'
                              ? 'PREPARING'
                              : order.status === 'PREPARING'
                                ? 'READY'
                                : 'SERVED'}
                          </button>
                        ) : (
                          <p className="text-center text-xs font-bold uppercase py-2 opacity-80">
                            Waiting for billing
                          </p>
                        )}
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenDisplay;
