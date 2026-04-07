import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Utensils, Tag, IndianRupee, Image as ImageIcon, Save, X, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const MenuManagement = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', image: '', categoryId: '' });
  const [editingItem, setEditingItem] = useState<any>(null);

  // In a real app, restaurantId should come from the logged-in user's restaurant
  const restaurantId = user?.restaurantId;

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/menu/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId
  });

  const categoryMutation = useMutation({
    mutationFn: (data: any) => api.post('/menu/category', { ...data, restaurantId: user?.restaurantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Category added');
      setIsCategoryModalOpen(false);
      setNewCategory({ name: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add category');
    }
  });

  const categoryUpdateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/menu/category/${editingCategory.id}`, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Category updated');
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setNewCategory({ name: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  });

  const categoryDeleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/category/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Category deleted');
      setActiveCategory(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  });

  const itemMutation = useMutation({
    mutationFn: (data: any) => editingItem 
      ? api.patch(`/menu/item/${editingItem.id}`, data)
      : api.post('/menu/item', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success(editingItem ? 'Item updated' : 'Item added');
      setIsItemModalOpen(false);
      setNewItem({ name: '', description: '', price: '', image: '', categoryId: '' });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save item');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/item/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Item deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    }
  });

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Loading menu...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-serif font-bold text-secondary">Menu Management</h1>
          <p className="text-muted text-sm mt-1">Curate your restaurant's culinary offerings</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setEditingCategory(null);
              setNewCategory({ name: '' });
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-primary text-primary font-bold hover:bg-orange-50 transition-all"
          >
            <Tag size={18} /> New Category
          </button>
          <button 
            onClick={() => {
              if (!menuData || menuData.length === 0) {
                toast.error('Please create a category first');
                return;
              }
              setIsItemModalOpen(true);
              setNewItem({ ...newItem, categoryId: activeCategory || menuData[0].id });
            }}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
          >
            <Plus size={18} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setActiveCategory(null)}
          className={`px-6 py-2 rounded-full whitespace-nowrap font-bold transition-all ${!activeCategory ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
        >
          All Items
        </button>
        {menuData?.map((cat: any) => (
          <div key={cat.id} className="inline-flex items-center relative group">
            <button 
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2 rounded-full whitespace-nowrap font-bold transition-all ${activeCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
            >
              {cat.name}
            </button>
            {activeCategory === cat.id && (
              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                  onClick={() => {
                    setEditingCategory(cat);
                    setNewCategory({ name: cat.name });
                    setIsCategoryModalOpen(true);
                  }}
                  className="p-1 bg-blue-500 text-white rounded-full shadow-md hover:scale-110 transition-transform"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Delete this category and all its items?')) {
                      categoryDeleteMutation.mutate(cat.id);
                    }
                  }}
                  className="p-1 bg-danger text-white rounded-full shadow-md hover:scale-110 transition-transform"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {menuData?.flatMap((cat: any) => 
            (!activeCategory || activeCategory === cat.id) 
              ? cat.items.map((item: any) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-stone-200/50 border border-stone-100 group hover:border-primary/30 transition-all"
                >
                  <div className="relative h-48 bg-stone-100">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <Utensils size={48} />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setNewItem({
                            name: item.name,
                            description: item.description || '',
                            price: item.price.toString(),
                            image: item.image || '',
                            categoryId: item.categoryId
                          });
                          setIsItemModalOpen(true);
                        }}
                        className="p-2 bg-white/90 backdrop-blur rounded-full text-secondary hover:text-primary shadow-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Delete this item?')) {
                            deleteItemMutation.mutate(item.id);
                          }
                        }}
                        className="p-2 bg-white/90 backdrop-blur rounded-full text-danger hover:bg-danger hover:text-white shadow-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-secondary">{item.name}</h3>
                      <span className="text-primary font-black flex items-center">
                        <IndianRupee size={14} /> {item.price}
                      </span>
                    </div>
                    <p className="text-muted text-sm line-clamp-2">{item.description}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        {item.isAvailable ? 'Available' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
              : []
          )}
        </AnimatePresence>
      </div>

      {(!menuData || menuData.length === 0) && (
        <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
          <Utensils size={48} className="mx-auto text-stone-300 mb-4" />
          <p className="text-stone-500 font-medium">Your menu is empty. Start by adding categories and items.</p>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full"
          >
            <h2 className="text-2xl font-serif font-bold text-secondary mb-6">
              {editingCategory ? 'Edit Category' : 'New Category'}
            </h2>
            <input 
              type="text" className="input-field mb-6" placeholder="e.g. Starters, Main Course"
              value={newCategory.name} onChange={(e) => setNewCategory({ name: e.target.value })}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }} className="flex-1 py-3 font-bold text-stone-400">Cancel</button>
              <button 
                disabled={!newCategory.name}
                onClick={() => editingCategory ? categoryUpdateMutation.mutate(newCategory) : categoryMutation.mutate(newCategory)}
                className="flex-[2] btn-primary"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <button onClick={() => { setIsItemModalOpen(false); setEditingItem(null); }} className="text-stone-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-stone-400 tracking-widest mb-1 block">Category</label>
                <select 
                  className="input-field"
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                >
                  {menuData?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-stone-400 tracking-widest mb-1 block">Item Name</label>
                <input 
                  type="text" className="input-field" placeholder="e.g. Paneer Butter Masala"
                  value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 tracking-widest mb-1 block">Price</label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="number" className="input-field pl-10" placeholder="250"
                      value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 tracking-widest mb-1 block">Image URL (Optional)</label>
                  <div className="relative">
                    <ImageIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input 
                      type="text" className="input-field pl-10" placeholder="https://..."
                      value={newItem.image} onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-stone-400 tracking-widest mb-1 block">Description</label>
                <textarea 
                  className="input-field min-h-[100px]" placeholder="Briefly describe the item's ingredients, taste, etc."
                  value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
            </div>

            <button 
              disabled={!newItem.name || !newItem.price}
              onClick={() => itemMutation.mutate(newItem)}
              className="w-full btn-primary mt-8 py-4 text-lg"
            >
              <Save size={20} className="inline-block mr-2" /> 
              {editingItem ? 'Update Item' : 'Add to Menu'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
