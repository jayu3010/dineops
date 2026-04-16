import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Utensils, Save, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const RestaurantSetup = () => {
  const { user, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const isEditing = !!user?.restaurant && user?.role === 'ADMIN';

  const [formData, setFormData] = useState({
    name: user?.restaurant?.name || '',
    address: user?.restaurant?.address || '',
    city: user?.restaurant?.city || 'Mumbai',
    cuisine: user?.restaurant?.cuisine || 'Indian',
    description: user?.restaurant?.description || '',
    openTime: user?.restaurant?.openTime || '09:00',
    closeTime: user?.restaurant?.closeTime || '22:00',
    phone: user?.restaurant?.phone || '',
    planId: user?.restaurant?.planId || '',
    gstin: user?.restaurant?.gstin || '',
    fssai: user?.restaurant?.fssai || ''
  });

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/plans');
        if (response.data.success) {
          setPlans(response.data.data);
          if (response.data.data.length > 0 && !formData.planId) {
            setFormData(prev => ({ ...prev, planId: response.data.data[0].id }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch plans', error);
      }
    };
    fetchPlans();
  }, [formData.planId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isEditing ? '/restaurants/my' : '/restaurants/register';
      const method = isEditing ? 'patch' : 'post';

      const payload = isEditing
        ? {
            name: formData.name,
            address: formData.address,
            city: formData.city,
            cuisine: formData.cuisine,
            description: formData.description,
            openTime: formData.openTime,
            closeTime: formData.closeTime,
            phone: formData.phone,
            gstin: formData.gstin,
            fssai: formData.fssai
          }
        : formData;

      const response = await api[method](endpoint, payload);
      if (response.data.success) {
        toast.success(isEditing ? 'Restaurant details updated!' : 'Restaurant registered! Waiting for approval.');
        await checkAuth(); // Refreshes user object with restaurant details
        navigate('/admin');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-serif font-bold text-secondary">
          {isEditing ? 'Edit Restaurant Profile' : 'Setup Your Restaurant'}
        </h1>
        <p className="text-muted text-sm mt-1">
          {isEditing ? 'Update your restaurant information.' : 'Tell us about your establishment to get started.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* General Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Utensils className="text-primary w-5 h-5" /> Basic Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Restaurant Name</label>
                <input
                  type="text" required className="input-field" placeholder="Gourmet Heaven"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Cuisine Type</label>
                <select
                  className="input-field"
                  value={formData.cuisine} onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                >
                  <option>Indian</option>
                  <option>Chinese</option>
                  <option>Italian</option>
                  <option>Continental</option>
                  <option>Multi-cuisine</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel" required className="input-field pl-10" placeholder="+91 98765 43210"
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">GSTIN (tax invoice)</label>
                <input
                  type="text"
                  className="input-field font-mono text-sm"
                  placeholder="22AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">FSSAI licence no. (optional)</label>
                <input
                  type="text"
                  className="input-field font-mono text-sm"
                  placeholder="Licence number"
                  value={formData.fssai}
                  onChange={(e) => setFormData({ ...formData, fssai: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Location & Time */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="text-primary w-5 h-5" /> Location & Hours
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">City</label>
                <select
                  className="input-field"
                  value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                >
                  <option>Mumbai</option>
                  <option>Delhi</option>
                  <option>Bangalore</option>
                  <option>Pune</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Full Address</label>
                <textarea
                  className="input-field min-h-[100px]" placeholder="123 Shopping Mall, Main Street..."
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-gray-700">Open Time</label>
                  <input
                    type="time" required className="input-field"
                    value={formData.openTime} onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-gray-700">Close Time</label>
                  <input
                    type="time" required className="input-field"
                    value={formData.closeTime} onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium mb-1 block text-gray-700">Subscription Plan</label>
          <select
            className="input-field"
            value={formData.planId} onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
            disabled={isEditing}
          >
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name} - ₹{plan.price}</option>
            ))}
          </select>
          {isEditing && <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Contact support to change your plan.</p>}
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium mb-1 block text-gray-700">Description</label>
          <textarea
            className="input-field min-h-[120px]"
            placeholder="Describe your restaurant's vibe, signature dishes, etc."
            value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-10"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <><Save className="w-5 h-5" /> {isEditing ? 'Update Details' : 'Register Restaurant'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RestaurantSetup;
