import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus, Loader2, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
};

const ROLE_OPTIONS = ['MANAGER', 'WAITER', 'CASHIER'] as const;

const StaffManagement = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'WAITER' as (typeof ROLE_OPTIONS)[number]
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', user?.restaurantId],
    queryFn: async () => {
      const res = await api.get('/staff');
      return res.data.data as StaffRow[];
    },
    enabled: user?.role === 'ADMIN' && !!user?.restaurantId
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/staff', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff account created');
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', role: 'WAITER' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Could not create staff')
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/staff/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Could not update role')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff removed');
      setDeleteId(null);
    },
    onError: () => toast.error('Could not remove staff')
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <p className="text-muted">Only the restaurant owner can manage staff.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary flex items-center gap-2">
            <UserCog className="text-primary" /> Staff
          </h1>
          <p className="text-muted text-sm mt-1">Create accounts for managers, waiters, and cashiers.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
        >
          <Plus size={18} /> Add staff
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-muted text-xs uppercase border-b border-stone-100 bg-stone-50">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!staff?.length ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted">
                      No staff yet. Add your first team member.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="border-b border-stone-50">
                      <td className="p-4 font-medium text-secondary">{s.name}</td>
                      <td className="p-4 text-stone-600">{s.email}</td>
                      <td className="p-4">
                        <select
                          className="input-field text-xs py-1.5 max-w-[140px]"
                          value={s.role}
                          onChange={(e) => roleMutation.mutate({ id: s.id, role: e.target.value })}
                          disabled={roleMutation.isPending}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          {s.isVerified ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteId(s.id)}
                          className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove staff"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-serif text-xl font-bold text-secondary">Add staff</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Name</label>
                <input
                  className="input-field mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Email</label>
                <input
                  type="email"
                  className="input-field mt-1"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Temporary password</label>
                <input
                  type="text"
                  className="input-field mt-1"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Share securely with staff"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Role</label>
                <select
                  className="input-field mt-1"
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as (typeof ROLE_OPTIONS)[number] })
                  }
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" className="flex-1 btn-secondary py-2" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 btn-primary py-2"
                disabled={createMutation.isPending || !form.name || !form.email || !form.password}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <p className="font-bold text-secondary">Remove this staff member?</p>
            <p className="text-sm text-muted">They will no longer be able to sign in.</p>
            <div className="flex gap-2">
              <button type="button" className="flex-1 btn-secondary py-2" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
