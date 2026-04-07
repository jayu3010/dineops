import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScrollText,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Search,
  Loader2,
  LayoutGrid,
  Receipt,
  CalendarCheck,
  Printer,
  ChefHat,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { sortTablesByNumber } from '../../utils/sortTables';

type CartLine = { menuItemId: string; name: string; price: number; quantity: number };

const POS = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billOpen, setBillOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [billDiscountType, setBillDiscountType] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [billDiscountValue, setBillDiscountValue] = useState(0);

  const restaurantId = user?.restaurantId;

  useEffect(() => {
    setCart([]);
  }, [selectedTable?.id]);

  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/tables/all/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId
  });

  const tablesSorted = useMemo(
    () => (tables?.length ? sortTablesByNumber(tables) : []),
    [tables]
  );

  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/menu/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId
  });

  const { data: activeOrder, isLoading: isLoadingActive } = useQuery({
    queryKey: ['order-active', selectedTable?.id],
    queryFn: async () => {
      const res = await api.get(`/orders/table/${selectedTable.id}/active`);
      return res.data.data;
    },
    enabled: !!selectedTable?.id
  });

  useEffect(() => {
    if (!activeOrder) return;
    const dt = activeOrder.discountType;
    if (dt === 'PERCENT' || dt === 'FIXED') {
      setBillDiscountType(dt);
      setBillDiscountValue(Number(activeOrder.discountValue) || 0);
    } else {
      setBillDiscountType('NONE');
      setBillDiscountValue(0);
    }
  }, [activeOrder?.id, activeOrder?.discountType, activeOrder?.discountValue]);

  const discountMutation = useMutation({
    mutationFn: () =>
      api.patch(`/orders/${activeOrder!.id}/discount`, {
        discountType: billDiscountType === 'NONE' ? 'NONE' : billDiscountType,
        discountValue: billDiscountType === 'NONE' ? 0 : billDiscountValue
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-active'] });
      toast.success('Discount updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Could not apply discount')
  });

  const createOrderMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/orders', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['order-active'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      toast.success('Sent to kitchen');
      setCart([]);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create order';
      toast.error(msg);
    }
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: CartLine[] }) =>
      api.patch(`/orders/${orderId}/items`, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['order-active'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      toast.success('Items added to kitchen order');
      setCart([]);
    },
    onError: () => toast.error('Could not add items')
  });

  const payMutation = useMutation({
    mutationFn: () =>
      api.patch(`/orders/${activeOrder.id}/pay`, {
        paymentMode,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['order-active'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Payment recorded. Table is available.');
      setBillOpen(false);
      setSelectedTable(null);
    },
    onError: () => toast.error('Payment failed')
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/tables/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] })
  });

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.menuItemId !== menuItemId) return item;
        const q = Math.max(1, item.quantity + delta);
        return { ...item, quantity: q };
      })
    );
  };

  const cartSubtotal = useMemo(
    () => Math.round(cart.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100,
    [cart]
  );
  const cartGst = Math.round(cartSubtotal * 0.05 * 100) / 100;
  /** Match server: final bill rounded to whole rupees */
  const cartTotal = Math.round(cartSubtotal + cartGst);

  const fmtRupees = (n: number) =>
    `₹${Math.round(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const orderTypeLabel = (t: string) =>
    ({ DINE_IN: 'Dine in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery' } as Record<string, string>)[t] || t;

  const handleSendToKitchen = () => {
    if (cart.length === 0) return toast.error('Add items to the cart first');
    if (!restaurantId || !selectedTable?.id) return;

    const payload = {
      restaurantId,
      tableId: selectedTable.id,
      items: cart.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      orderType,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined
    };

    if (activeOrder?.id) {
      addItemsMutation.mutate({ orderId: activeOrder.id, items: cart });
    } else {
      createOrderMutation.mutate(payload);
    }
  };

  const receiptDateTimeStr = (d: Date) =>
    d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

  const buildThermalItemHtml = (order: { items?: any[] } | null | undefined) => {
    if (!order?.items?.length) return '';
    return order.items
      .map((it: any) => {
        const line = Number(it.price) * Number(it.quantity);
        const qty = Number(it.quantity) || 1;
        const unit = Number(it.price) || 0;
        const sub =
          qty > 1
            ? `<div class="sub">x${qty} @ ₹${unit.toFixed(2)}</div>`
            : '';
        return `<div class="item"><div class="row"><span class="name">${escapeHtml(it.name)}</span><span class="amt">₹${line.toFixed(2)}</span></div>${sub}</div>`;
      })
      .join('');
  };

  const buildBarcodeStyle = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const bars: string[] = [];
    for (let i = 0; i < 48; i++) {
      const w = 1 + ((h >> (i % 24)) & 3);
      bars.push(`<span style="width:${w}px"></span>`);
      h = (h * 1103515245 + 12345) >>> 0;
    }
    return bars.join('');
  };

  const handlePrint = () => {
    if (!activeOrder || !selectedTable) return;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Allow pop-ups to print the bill');
      return;
    }
    const outlet = activeOrder.restaurant || user?.restaurant;
    const bizName = escapeHtml(outlet?.name || 'Restaurant');
    const addrLine = [outlet?.address, outlet?.city].filter(Boolean).join(', ');
    const gstin = outlet?.gstin ? escapeHtml(String(outlet.gstin)) : '';
    const fssai = outlet?.fssai ? escapeHtml(String(outlet.fssai)) : '';
    const custName = customerName || activeOrder.customerName || '';
    const custPhone = customerPhone || activeOrder.customerPhone || '';
    const da = Number(activeOrder.discountAmount) || 0;
    const preDisc = Math.round(Number(activeOrder.subtotal) + Number(activeOrder.gstAmount));
    let discDetail = '';
    if (da > 0) {
      if (activeOrder.discountType === 'PERCENT' && Number(activeOrder.discountValue) > 0) {
        discDetail = `<div class="sub">DISC. ${Number(activeOrder.discountValue)}% @ ₹${preDisc}</div>`;
      } else if (activeOrder.discountType === 'FIXED') {
        discDetail = `<div class="sub">DISC. (flat off) @ ₹${preDisc}</div>`;
      }
    }
    const discRow =
      da > 0
        ? `<div class="row"><span>DISCOUNT</span><span>−₹${Math.round(da).toLocaleString('en-IN')}</span></div>${discDetail}`
        : '';
    const cashier = escapeHtml(user?.name || 'Staff');
    const when = receiptDateTimeStr(new Date(activeOrder.createdAt));
    const itemsHtml = buildThermalItemHtml(activeOrder);
    const barcodeSpans = buildBarcodeStyle(activeOrder.id);

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body {
          font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
          font-size: 11px;
          line-height: 1.35;
          color: #111;
          max-width: 72mm;
          margin: 0 auto;
          padding: 8px 6px 16px;
        }
        .center { text-align: center; }
        .biz { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 4px; }
        .small { font-size: 10px; color: #333; }
        .hr {
          border: none;
          border-top: 1px dashed #000;
          margin: 8px 0;
          opacity: 0.85;
        }
        .title { font-weight: 700; margin: 4px 0; }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          margin: 2px 0;
        }
        .row .name { flex: 1; min-width: 0; word-break: break-word; padding-right: 4px; }
        .row .amt { flex-shrink: 0; text-align: right; white-space: nowrap; }
        .item { margin-bottom: 6px; }
        .sub {
          padding-left: 10px;
          font-size: 10px;
          color: #333;
          margin-top: 2px;
        }
        .items-head { font-weight: 700; margin: 6px 0 4px; letter-spacing: 0.05em; }
        .total { font-weight: 800; font-size: 12px; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #000; }
        .footer { text-align: center; margin-top: 14px; font-weight: 700; font-size: 10px; letter-spacing: 0.06em; }
        .barcode {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 0;
          height: 36px;
          margin: 12px auto 4px;
          max-width: 200px;
        }
        .barcode span { display: inline-block; background: #000; align-self: flex-end; height: 100%; }
        .barcode span:nth-child(odd) { height: 85%; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="center biz">${bizName}</div>
      ${addrLine ? `<div class="center small">${escapeHtml(addrLine)}</div>` : ''}
      ${gstin ? `<div class="center small">GSTIN: ${gstin}</div>` : ''}
      ${fssai ? `<div class="center small">FSSAI: ${fssai}</div>` : ''}
      <div class="hr"></div>
      <div class="center title">*** TAX INVOICE ***</div>
      <div class="hr"></div>
      <div class="row"><span>CASHIER ${cashier}</span><span>${escapeHtml(when)}</span></div>
      <div class="row"><span>TABLE ${escapeHtml(String(selectedTable.tableNumber))}</span><span>${escapeHtml(orderTypeLabel(activeOrder.orderType || 'DINE_IN'))}</span></div>
      <div class="row small"><span>ORDER</span><span>${escapeHtml(activeOrder.id.slice(-10))}</span></div>
      ${custName ? `<div class="row small"><span>CUST</span><span>${escapeHtml(custName)}</span></div>` : ''}
      ${custPhone ? `<div class="row small"><span>PHONE</span><span>${escapeHtml(custPhone)}</span></div>` : ''}
      <div class="hr"></div>
      <div class="items-head">ITEM</div>
      ${itemsHtml}
      <div class="hr"></div>
      <div class="row"><span>SUBTOTAL</span><span>₹${Number(activeOrder.subtotal).toFixed(2)}</span></div>
      <div class="row"><span>GST (5%)</span><span>₹${Number(activeOrder.gstAmount).toFixed(2)}</span></div>
      ${discRow}
      <div class="row total"><span>TOTAL AMOUNT</span><span>₹${Math.round(activeOrder.totalAmount || 0).toLocaleString('en-IN')}</span></div>
      <div class="hr"></div>
      <div class="row"><span>PAY MODE</span><span>${escapeHtml(paymentMode)}</span></div>
      <div class="row"><span>AMOUNT DUE</span><span>₹${Math.round(activeOrder.totalAmount || 0).toLocaleString('en-IN')}</span></div>
      <div class="hr"></div>
      <div class="footer">THANK YOU FOR DINING WITH US!</div>
      <div class="barcode" aria-hidden="true">${barcodeSpans}</div>
      <div class="center small" style="margin-top:2px">${escapeHtml(activeOrder.id.slice(-12))}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => {
      w.print();
      w.close();
    }, 200);
  };

  const handlePrintKOT = () => {
    if (!activeOrder || !selectedTable) return;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Allow pop-ups to print KOT');
      return;
    }
    const outlet = activeOrder.restaurant || user?.restaurant;
    const kotRows =
      activeOrder.items
        ?.map(
          (it: any) =>
            `<tr><td>${escapeHtml(it.name)}</td><td style="text-align:right;font-weight:700">${it.quantity}</td></tr>`
        )
        .join('') || '';
    const kotTitle = escapeHtml(outlet?.name || 'Kitchen');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>KOT</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:360px;margin:0 auto;color:#1c1917}
      h1{font-size:18px;margin:0 0 8px} .muted{color:#78716c;font-size:13px} table{width:100%;border-collapse:collapse;margin:12px 0;font-size:15px}
      th{text-align:left;border-bottom:2px solid #1c1917;padding:6px 0} td{padding:8px 0;border-bottom:1px solid #e7e5e4}</style></head><body>
      <h1>KOT — ${kotTitle}</h1>
      <p class="muted">Table <strong>${escapeHtml(String(selectedTable.tableNumber))}</strong> · ${escapeHtml(orderTypeLabel(activeOrder.orderType || 'DINE_IN'))}</p>
      <p class="muted">${new Date(activeOrder.createdAt).toLocaleString('en-IN')}</p>
      <p class="muted">Order #${escapeHtml(activeOrder.id.slice(-8))}</p>
      <table><thead><tr><th>Item</th><th style="text-align:right">Qty</th></tr></thead><tbody>${kotRows}</tbody></table>
      </body></html>`);
    w.document.close();
    setTimeout(() => {
      w.print();
      w.close();
    }, 200);
  };

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-900 border-amber-300',
      PREPARING: 'bg-blue-100 text-blue-900 border-blue-300',
      READY: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      SERVED: 'bg-stone-200 text-stone-800 border-stone-400'
    };
    return map[status] || 'bg-stone-100 text-stone-800';
  };

  const billOutlet = billOpen && activeOrder ? activeOrder.restaurant || user?.restaurant : null;
  const preDiscPreview =
    billOpen && activeOrder
      ? Math.round(Number(activeOrder.subtotal) + Number(activeOrder.gstAmount))
      : 0;

  if (isLoadingTables || isLoadingMenu) {
    return (
      <div className="p-8 text-center mt-20">
        <Loader2 className="animate-spin inline-block mr-2" /> Initializing POS…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-stone-50 overflow-hidden">
      <div className="flex flex-1 w-full h-full min-h-0">
        {/* Tables */}
        <div className="w-1/3 border-r border-stone-200 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
              <LayoutGrid size={20} className="text-primary" /> Table overview
            </h2>
            <Link
              to="/kitchen"
              className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1 hover:underline"
            >
              <ChefHat size={14} /> Kitchen
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {tablesSorted.map((table: any) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`
                p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative
                ${
                  selectedTable?.id === table.id
                    ? 'border-primary bg-orange-50 shadow-lg shadow-primary/10'
                    : 'border-white bg-white shadow-sm hover:border-stone-200'
                }
              `}
              >
                <div
                  className={`
                w-12 h-12 rounded-full flex items-center justify-center font-black text-lg
                ${
                  table.status === 'AVAILABLE'
                    ? 'bg-green-100 text-green-600'
                    : table.status === 'OCCUPIED'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-orange-100 text-orange-600'
                }
              `}
                >
                  {table.tableNumber}
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                    Cap: {table.capacity}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      table.status === 'AVAILABLE'
                        ? 'text-green-500'
                        : table.status === 'OCCUPIED'
                          ? 'text-red-500'
                          : 'text-orange-500'
                    }`}
                  >
                    {table.status}
                  </span>
                </div>
                {table.status === 'RESERVED' && (
                  <div className="absolute top-2 right-2 text-orange-500">
                    <CalendarCheck size={14} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedTable ? (
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Menu */}
              <div className="flex-1 p-6 overflow-y-auto min-w-0">
                <div className="flex gap-4 items-center mb-6">
                  <div className="flex-1 relative">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"
                    />
                    <input
                      type="text"
                      placeholder="Search menu items…"
                      className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      !activeCategory ? 'bg-secondary text-white' : 'bg-white text-stone-500 shadow-sm'
                    }`}
                  >
                    All
                  </button>
                  {menuData?.map((cat: any) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        activeCategory === cat.id ? 'bg-secondary text-white' : 'bg-white text-stone-500 shadow-sm'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuData?.flatMap((cat: any) =>
                    !activeCategory || activeCategory === cat.id
                      ? cat.items
                          .filter((item: any) =>
                            item.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((item: any) => (
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              key={item.id}
                              type="button"
                              onClick={() => addToCart(item)}
                              className="bg-white p-4 rounded-3xl shadow-sm hover:shadow-md border border-stone-100 flex flex-col items-start gap-2 text-left"
                            >
                              <span className="font-bold text-secondary">{item.name}</span>
                              <div className="flex justify-between w-full items-center">
                                <span className="text-primary font-black text-sm">₹{item.price}</span>
                                <div className="p-1 bg-primary/10 rounded-full text-primary">
                                  <Plus size={14} />
                                </div>
                              </div>
                            </motion.button>
                          ))
                      : []
                  )}
                </div>
              </div>

              {/* Right panel */}
              <div className="w-80 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col min-h-0">
                <div className="p-6 border-b border-stone-100 flex-shrink-0">
                  <h3 className="font-bold text-secondary flex items-center gap-2">
                    <Receipt size={18} className="text-primary" /> Table {selectedTable.tableNumber}
                  </h3>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        updateTableStatusMutation.mutate({ id: selectedTable.id, status: 'RESERVED' })
                      }
                      className="flex-1 py-1 text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 rounded-lg border border-orange-100"
                    >
                      Mark reserved
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Reset this table to AVAILABLE?')) {
                          updateTableStatusMutation.mutate({ id: selectedTable.id, status: 'AVAILABLE' });
                        }
                      }}
                      className="flex-1 py-1 text-[9px] font-black uppercase tracking-widest bg-stone-50 text-stone-400 rounded-lg border border-stone-100 hover:bg-stone-100"
                    >
                      Reset status
                    </button>
                  </div>
                </div>

                {isLoadingActive ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : activeOrder ? (
                  <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 space-y-2 flex-shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-stone-500">Kitchen status</span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${statusBadge(activeOrder.status)}`}
                      >
                        {activeOrder.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Order #{activeOrder.id.slice(-6)} · Placed{' '}
                      {new Date(activeOrder.createdAt).toLocaleTimeString('en-IN')}
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {activeOrder.items?.map((it: any) => (
                        <div key={it.id} className="flex justify-between gap-2">
                          <span className="truncate font-medium">{it.name}</span>
                          <span className="tabular-nums text-stone-600">
                            ×{it.quantity} ₹{(it.price * it.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-black">
                      <span>Order total</span>
                      <span className="text-primary">{fmtRupees(activeOrder.totalAmount || 0)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePrintKOT}
                        className="btn-secondary py-3 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Printer size={16} /> Print KOT
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillOpen(true)}
                        className="btn-primary py-3 text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <FileText size={16} /> Bill
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    New items (cart)
                  </p>
                  {cart.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-stone-300 opacity-60 text-center">
                      <ScrollText size={40} className="mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Cart is empty</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.menuItemId} className="flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-secondary truncate">{item.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold tracking-widest">
                            ₹{item.price} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.menuItemId, -1)}
                            className="p-1 rounded-md bg-stone-100 text-stone-500 hover:bg-stone-200"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-black text-secondary w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.menuItemId, 1)}
                            className="p-1 rounded-md bg-stone-100 text-stone-500 hover:bg-stone-200"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="p-1 ml-1 text-stone-300 hover:text-danger"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-6 bg-stone-50 space-y-4 flex-shrink-0 border-t border-stone-100">
                  <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="w-full text-xs font-bold bg-stone-100 rounded-lg p-2 border-none outline-none text-stone-600"
                    >
                      <option value="DINE_IN">Dine in</option>
                      <option value="TAKEAWAY">Takeaway</option>
                      <option value="DELIVERY">Delivery</option>
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Customer name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-1/2 text-xs bg-stone-100 rounded-lg p-2 border-none text-stone-600 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-1/2 text-xs bg-stone-100 rounded-lg p-2 border-none text-stone-600 outline-none"
                      />
                    </div>
                    <div className="pt-2 border-t border-stone-100 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-stone-500">
                        <span>Cart subtotal</span>
                        <span>₹{cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-stone-500">
                        <span>GST (5%)</span>
                        <span>₹{cartGst.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-stone-100">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-400 text-xs uppercase tracking-widest">
                          Cart total (rounded)
                        </span>
                        <span className="text-xl font-black text-secondary">{fmtRupees(cartTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={cart.length === 0 || createOrderMutation.isPending || addItemsMutation.isPending}
                    onClick={handleSendToKitchen}
                    className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 shine disabled:opacity-50"
                  >
                    <CheckCircle2 size={20} /> Send to kitchen
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
              <div className="p-10 rounded-full bg-white shadow-xl mb-6">
                <LayoutGrid size={80} className="opacity-20" />
              </div>
              <p className="text-xl font-serif font-bold text-secondary">Select a table to start</p>
              <p className="text-sm mt-1 max-w-xs text-center text-stone-400">
                Send orders to the kitchen, track status, and generate bills.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bill modal — wide layout: thermal preview + actions (avoids single tall scrollbar) */}
      {billOpen && activeOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
            <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
              <div className="my-auto w-full max-w-4xl rounded-2xl shadow-2xl border border-orange-100/80 bg-[#FFFBF7] flex flex-col max-h-[min(95dvh,920px)] overflow-hidden">
                <div className="flex-shrink-0 px-4 py-3 sm:px-5 sm:py-4 border-b border-stone-200/80 flex justify-between items-center gap-3 bg-[#FFFBF7]">
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-secondary leading-tight">Bill</h3>
                    <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5">
                      Preview matches thermal print · {receiptDateTimeStr(new Date(activeOrder.createdAt))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBillOpen(false)}
                    className="text-sm font-bold text-stone-500 hover:text-secondary px-3 py-1.5 rounded-lg hover:bg-stone-100"
                  >
                    Close
                  </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                  {/* Thermal-style receipt preview */}
                  <div className="md:w-[52%] flex-shrink-0 border-b md:border-b-0 md:border-r border-stone-200/90 bg-white overflow-y-auto overscroll-contain min-h-0 max-h-[36vh] md:max-h-full md:min-h-[280px]">
                    <div className="p-4 sm:p-5 font-mono text-[11px] leading-snug text-stone-900 max-w-sm mx-auto">
                      <p className="text-center font-bold uppercase tracking-wide text-xs">
                        {billOutlet?.name || 'Restaurant'}
                      </p>
                      {[billOutlet?.address, billOutlet?.city].filter(Boolean).length ? (
                        <p className="text-center text-[10px] text-stone-600 mt-1">
                          {[billOutlet?.address, billOutlet?.city].filter(Boolean).join(', ')}
                        </p>
                      ) : null}
                      {billOutlet?.gstin ? (
                        <p className="text-center text-[10px] text-stone-600 mt-0.5">GSTIN: {billOutlet.gstin}</p>
                      ) : null}
                      {billOutlet?.fssai ? (
                        <p className="text-center text-[10px] text-stone-600">FSSAI: {billOutlet.fssai}</p>
                      ) : null}
                      <div className="border-t border-dashed border-stone-800 my-2 opacity-80" />
                      <p className="text-center font-bold">*** TAX INVOICE ***</p>
                      <div className="border-t border-dashed border-stone-800 my-2 opacity-80" />
                      <div className="flex justify-between gap-2 text-[10px]">
                        <span className="truncate">CASHIER {user?.name || 'Staff'}</span>
                        <span className="flex-shrink-0 whitespace-nowrap">
                          {receiptDateTimeStr(new Date(activeOrder.createdAt))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 text-[10px] mt-0.5">
                        <span>TABLE {selectedTable?.tableNumber}</span>
                        <span>{orderTypeLabel(activeOrder.orderType || 'DINE_IN')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-600 mt-0.5">
                        <span>ORDER</span>
                        <span className="font-mono">{activeOrder.id.slice(-10)}</span>
                      </div>
                      <div className="border-t border-dashed border-stone-800 my-2 opacity-80" />
                      <p className="font-bold text-[10px] tracking-wider mb-1">ITEM</p>
                      <div className="space-y-2">
                        {activeOrder.items?.map((it: any) => (
                          <div key={it.id}>
                            <div className="flex justify-between gap-2">
                              <span className="min-w-0 break-words pr-1">{it.name}</span>
                              <span className="flex-shrink-0 tabular-nums">
                                ₹{(Number(it.price) * Number(it.quantity)).toFixed(2)}
                              </span>
                            </div>
                            {Number(it.quantity) > 1 ? (
                              <p className="pl-2.5 text-[10px] text-stone-600">
                                x{it.quantity} @ ₹{Number(it.price).toFixed(2)}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-dashed border-stone-800 my-2 opacity-80" />
                      <div className="flex justify-between">
                        <span>SUBTOTAL</span>
                        <span className="tabular-nums">₹{Number(activeOrder.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (5%)</span>
                        <span className="tabular-nums">₹{Number(activeOrder.gstAmount).toFixed(2)}</span>
                      </div>
                      {Number(activeOrder.discountAmount) > 0 ? (
                        <>
                          <div className="flex justify-between text-emerald-900">
                            <span>DISCOUNT</span>
                            <span className="tabular-nums">
                              −₹{Math.round(Number(activeOrder.discountAmount))}
                            </span>
                          </div>
                          {activeOrder.discountType === 'PERCENT' &&
                          Number(activeOrder.discountValue) > 0 ? (
                            <p className="pl-2.5 text-[10px] text-stone-600">
                              DISC. {Number(activeOrder.discountValue)}% @ ₹{preDiscPreview}
                            </p>
                          ) : null}
                          {activeOrder.discountType === 'FIXED' ? (
                            <p className="pl-2.5 text-[10px] text-stone-600">
                              DISC. (flat) @ ₹{preDiscPreview}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      <div className="flex justify-between font-extrabold text-xs mt-2 pt-2 border-t border-dashed border-stone-800">
                        <span>TOTAL AMOUNT</span>
                        <span className="tabular-nums text-primary">
                          ₹{Math.round(activeOrder.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-stone-800 my-2 opacity-80" />
                      <div className="flex justify-between text-[10px]">
                        <span>PAY MODE</span>
                        <span>{paymentMode}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>AMOUNT DUE</span>
                        <span className="tabular-nums font-semibold">
                          ₹{Math.round(activeOrder.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-center font-bold text-[10px] tracking-widest mt-4">
                        THANK YOU FOR DINING WITH US!
                      </p>
                      <div
                        className="flex justify-center items-end gap-0 h-8 mt-3 mx-auto max-w-[200px] opacity-90"
                        aria-hidden
                      >
                        {Array.from({ length: 40 }, (_, i) => (
                          <span
                            key={i}
                            className="bg-stone-900 inline-block self-end"
                            style={{
                              width: 1 + ((i * 7) % 4),
                              height: i % 2 ? '70%' : '100%'
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-center text-[9px] text-stone-500 font-mono mt-1">
                        {activeOrder.id.slice(-12)}
                      </p>
                    </div>
                  </div>

                  {/* Actions — compact, single column */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 bg-[#FFFBF7]">
                    <div className="rounded-xl border border-stone-200 bg-stone-50/90 p-3 space-y-2">
                      <label className="text-[10px] font-bold uppercase text-stone-500">Discount</label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          className="input-field text-xs flex-1 min-w-[100px] py-2"
                          value={billDiscountType}
                          onChange={(e) =>
                            setBillDiscountType(e.target.value as 'NONE' | 'PERCENT' | 'FIXED')
                          }
                        >
                          <option value="NONE">None</option>
                          <option value="PERCENT">% off</option>
                          <option value="FIXED">Flat ₹</option>
                        </select>
                        <input
                          type="number"
                          min={0}
                          className="input-field text-xs w-20 py-2"
                          disabled={billDiscountType === 'NONE'}
                          value={billDiscountValue || ''}
                          onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                          placeholder={billDiscountType === 'PERCENT' ? '%' : '₹'}
                        />
                        <button
                          type="button"
                          disabled={discountMutation.isPending || !activeOrder?.id}
                          onClick={() => discountMutation.mutate()}
                          className="px-3 py-2 rounded-lg bg-stone-800 text-white text-xs font-bold hover:bg-stone-900 disabled:opacity-50 shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                          Customer
                        </label>
                        <input
                          className="input-field text-sm py-2 w-full"
                          placeholder="Name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1">
                          Phone
                        </label>
                        <input
                          className="input-field text-sm py-2 w-full"
                          placeholder="Phone"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-stone-500 block mb-1.5">
                        Payment mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['CASH', 'CARD', 'UPI'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMode(m)}
                            className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                              paymentMode === m
                                ? 'border-primary bg-orange-50 text-secondary'
                                : 'border-stone-200 bg-white text-stone-600'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1 mt-auto">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2 text-sm"
                      >
                        <Printer size={18} /> Print receipt
                      </button>
                      <button
                        type="button"
                        disabled={payMutation.isPending}
                        onClick={() => payMutation.mutate()}
                        className="flex-1 btn-primary py-3 text-sm font-bold"
                      >
                        {payMutation.isPending ? 'Saving…' : 'Mark as paid'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default POS;
