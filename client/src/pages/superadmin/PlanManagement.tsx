import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Edit2, Trash2, CheckCircle, Loader2, IndianRupee } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const PlanManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    maxTables: '',
    maxBookingsPerMonth: '',
    features: '' // Internal comma-separated string for simplicity
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await api.get('/plans');
      return response.data.data;
    }
  });

  const planMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPlan) {
        return api.put(`/plans/${editingPlan.id}`, data);
      }
      return api.post('/plans', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save plan');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete plan');
    }
  });

  const handleOpenModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        price: plan.price.toString(),
        maxTables: plan.maxTables.toString(),
        maxBookingsPerMonth: plan.maxBookingsPerMonth.toString(),
        features: plan.features
      });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', price: '', maxTables: '', maxBookingsPerMonth: '', features: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    planMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Subscription Plans</h1>
          <p className="text-muted mt-1">Manage pricing tiers and limits</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2 px-6 py-2.5"
        >
          <Plus size={18} /> New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans?.map((plan: any) => (
          <div key={plan.id} className="bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenModal(plan)}
                className="p-2 bg-stone-100 text-stone-500 hover:text-primary rounded-full"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Delete this plan?')) deleteMutation.mutate(plan.id);
                }}
                className="p-2 bg-stone-100 text-stone-500 hover:bg-danger hover:text-white rounded-full"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="w-12 h-12 bg-orange-50 text-primary rounded-2xl flex items-center justify-center mb-6">
              <CreditCard size={24} />
            </div>
            
            <h3 className="text-2xl font-bold font-serif text-secondary mb-2">{plan.name}</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-4xl font-bold text-secondary flex items-start"><IndianRupee size={24} className="mt-1" />{plan.price}</span>
              <span className="text-muted font-semibold mb-1">/ month</span>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm py-2 border-b border-stone-50">
                <span className="text-muted font-medium">Max Tables</span>
                <span className="font-bold text-secondary">{plan.maxTables}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-stone-50">
                <span className="text-muted font-medium">Bookings/mo</span>
                <span className="font-bold text-secondary">{plan.maxBookingsPerMonth}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Features</h4>
              {plan.features.split(',').map((f: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-sm font-medium text-stone-600">
                  <CheckCircle size={16} className="text-primary mt-0.5" />
                  <span>{f.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-serif font-bold text-secondary mb-6">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 block">Plan Name</label>
                <input 
                  type="text" required className="input-field" placeholder="e.g. Basic"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 block">Monthly Price (₹)</label>
                <input 
                  type="number" required className="input-field" placeholder="999"
                  value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 block">Max Tables</label>
                  <input 
                    type="number" required className="input-field" placeholder="10"
                    value={formData.maxTables} onChange={e => setFormData({...formData, maxTables: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 block">Max Bookings</label>
                  <input 
                    type="number" required className="input-field" placeholder="300"
                    value={formData.maxBookingsPerMonth} onChange={e => setFormData({...formData, maxBookingsPerMonth: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 block">Features (comma separated)</label>
                <textarea 
                  required className="input-field min-h-[80px]" placeholder="Real-time syncing, 24/7 Support..."
                  value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 font-bold text-stone-400 hover:text-secondary">Cancel</button>
                <button type="submit" disabled={planMutation.isPending} className="flex-[2] btn-primary text-lg">
                  {planMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManagement;
