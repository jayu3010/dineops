import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ScrollText, CheckCircle2, 
  Trash2, Plus, Minus, Search, Loader2, 
  LayoutGrid, Receipt, CalendarCheck, Printer
} from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const POS = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const restaurantId = user?.restaurantId;

  // Clear cart when table changes
  useEffect(() => {
    setCurrentOrder([]);
  }, [selectedTable?.id]);

  // Fetch Tables
  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/tables/all/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId
  });

  // Fetch Menu
  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/menu/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId
  });

  // Fetch Active Orders
  const { data: activeOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', restaurantId, 'pending'],
    queryFn: async () => {
      const res = await api.get(`/orders/restaurant/${restaurantId}`);
      return res.data.data.filter((o: any) => o.status === 'PENDING');
    },
    enabled: !!restaurantId
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => api.post('/orders', { ...orderData, restaurantId: user?.restaurantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order placed successfully');
      setSelectedTable(null);
      setCurrentOrder([]);
    }
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/tables/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] })
  });

  const settleBillMutation = useMutation({
    mutationFn: async (orderId: string) => api.patch(`/orders/${orderId}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const addToOrder = (item: any) => {
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromOrder = (itemId: string) => {
    setCurrentOrder(prev => prev.filter(i => i.menuItemId !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.menuItemId === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% GST
  const totalAmount = subtotal + tax;

  const handlePlaceOrder = () => {
    if (currentOrder.length === 0) return toast.error('Add items to order first');
    createOrderMutation.mutate({
      restaurantId,
      tableId: selectedTable.id,
      items: currentOrder,
      orderType,
      customerDetails: { name: customerName, phone: customerPhone },
      totalAmount
    });
  };

  const tablePendingOrders = activeOrders?.filter((o: any) => o.tableId === selectedTable?.id) || [];
  const tablePendingTotal = tablePendingOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);

  const handleSettleBills = async () => {
    try {
      for (const order of tablePendingOrders) {
        await settleBillMutation.mutateAsync(order.id);
      }
      toast.success('Bills settled and table freed!');
      setSelectedTable(null);
    } catch (e) {
      toast.error('Failed to settle bills');
    }
  };

  if (isLoadingTables || isLoadingMenu || isLoadingOrders) return <div className="p-8 text-center mt-20"><Loader2 className="animate-spin inline-block mr-2" /> Initializing POS...</div>;

  return (
    <div className="flex h-[calc(100vh-80px)] bg-stone-50 overflow-hidden">
      {/* Tables Grid Section */}
      <div className="w-1/3 border-r border-stone-200 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
            <LayoutGrid size={20} className="text-primary" /> Table Overview
          </h2>
          <span className="text-[10px] font-bold text-muted bg-stone-200 px-2 py-0.5 rounded-full uppercase tracking-widest">
            {tables?.length || 0} Tables
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {tables?.map((table: any) => (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`
                p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 relative
                ${selectedTable?.id === table.id ? 'border-primary bg-orange-50 shadow-lg shadow-primary/10' : 'border-white bg-white shadow-sm hover:border-stone-200'}
              `}
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center font-black text-lg
                ${table.status === 'AVAILABLE' ? 'bg-green-100 text-green-600' : table.status === 'OCCUPIED' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}
              `}>
                {table.tableNumber}
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Cap: {table.capacity}</span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${table.status === 'AVAILABLE' ? 'text-green-500' : table.status === 'OCCUPIED' ? 'text-red-500' : 'text-orange-500'}`}>
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

      {/* order & Menu Section */}
      <div className="flex-1 flex flex-col">
        {selectedTable ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Menu Picker */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex gap-4 items-center mb-6">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />
                  <input 
                    type="text" 
                    placeholder="Search menu items..." 
                    className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Menu Categories */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!activeCategory ? 'bg-secondary text-white' : 'bg-white text-stone-500 shadow-sm'}`}
                >
                  All
                </button>
                {menuData?.map((cat: any) => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-secondary text-white' : 'bg-white text-stone-500 shadow-sm'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {menuData?.flatMap((cat: any) => 
                  (!activeCategory || activeCategory === cat.id) 
                    ? cat.items.filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item: any) => (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            key={item.id}
                            onClick={() => addToOrder(item)}
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

            {/* Bill Summary */}
            <div className="w-80 bg-white border-l border-stone-200 flex flex-col">
              <div className="p-6 border-b border-stone-100">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <Receipt size={18} className="text-primary" /> Table {selectedTable.tableNumber} Order
                </h3>
                <div className="flex gap-2 mt-4">
                   <button 
                    onClick={() => updateTableStatusMutation.mutate({ id: selectedTable.id, status: 'RESERVED' })}
                    className="flex-1 py-1 text-[9px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 rounded-lg border border-orange-100"
                  >
                    Mark Reserved
                  </button>
                   <button 
                    onClick={() => {
                      if (window.confirm('Reset this table to AVAILABLE status?')) {
                        updateTableStatusMutation.mutate({ id: selectedTable.id, status: 'AVAILABLE' });
                      }
                    }}
                    className="flex-1 py-1 text-[9px] font-black uppercase tracking-widest bg-stone-50 text-stone-400 rounded-lg border border-stone-100 hover:bg-stone-100"
                  >
                    Reset Status
                  </button>
                </div>
              </div>

              {tablePendingOrders.length > 0 && (
                <div className="p-4 bg-orange-50 border-b border-orange-100 m-4 rounded-xl">
                  <h4 className="font-bold text-orange-800 text-sm">Active Orders ({tablePendingOrders.length})</h4>
                  <p className="text-sm text-secondary font-black mb-3">Total Unpaid: ₹{tablePendingTotal}</p>
                  <button onClick={handleSettleBills} disabled={settleBillMutation.isPending} className="w-full btn-primary bg-orange-500 hover:bg-orange-600 border-none text-white text-xs py-2">
                    {settleBillMutation.isPending ? 'Settling...' : 'Settle Bills & Free Table'}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-0 mt-4">
                {currentOrder.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-300 opacity-50 text-center">
                    <ScrollText size={48} className="mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">Cart is empty</p>
                  </div>
                ) : (
                  currentOrder.map((item) => (
                    <div key={item.menuItemId} className="flex justify-between items-center group">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-secondary truncate w-32">{item.name}</p>
                        <p className="text-[10px] text-stone-400 font-bold tracking-widest">₹{item.price} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.menuItemId, -1)} className="p-1 rounded-md bg-stone-100 text-stone-500 hover:bg-stone-200">
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-black text-secondary w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.menuItemId, 1)} className="p-1 rounded-md bg-stone-100 text-stone-500 hover:bg-stone-200">
                          <Plus size={12} />
                        </button>
                        <button onClick={() => removeFromOrder(item.menuItemId)} className="p-1 ml-1 text-stone-300 hover:text-danger group-hover:opacity-100">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-stone-50 space-y-4">
                {/* Order Details & Summary */}
                <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
                   <div className="flex gap-2">
                     <select 
                       value={orderType} 
                       onChange={(e) => setOrderType(e.target.value)}
                       className="w-full text-xs font-bold bg-stone-100 rounded-lg p-2 border-none outline-none text-stone-600"
                     >
                       <option value="DINE_IN">Dine In</option>
                       <option value="TAKEAWAY">Takeaway</option>
                       <option value="DELIVERY">Delivery</option>
                     </select>
                   </div>
                   <div className="flex gap-2">
                     <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-1/2 text-xs bg-stone-100 rounded-lg p-2 border-none text-stone-600 outline-none" />
                     <input type="text" placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-1/2 text-xs bg-stone-100 rounded-lg p-2 border-none text-stone-600 outline-none" />
                   </div>
                   <div className="pt-2 border-t border-stone-100 space-y-1">
                     <div className="flex justify-between text-xs font-bold text-stone-500">
                       <span>Subtotal</span>
                       <span>₹{subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-xs font-bold text-stone-500">
                       <span>Taxes (5% GST)</span>
                       <span>₹{tax.toFixed(2)}</span>
                     </div>
                   </div>
                   <div className="flex justify-between items-end pt-2 border-t border-stone-100">
                     <div className="flex flex-col">
                       <span className="font-bold text-stone-400 text-xs uppercase tracking-widest">Total Amount</span>
                       <span className="text-2xl font-black text-secondary">₹{totalAmount.toFixed(2)}</span>
                     </div>
                     {totalAmount > 0 && (
                       <button className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors" title="Print Kot/Bill">
                         <Printer size={20} />
                       </button>
                     )}
                   </div>
                </div>
                
                <button 
                  disabled={currentOrder.length === 0}
                  onClick={handlePlaceOrder}
                  className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 shine"
                >
                  <CheckCircle2 size={20} /> Send Order to Kitchen
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
             <div className="p-10 rounded-full bg-white shadow-xl mb-6">
                <LayoutGrid size={80} className="opacity-20" />
             </div>
             <p className="text-xl font-serif font-bold text-secondary">Select a Table to Start</p>
             <p className="text-sm mt-1 max-w-xs text-center">Manage reservations, take orders, and generate bills from here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;
