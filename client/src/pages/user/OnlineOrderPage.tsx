import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, Utensils } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  isAvailable: boolean;
};

type MenuCategory = { id: string; name: string; items: MenuItem[] };

type CartLine = { menuItemId: string; name: string; price: number; quantity: number };

const OnlineOrderPage = () => {
  const { tenantId } = useParams();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: restaurant, isLoading: loadingRest } = useQuery({
    queryKey: ['restaurant', tenantId],
    queryFn: async () => {
      const res = await api.get(`/restaurants/public/${tenantId}`);
      return res.data.data as { id: string; name: string; logo?: string | null; cuisine: string; city: string };
    },
    enabled: !!tenantId
  });

  const restaurantId = restaurant?.id;

  const { data: menu = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/menu/${restaurantId}`);
      return res.data.data as MenuCategory[];
    },
    enabled: !!restaurantId
  });

  const flatItems = useMemo(() => {
    const list: MenuItem[] = [];
    for (const c of menu) {
      for (const it of c.items || []) {
        if (it.isAvailable) list.push(it);
      }
    }
    return list;
  }, [menu]);

  const addToCart = (it: MenuItem) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === it.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [...prev, { menuItemId: it.id, name: it.name, price: it.price, quantity: 1 }];
    });
    toast.success(`Added ${it.name}`);
  };

  const setQty = (menuItemId: string, qty: number) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: qty } : l)));
  };

  const subtotal = useMemo(
    () => Math.round(cart.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100,
    [cart]
  );
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round(subtotal + gst);

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/orders/public/${tenantId}`, {
        items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Order received! The restaurant will confirm it, then the kitchen will start.');
      setCart([]);
      setCheckoutOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not place order');
    }
  });

  if (!tenantId) {
    return (
      <div className="p-12 text-center text-muted">
        Invalid link. <Link to="/explore" className="text-primary font-bold">Explore restaurants</Link>
      </div>
    );
  }

  if (loadingRest) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-12 text-center">
        <p className="text-xl font-serif font-bold text-secondary mb-4">Restaurant not found</p>
        <Link to="/explore" className="text-primary font-bold">Back to explore</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light pb-24">
      <div className="bg-stone-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <Link
              to={`/restaurant/${tenantId}`}
              className="mt-1 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Order online</p>
              <h1 className="text-3xl font-serif font-bold">{restaurant.name}</h1>
              <p className="text-white/70 text-sm mt-1">
                {restaurant.cuisine} · {restaurant.city}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 disabled:opacity-40 disabled:shadow-none"
          >
            <ShoppingBag size={20} />
            Cart ({cart.reduce((n, l) => n + l.quantity, 0)}) · ₹{total.toLocaleString('en-IN')}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loadingMenu ? (
          <p className="text-muted text-center py-16">Loading menu…</p>
        ) : flatItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-100">
            <Utensils className="mx-auto text-stone-300 mb-4" size={48} />
            <p className="font-serif text-xl text-secondary">No dishes available to order right now</p>
          </div>
        ) : (
          <div className="space-y-10">
            {menu.map((cat) => {
              const items = (cat.items || []).filter((i) => i.isAvailable);
              if (!items.length) return null;
              return (
                <section key={cat.id}>
                  <h2 className="text-2xl font-serif font-bold text-secondary mb-4">{cat.name}</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {items.map((it) => (
                      <div
                        key={it.id}
                        className="flex gap-4 p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-primary/30 transition-colors"
                      >
                        <div className="w-20 h-20 rounded-xl bg-stone-100 shrink-0 overflow-hidden">
                          {it.image ? (
                            <img src={it.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <Utensils size={28} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-secondary">{it.name}</h3>
                          {it.description ? (
                            <p className="text-xs text-muted line-clamp-2 mt-1">{it.description}</p>
                          ) : null}
                          <div className="flex items-center justify-between gap-2 mt-3">
                            <span className="text-primary font-black">₹{Number(it.price).toFixed(0)}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(it)}
                              className="text-xs font-bold uppercase tracking-wide bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {checkoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            onClick={() => !placeOrder.isPending && setCheckoutOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 id="checkout-title" className="text-xl font-serif font-bold text-secondary">
                  Your order
                </h2>
                <button
                  type="button"
                  className="text-sm font-bold text-muted hover:text-secondary"
                  onClick={() => setCheckoutOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="p-6 space-y-4">
                {cart.map((line) => (
                  <div key={line.menuItemId} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-secondary truncate">{line.name}</p>
                      <p className="text-xs text-muted">₹{line.price} each</p>
                    </div>
                    <div className="flex items-center gap-1 border border-stone-200 rounded-lg">
                      <button
                        type="button"
                        className="p-2 hover:bg-stone-50"
                        onClick={() => setQty(line.menuItemId, line.quantity - 1)}
                        aria-label="Decrease"
                      >
                        {line.quantity <= 1 ? <Trash2 size={16} className="text-danger" /> : <Minus size={16} />}
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        className="p-2 hover:bg-stone-50"
                        onClick={() => setQty(line.menuItemId, line.quantity + 1)}
                        aria-label="Increase"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className="text-sm font-bold tabular-nums w-16 text-right">
                      ₹{Math.round(line.price * line.quantity)}
                    </span>
                  </div>
                ))}

                <div className="pt-4 border-t border-stone-100 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Subtotal</span>
                    <span className="tabular-nums">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">GST (5%)</span>
                    <span className="tabular-nums">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-secondary pt-2">
                    <span>Total</span>
                    <span className="tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <input
                    className="input-field w-full"
                    placeholder="Your name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <input
                    className="input-field w-full"
                    placeholder="Phone (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <textarea
                    className="input-field w-full min-h-[80px] resize-y"
                    placeholder="Delivery address or pickup notes (optional)"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  disabled={placeOrder.isPending || cart.length === 0}
                  onClick={() => placeOrder.mutate()}
                  className="w-full btn-primary py-4 rounded-xl font-bold text-lg disabled:opacity-50"
                >
                  {placeOrder.isPending ? 'Sending…' : 'Place order'}
                </button>
                <p className="text-xs text-muted text-center">
                  Pay at pickup or as arranged with the restaurant. This sends the order to their kitchen display.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnlineOrderPage;
