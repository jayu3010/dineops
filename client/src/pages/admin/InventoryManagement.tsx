import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Warehouse,
  LayoutDashboard,
  Package,
  BookOpen,
  Scale,
  Truck,
  ClipboardList,
  BarChart3,
  Plus,
  Loader2,
  AlertTriangle,
  Pencil,
  Trash2,
  CheckCircle2,
  IndianRupee
} from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

type TabId = 'dashboard' | 'ingredients' | 'recipes' | 'stock' | 'suppliers' | 'orders' | 'reports';

const UNITS = ['kg', 'L', 'pcs', 'ml'] as const;

const fmtMoney = (n: number) =>
  `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const InventoryManagement = () => {
  const { user } = useAuthStore();
  const restaurantId = user?.restaurantId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('dashboard');

  const [ingModal, setIngModal] = useState(false);
  const [editingIng, setEditingIng] = useState<any>(null);
  const [ingForm, setIngForm] = useState({
    name: '',
    unit: 'kg',
    currentStock: '0',
    minStockAlert: '0',
    costPerUnit: '0',
    supplierId: '',
    category: ''
  });

  const [supModal, setSupModal] = useState(false);
  const [editingSup, setEditingSup] = useState<any>(null);
  const [supForm, setSupForm] = useState({ name: '', phone: '', email: '', address: '', itemsNote: '' });

  const [stockModal, setStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({
    ingredientId: '',
    type: 'IN' as 'IN' | 'WASTE' | 'ADJUST',
    quantity: '',
    note: ''
  });

  const [recipeMenuItemId, setRecipeMenuItemId] = useState<string>('');
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; quantityUsed: string }[]>([]);

  const [poModal, setPoModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poLines, setPoLines] = useState<{ ingredientId: string; quantity: string; unitCost: string }[]>([
    { ingredientId: '', quantity: '1', unitCost: '0' }
  ]);

  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [reportTo, setReportTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['inventory-dashboard', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/inventory/restaurant/${restaurantId}/dashboard`);
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'dashboard'
  });

  const { data: ingredients = [], isLoading: ingLoading } = useQuery({
    queryKey: ['inventory-ingredients', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/inventory/restaurant/${restaurantId}/ingredients`);
      return res.data.data;
    },
    enabled: !!restaurantId && (tab === 'ingredients' || tab === 'stock' || tab === 'recipes' || tab === 'orders')
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory-suppliers', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/inventory/restaurant/${restaurantId}/suppliers`);
      return res.data.data;
    },
    enabled: !!restaurantId && (tab === 'suppliers' || tab === 'ingredients' || tab === 'orders')
  });

  const { data: menuData = [] } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/menu/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'recipes'
  });

  const flatMenuItems = useMemo(() => {
    return (menuData as any[]).flatMap((cat) =>
      (cat.items || []).map((it: any) => ({
        id: it.id,
        label: `${it.name} (${cat.name})`
      }))
    );
  }, [menuData]);

  const { data: recipeData, isLoading: recipeLoading } = useQuery({
    queryKey: ['inventory-recipe', recipeMenuItemId],
    queryFn: async () => {
      const res = await api.get(`/inventory/menu-item/${recipeMenuItemId}/recipe`);
      return res.data.data as any[];
    },
    enabled: !!recipeMenuItemId && tab === 'recipes'
  });

  useEffect(() => {
    setRecipeLines([]);
  }, [recipeMenuItemId]);

  useEffect(() => {
    if (!recipeMenuItemId || !recipeData) return;
    setRecipeLines(
      recipeData.map((r: any) => ({
        ingredientId: r.ingredientId,
        quantityUsed: String(r.quantityUsed)
      }))
    );
  }, [recipeMenuItemId, recipeData]);

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['inventory-pos', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/inventory/restaurant/${restaurantId}/purchase-orders`);
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'orders'
  });

  const { data: txPage, isLoading: txLoading } = useQuery({
    queryKey: ['inventory-tx', restaurantId, tab],
    queryFn: async () => {
      const res = await api.get(`/inventory/restaurant/${restaurantId}/transactions?limit=50`);
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'stock'
  });

  const { data: repConsumption } = useQuery({
    queryKey: ['inventory-rep-cons', restaurantId, reportFrom, reportTo],
    queryFn: async () => {
      const res = await api.get(
        `/inventory/restaurant/${restaurantId}/reports/consumption?from=${reportFrom}&to=${reportTo}`
      );
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'reports'
  });

  const { data: repWastage } = useQuery({
    queryKey: ['inventory-rep-waste', restaurantId, reportFrom, reportTo],
    queryFn: async () => {
      const res = await api.get(
        `/inventory/restaurant/${restaurantId}/reports/wastage?from=${reportFrom}&to=${reportTo}`
      );
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'reports'
  });

  const { data: repCost } = useQuery({
    queryKey: ['inventory-rep-cost', restaurantId, reportFrom, reportTo],
    queryFn: async () => {
      const res = await api.get(
        `/inventory/restaurant/${restaurantId}/reports/cost-analysis?from=${reportFrom}&to=${reportTo}`
      );
      return res.data.data;
    },
    enabled: !!restaurantId && tab === 'reports'
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-dashboard', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['inventory-ingredients', restaurantId] });
  };

  const createIng = useMutation({
    mutationFn: (body: any) => api.post('/inventory/ingredient', body),
    onSuccess: () => {
      invalidateAll();
      toast.success('Ingredient saved');
      setIngModal(false);
      resetIngForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const updateIng = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/inventory/ingredient/${id}`, body),
    onSuccess: () => {
      invalidateAll();
      toast.success('Updated');
      setIngModal(false);
      setEditingIng(null);
      resetIngForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const deleteIng = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/ingredient/${id}`),
    onSuccess: () => {
      invalidateAll();
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  function resetIngForm() {
    setIngForm({
      name: '',
      unit: 'kg',
      currentStock: '0',
      minStockAlert: '0',
      costPerUnit: '0',
      supplierId: '',
      category: ''
    });
  }

  const createSup = useMutation({
    mutationFn: (body: any) => api.post('/inventory/supplier', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers', restaurantId] });
      toast.success('Supplier saved');
      setSupModal(false);
      resetSupForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const updateSup = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/inventory/supplier/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers', restaurantId] });
      toast.success('Updated');
      setSupModal(false);
      setEditingSup(null);
      resetSupForm();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const deleteSup = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/supplier/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers', restaurantId] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  function resetSupForm() {
    setSupForm({ name: '', phone: '', email: '', address: '', itemsNote: '' });
  }

  const adjustStock = useMutation({
    mutationFn: (body: any) => api.post('/inventory/stock/adjust', body),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['inventory-tx', restaurantId] });
      toast.success('Stock updated');
      setStockModal(false);
      setStockForm({ ingredientId: '', type: 'IN', quantity: '', note: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const saveRecipe = useMutation({
    mutationFn: (body: { lines: { ingredientId: string; quantityUsed: number }[] }) =>
      api.put(`/inventory/menu-item/${recipeMenuItemId}/recipe`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-recipe', recipeMenuItemId] });
      toast.success('Recipe saved');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const createPo = useMutation({
    mutationFn: (body: any) => api.post('/inventory/purchase-order', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-pos', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard', restaurantId] });
      toast.success('Purchase order created');
      setPoModal(false);
      setPoLines([{ ingredientId: '', quantity: '1', unitCost: '0' }]);
      setPoSupplierId('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  const receivePo = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory/purchase-order/${id}/receive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-pos', restaurantId] });
      invalidateAll();
      toast.success('Marked as received — stock updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed')
  });

  if (!restaurantId) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-stone-600">Complete restaurant setup first to use inventory.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Warehouse }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ingredients', label: 'Ingredients', icon: Package },
    { id: 'recipes', label: 'Recipes', icon: BookOpen },
    { id: 'stock', label: 'Stock & log', icon: Scale },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'orders', label: 'Purchase orders', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-secondary flex items-center gap-3">
            <Warehouse className="text-primary" size={36} />
            Inventory
          </h1>
          <p className="text-muted text-sm mt-1">Stock, recipes, suppliers, and purchase orders</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              tab === t.id
                ? 'bg-primary text-white shadow-lg shadow-orange-500/20'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-primary/40'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {dashLoading ? (
            <Loader2 className="animate-spin text-primary" />
          ) : dash ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-lg shadow-stone-200/40">
                  <p className="text-sm text-stone-500">Ingredients</p>
                  <p className="text-3xl font-bold text-secondary">{dash.summary.ingredientCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-lg shadow-stone-200/40">
                  <p className="text-sm text-stone-500 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={16} />
                    Low stock
                  </p>
                  <p className="text-3xl font-bold text-red-600">{dash.summary.lowStockCount}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-lg shadow-stone-200/40">
                  <p className="text-sm text-stone-500">Open POs</p>
                  <p className="text-3xl font-bold text-secondary">{dash.summary.pendingPurchaseOrders}</p>
                </div>
              </div>

              {dash.lowStock?.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Low stock alerts
                  </h3>
                  <ul className="space-y-2 text-sm text-red-900">
                    {dash.lowStock.map((i: any) => (
                      <li key={i.id}>
                        <span className="font-semibold">{i.name}</span> — {i.currentStock} {i.unit} (min{' '}
                        {i.minStockAlert})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-lg shadow-stone-200/40">
                <h3 className="font-bold text-secondary px-6 py-4 border-b border-stone-100">Recent movements</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-600">
                      <tr>
                        <th className="text-left px-4 py-2">Time</th>
                        <th className="text-left px-4 py-2">Ingredient</th>
                        <th className="text-left px-4 py-2">Type</th>
                        <th className="text-right px-4 py-2">Qty</th>
                        <th className="text-left px-4 py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dash.recentTransactions?.map((t: any) => (
                        <tr key={t.id} className="border-t border-stone-100">
                          <td className="px-4 py-2 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2">{t.ingredient?.name}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                                t.type === 'OUT'
                                  ? 'bg-orange-100 text-orange-800'
                                  : t.type === 'IN'
                                    ? 'bg-green-100 text-green-800'
                                    : t.type === 'WASTE'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{t.quantity}</td>
                          <td className="px-4 py-2 text-stone-500 truncate max-w-[200px]">{t.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </motion.div>
      )}

      {tab === 'ingredients' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => {
                setEditingIng(null);
                resetIngForm();
                setIngModal(true);
              }}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
            >
              <Plus size={18} /> Add ingredient
            </button>
          </div>
          {ingLoading ? (
            <Loader2 className="animate-spin text-primary" />
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-lg">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr className="text-left text-stone-600">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Min alert</th>
                    <th className="px-4 py-3">Cost / unit</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {(ingredients as any[]).map((i) => (
                    <tr key={i.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-secondary">{i.name}</span>
                        <span className="text-stone-400 text-xs ml-2">{i.unit}</span>
                        {i.currentStock <= i.minStockAlert && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                            LOW
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{i.currentStock}</td>
                      <td className="px-4 py-3 font-mono">{i.minStockAlert}</td>
                      <td className="px-4 py-3">{fmtMoney(i.costPerUnit)}</td>
                      <td className="px-4 py-3 text-stone-600">{i.supplier?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIng(i);
                              setIngForm({
                                name: i.name,
                                unit: i.unit,
                                currentStock: String(i.currentStock),
                                minStockAlert: String(i.minStockAlert),
                                costPerUnit: String(i.costPerUnit),
                                supplierId: i.supplierId || '',
                                category: i.category || ''
                              });
                              setIngModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-stone-100 text-stone-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Delete this ingredient?')) deleteIng.mutate(i.id);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 text-danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'recipes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-semibold text-stone-600 block mb-1">Menu item</label>
              <select
                value={recipeMenuItemId}
                onChange={(e) => setRecipeMenuItemId(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-white"
              >
                <option value="">Select item…</option>
                {flatMenuItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.label}
                  </option>
                ))}
              </select>
            </div>
            {recipeMenuItemId && (
              <button
                type="button"
                onClick={() =>
                  saveRecipe.mutate({
                    lines: recipeLines
                      .filter((l) => l.ingredientId)
                      .map((l) => ({
                        ingredientId: l.ingredientId,
                        quantityUsed: Number(l.quantityUsed) || 0
                      }))
                  })
                }
                disabled={saveRecipe.isPending}
                className="btn-primary px-6 py-2.5 rounded-xl flex items-center gap-2"
              >
                {saveRecipe.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Save recipe
              </button>
            )}
          </div>
          {recipeMenuItemId && (
            <p className="text-sm text-stone-500">
              Quantities are per one serving (e.g. 0.15 kg tomato per plate). POS orders deduct automatically when
              items are ordered.
            </p>
          )}
          {recipeLoading && recipeMenuItemId ? (
            <Loader2 className="animate-spin text-primary" />
          ) : recipeMenuItemId ? (
            <div className="space-y-3">
              {recipeLines.map((row, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center bg-white p-4 rounded-xl border border-stone-100">
                  <select
                    value={row.ingredientId}
                    onChange={(e) => {
                      const next = [...recipeLines];
                      next[idx] = { ...next[idx], ingredientId: e.target.value };
                      setRecipeLines(next);
                    }}
                    className="flex-1 min-w-[200px] border border-stone-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Ingredient…</option>
                    {(ingredients as any[]).map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Qty / serving"
                    value={row.quantityUsed}
                    onChange={(e) => {
                      const next = [...recipeLines];
                      next[idx] = { ...next[idx], quantityUsed: e.target.value };
                      setRecipeLines(next);
                    }}
                    className="w-36 border border-stone-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => setRecipeLines(recipeLines.filter((_, i) => i !== idx))}
                    className="p-2 text-danger hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRecipeLines([...recipeLines, { ingredientId: '', quantityUsed: '1' }])}
                className="text-primary font-semibold text-sm flex items-center gap-1"
              >
                <Plus size={16} /> Add line
              </button>
            </div>
          ) : null}
        </motion.div>
      )}

      {tab === 'stock' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <button
            type="button"
            onClick={() => setStockModal(true)}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <Scale size={18} /> Manual adjustment / waste / receive
          </button>
          {txLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-lg">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="text-left px-4 py-2">Time</th>
                    <th className="text-left px-4 py-2">Ingredient</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-left px-4 py-2">By</th>
                    <th className="text-left px-4 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {txPage?.transactions?.map((t: any) => (
                    <tr key={t.id} className="border-t border-stone-100">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2">{t.ingredient?.name}</td>
                      <td className="px-4 py-2 font-bold text-xs">{t.type}</td>
                      <td className="px-4 py-2 text-right font-mono">{t.quantity}</td>
                      <td className="px-4 py-2">{t.user?.name || '—'}</td>
                      <td className="px-4 py-2 text-stone-500 max-w-xs truncate">{t.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'suppliers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => {
                setEditingSup(null);
                resetSupForm();
                setSupModal(true);
              }}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
            >
              <Plus size={18} /> Add supplier
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(suppliers as any[]).map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 border border-stone-100 shadow-lg shadow-stone-200/30"
              >
                <h3 className="font-bold text-lg text-secondary">{s.name}</h3>
                <p className="text-sm text-stone-600 mt-1">{s.phone || '—'}</p>
                <p className="text-sm text-stone-500">{s.email || ''}</p>
                <p className="text-xs text-stone-400 mt-2 line-clamp-2">{s.address || ''}</p>
                {s.itemsNote && <p className="text-xs text-stone-500 mt-2">Supplies: {s.itemsNote}</p>}
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSup(s);
                      setSupForm({
                        name: s.name,
                        phone: s.phone || '',
                        email: s.email || '',
                        address: s.address || '',
                        itemsNote: s.itemsNote || ''
                      });
                      setSupModal(true);
                    }}
                    className="text-sm font-semibold text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete supplier?')) deleteSup.mutate(s.id);
                    }}
                    className="text-sm font-semibold text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === 'orders' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => setPoModal(true)}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
            >
              <Plus size={18} /> New purchase order
            </button>
          </div>
          <div className="space-y-4">
            {(purchaseOrders as any[]).map((po) => (
              <div key={po.id} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-lg">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <span className="font-bold text-secondary">{po.supplier?.name}</span>
                    <span
                      className={`ml-3 text-xs font-bold px-2 py-0.5 rounded-lg ${
                        po.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold flex items-center gap-1">
                      <IndianRupee size={16} />
                      {fmtMoney(Number(po.totalCost))}
                    </span>
                    {po.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => receivePo.mutate(po.id)}
                        disabled={receivePo.isPending}
                        className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-bold"
                      >
                        Receive
                      </button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 text-sm text-stone-600 space-y-1">
                  {po.lines?.map((ln: any) => (
                    <li key={ln.id}>
                      {ln.ingredient?.name} × {ln.quantity} @ {fmtMoney(ln.unitCost)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-stone-500">From</label>
              <input
                type="date"
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
                className="block border border-stone-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500">To</label>
              <input
                type="date"
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
                className="block border border-stone-200 rounded-lg px-3 py-2 mt-1"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-lg">
            <h3 className="font-bold text-secondary mb-3">Consumption (OUT)</h3>
            <table className="w-full text-sm">
              <thead className="text-stone-500">
                <tr className="text-left">
                  <th className="pb-2">Ingredient</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {repConsumption?.byIngredient?.map((r: any) => (
                  <tr key={r.ingredientId} className="border-t border-stone-100">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 font-mono">
                      {r.totalQuantity} {r.unit}
                    </td>
                    <td className="py-2">{fmtMoney(r.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-lg">
            <h3 className="font-bold text-secondary mb-3">Wastage</h3>
            <p className="text-sm text-stone-600 mb-2">
              Total estimated cost: <strong>{fmtMoney(repWastage?.summary?.estimatedCost ?? 0)}</strong>
            </p>
            <table className="w-full text-sm">
              <thead className="text-stone-500">
                <tr className="text-left">
                  <th className="pb-2">Ingredient</th>
                  <th className="pb-2">Qty wasted</th>
                  <th className="pb-2">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {repWastage?.summary?.byIngredient?.map((r: any) => (
                  <tr key={r.ingredientId} className="border-t border-stone-100">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 font-mono">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="py-2">{fmtMoney(r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-lg">
            <h3 className="font-bold text-secondary mb-3">Food cost vs revenue</h3>
            {repCost && (
              <ul className="text-sm space-y-2 text-stone-700">
                <li>
                  Revenue (paid orders): <strong>{fmtMoney(repCost.revenueFromPaidOrders)}</strong>
                </li>
                <li>
                  Est. food cost (OUT+WASTE × cost/unit): <strong>{fmtMoney(repCost.estimatedFoodCost)}</strong>
                </li>
                <li>
                  Food cost % of revenue:{' '}
                  <strong>{repCost.approxFoodCostPercentOfRevenue ?? '—'}%</strong>
                </li>
                <li className="text-xs text-stone-500 pt-2">{repCost.note}</li>
              </ul>
            )}
          </div>
        </motion.div>
      )}

      {/* Ingredient modal */}
      {ingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-xl mb-4">{editingIng ? 'Edit ingredient' : 'New ingredient'}</h3>
            <div className="space-y-3">
              <input
                placeholder="Name"
                value={ingForm.name}
                onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2"
              />
              <select
                value={ingForm.unit}
                onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              {!editingIng && (
                <input
                  placeholder="Opening stock"
                  value={ingForm.currentStock}
                  onChange={(e) => setIngForm({ ...ingForm, currentStock: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-4 py-2"
                />
              )}
              <input
                placeholder="Min stock alert"
                value={ingForm.minStockAlert}
                onChange={(e) => setIngForm({ ...ingForm, minStockAlert: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2"
              />
              <input
                placeholder="Cost per unit (₹)"
                value={ingForm.costPerUnit}
                onChange={(e) => setIngForm({ ...ingForm, costPerUnit: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2"
              />
              <input
                placeholder="Category (optional)"
                value={ingForm.category}
                onChange={(e) => setIngForm({ ...ingForm, category: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2"
              />
              <select
                value={ingForm.supplierId}
                onChange={(e) => setIngForm({ ...ingForm, supplierId: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2"
              >
                <option value="">No supplier</option>
                {(suppliers as any[]).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setIngModal(false)} className="flex-1 py-2 rounded-xl border">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingIng) {
                    updateIng.mutate({
                      id: editingIng.id,
                      body: {
                        name: ingForm.name,
                        unit: ingForm.unit,
                        minStockAlert: Number(ingForm.minStockAlert),
                        costPerUnit: Number(ingForm.costPerUnit),
                        category: ingForm.category || null,
                        supplierId: ingForm.supplierId || null
                      }
                    });
                  } else {
                    createIng.mutate({
                      restaurantId,
                      name: ingForm.name,
                      unit: ingForm.unit,
                      currentStock: Number(ingForm.currentStock),
                      minStockAlert: Number(ingForm.minStockAlert),
                      costPerUnit: Number(ingForm.costPerUnit),
                      category: ingForm.category || null,
                      supplierId: ingForm.supplierId || null
                    });
                  }
                }}
                className="flex-1 py-2 rounded-xl btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {supModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-xl mb-4">{editingSup ? 'Edit supplier' : 'New supplier'}</h3>
            <div className="space-y-3">
              <input
                placeholder="Name"
                value={supForm.name}
                onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                className="w-full border rounded-xl px-4 py-2"
              />
              <input
                placeholder="Phone"
                value={supForm.phone}
                onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                className="w-full border rounded-xl px-4 py-2"
              />
              <input
                placeholder="Email"
                value={supForm.email}
                onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                className="w-full border rounded-xl px-4 py-2"
              />
              <textarea
                placeholder="Address"
                value={supForm.address}
                onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                className="w-full border rounded-xl px-4 py-2 min-h-[80px]"
              />
              <textarea
                placeholder="Items supplied (free text)"
                value={supForm.itemsNote}
                onChange={(e) => setSupForm({ ...supForm, itemsNote: e.target.value })}
                className="w-full border rounded-xl px-4 py-2 min-h-[60px]"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setSupModal(false)} className="flex-1 py-2 rounded-xl border">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingSup) {
                    updateSup.mutate({ id: editingSup.id, body: { ...supForm } });
                  } else {
                    createSup.mutate({ ...supForm, restaurantId });
                  }
                }}
                className="flex-1 py-2 rounded-xl btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {stockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-xl mb-4">Stock movement</h3>
            <div className="space-y-3">
              <select
                value={stockForm.ingredientId}
                onChange={(e) => setStockForm({ ...stockForm, ingredientId: e.target.value })}
                className="w-full border rounded-xl px-4 py-2"
              >
                <option value="">Ingredient…</option>
                {(ingredients as any[]).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <select
                value={stockForm.type}
                onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as any })}
                className="w-full border rounded-xl px-4 py-2"
              >
                <option value="IN">IN (receive stock)</option>
                <option value="WASTE">WASTE</option>
                <option value="ADJUST">ADJUST (+/− correction)</option>
              </select>
              <input
                placeholder="Quantity (use + or − for adjust)"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                className="w-full border rounded-xl px-4 py-2"
              />
              <input
                placeholder="Reason / note"
                value={stockForm.note}
                onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                className="w-full border rounded-xl px-4 py-2"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStockModal(false)} className="flex-1 py-2 rounded-xl border">
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  adjustStock.mutate({
                    restaurantId,
                    ingredientId: stockForm.ingredientId,
                    type: stockForm.type,
                    quantity: Number(stockForm.quantity),
                    note: stockForm.note
                  })
                }
                disabled={!stockForm.ingredientId || stockForm.quantity === ''}
                className="flex-1 py-2 rounded-xl btn-primary"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {poModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
            <h3 className="font-bold text-xl mb-4">New purchase order</h3>
            <select
              value={poSupplierId}
              onChange={(e) => setPoSupplierId(e.target.value)}
              className="w-full border rounded-xl px-4 py-2 mb-4"
            >
              <option value="">Supplier…</option>
              {(suppliers as any[]).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {poLines.map((ln, idx) => (
              <div key={idx} className="flex flex-wrap gap-2 mb-2">
                <select
                  value={ln.ingredientId}
                  onChange={(e) => {
                    const n = [...poLines];
                    n[idx] = { ...n[idx], ingredientId: e.target.value };
                    setPoLines(n);
                  }}
                  className="flex-1 min-w-[140px] border rounded-lg px-2 py-2"
                >
                  <option value="">Ingredient</option>
                  {(ingredients as any[]).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qty"
                  value={ln.quantity}
                  onChange={(e) => {
                    const n = [...poLines];
                    n[idx] = { ...n[idx], quantity: e.target.value };
                    setPoLines(n);
                  }}
                  className="w-24 border rounded-lg px-2 py-2"
                />
                <input
                  type="number"
                  placeholder="₹/unit"
                  value={ln.unitCost}
                  onChange={(e) => {
                    const n = [...poLines];
                    n[idx] = { ...n[idx], unitCost: e.target.value };
                    setPoLines(n);
                  }}
                  className="w-28 border rounded-lg px-2 py-2"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPoLines([...poLines, { ingredientId: '', quantity: '1', unitCost: '0' }])}
              className="text-primary text-sm font-bold mb-4"
            >
              + Line
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPoModal(false)} className="flex-1 py-2 rounded-xl border">
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  createPo.mutate({
                    restaurantId,
                    supplierId: poSupplierId,
                    lines: poLines
                      .filter((l) => l.ingredientId)
                      .map((l) => ({
                        ingredientId: l.ingredientId,
                        quantity: Number(l.quantity),
                        unitCost: Number(l.unitCost)
                      }))
                  })
                }
                className="flex-1 py-2 rounded-xl btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
