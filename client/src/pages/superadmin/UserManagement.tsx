import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Trash2, Loader2, Search } from 'lucide-react';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newUserParams, setNewUserParams] = React.useState({ name: '', email: '', password: '', role: 'USER' });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data.data;
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setIsAddModalOpen(false);
      setNewUserParams({ name: '', email: '', password: '', role: 'USER' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: string }) => {
      return api.patch(`/users/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: string, isVerified: boolean }) => {
      return api.patch(`/users/${id}/verify`, { isVerified });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Verification status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update verification status');
    }
  });

  const filteredUsers = users?.filter((u: any) => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">User Management</h1>
          <p className="text-muted mt-1">Manage platform users and access roles</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <User size={18} /> Add User
          </button>
        </div>

      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers?.map((u: any) => (
                <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-secondary">{u.name} {u.id === currentUser?.id && '(You)'}</div>
                        <div className="text-sm text-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="text-sm font-semibold bg-transparent border border-stone-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none"
                      value={u.role}
                      disabled={u.id === currentUser?.id || roleMutation.isPending}
                      onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERADMIN">SuperAdmin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      disabled={u.id === currentUser?.id || verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate({ id: u.id, isVerified: !u.isVerified })}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${u.isVerified ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700'}`}
                      title={`Click to ${u.isVerified ? 'Unverify' : 'Verify'}`}
                    >
                      {u.isVerified ? 'Verified' : 'Unverified'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600 font-medium">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      disabled={u.id === currentUser?.id || deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                          deleteMutation.mutate(u.id);
                        }
                      }}
                      className="p-2 text-stone-400 hover:bg-red-50 hover:text-danger rounded-xl transition-all disabled:opacity-50"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers?.length === 0 && (
            <div className="p-12 text-center text-stone-500 font-medium">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl">
            <h2 className="text-2xl font-serif font-bold text-secondary mb-6">Add New User</h2>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                createUserMutation.mutate(newUserParams);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-stone-500 mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="input-field" 
                  value={newUserParams.name}
                  onChange={e => setNewUserParams({...newUserParams, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-500 mb-2">Email Address</label>
                <input 
                  type="email" 
                  required
                  className="input-field" 
                  value={newUserParams.email}
                  onChange={e => setNewUserParams({...newUserParams, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-500 mb-2">Password</label>
                <input 
                  type="text" 
                  required
                  minLength={6}
                  className="input-field" 
                  value={newUserParams.password}
                  onChange={e => setNewUserParams({...newUserParams, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-500 mb-2">Role</label>
                <select 
                  className="input-field"
                  value={newUserParams.role}
                  onChange={e => setNewUserParams({...newUserParams, role: e.target.value})}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPERADMIN">SuperAdmin</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4 mt-8 border-t border-stone-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending}
                  className="flex-1 py-3 btn-primary m-0 w-auto"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
