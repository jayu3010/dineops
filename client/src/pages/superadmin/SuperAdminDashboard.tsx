import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Users, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <p className="text-muted text-sm font-medium">{label}</p>
    <h3 className="text-2xl font-bold text-secondary mt-1">{value}</h3>
  </div>
);

const SuperAdminDashboard = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRestaurant, setEditingRestaurant] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({
    name: '', address: '', city: '', cuisine: '', phone: '', description: 'Created by SuperAdmin',
    openTime: '09:00', closeTime: '22:00', planId: '', ownerId: ''
  });

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data.data });
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: async () => (await api.get('/plans')).data.data });

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const response = await api.get('/restaurants');
      return response.data.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      return api.patch(`/restaurants/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant status updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/restaurants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant deleted successfully');
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingRestaurant) {
        return api.put(`/restaurants/${editingRestaurant.id}`, data);
      }
      return api.post('/restaurants/register', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success(editingRestaurant ? 'Restaurant updated' : 'Restaurant created and activated');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save restaurant');
    }
  });

  const handleOpenModal = (restaurant?: any) => {
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setFormData({
        name: restaurant.name, address: restaurant.address, city: restaurant.city, cuisine: restaurant.cuisine, 
        phone: restaurant.phone, description: restaurant.description, openTime: restaurant.openTime, 
        closeTime: restaurant.closeTime, planId: restaurant.planId, ownerId: restaurant.ownerId
      });
    } else {
      setEditingRestaurant(null);
      setFormData({
        name: '', address: '', city: '', cuisine: '', phone: '', description: 'Created by SuperAdmin',
        openTime: '09:00', closeTime: '22:00', planId: '', ownerId: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRestaurant(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-secondary">Platform Overview</h1>
        <p className="text-muted">Manage all restaurants and system metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard label="Total Restaurants" value={restaurants?.length || 0} icon={Store} trend="+12%" color="bg-primary" />
        <StatCard label="Active Subscriptions" value={restaurants?.filter((r: any) => r.status === 'ACTIVE').length || 0} icon={CheckCircle} trend="+5%" color="bg-success" />
        <StatCard label="Pending Approvals" value={restaurants?.filter((r: any) => r.status === 'PENDING').length || 0} icon={AlertCircle} color="bg-warning" />
        <StatCard label="Monthly Revenue" value="$12,450" icon={TrendingUp} trend="+18%" color="bg-purple-600" />
      </div>

      <div className="card-base">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-secondary">All Restaurants</h2>
          <button 
            onClick={() => handleOpenModal()}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
          >
            <Store size={16} /> Add Restaurant
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Cuisine</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {restaurants?.map((r: any) => (
                <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-secondary">{r.name}</div>
                    <div className="text-xs text-muted">{r.tenantId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{r.owner?.name}</div>
                    <div className="text-xs text-muted">{r.owner?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{r.city}</td>
                  <td className="px-6 py-4">
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-xs font-medium">
                      {r.cuisine}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge-${r.status.toLowerCase()}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-center h-full">
                    <div className="flex gap-2">
                    {r.status === 'PENDING' && (
                      <button 
                        onClick={() => mutation.mutate({ id: r.id, status: 'ACTIVE' })}
                        className="p-1.5 text-success hover:bg-green-50 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    {r.status !== 'SUSPENDED' && (
                      <button 
                        onClick={() => mutation.mutate({ id: r.id, status: 'SUSPENDED' })}
                        className="p-1.5 text-danger hover:bg-red-50 rounded-lg transition-colors"
                        title="Suspend"
                      >
                        <XCircle size={20} />
                      </button>
                    )}
                    {r.status === 'SUSPENDED' && (
                      <button 
                        onClick={() => mutation.mutate({ id: r.id, status: 'ACTIVE' })}
                        className="p-1.5 text-success hover:bg-green-50 rounded-lg transition-colors"
                        title="Reactivate"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenModal(r)}
                      className="p-1.5 text-stone-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Store size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Delete this restaurant? This cannot be undone.')) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <XCircle size={20} />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!restaurants || restaurants.length === 0) && (
            <div className="p-10 text-center text-muted">No restaurants registered yet.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-serif font-bold text-secondary mb-6">
              {editingRestaurant ? 'Edit Restaurant' : 'Create New Restaurant'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">Restaurant Name</label>
                  <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">Cuisine Type</label>
                  <input type="text" required className="input-field" value={formData.cuisine} onChange={e => setFormData({...formData, cuisine: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">City</label>
                  <input type="text" required className="input-field" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">Phone</label>
                  <input type="text" required className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">Address</label>
                  <input type="text" required className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">Assign Owner (User)</label>
                  <select required className="input-field" value={formData.ownerId} onChange={e => setFormData({...formData, ownerId: e.target.value})}>
                    <option value="">Select a user...</option>
                    {users?.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-stone-400 mb-1 block">Subscription Plan</label>
                  <select required className="input-field" value={formData.planId} onChange={e => setFormData({...formData, planId: e.target.value})}>
                    <option value="">Select a plan...</option>
                    {plans?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 mt-6 border-t border-stone-100">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 font-bold text-stone-400 hover:text-secondary">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-[2] btn-primary">
                  {createMutation.isPending ? 'Saving...' : (editingRestaurant ? 'Update Restaurant' : 'Create Active Restaurant')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
