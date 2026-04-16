import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Users, Layers } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import { sortTablesByNumber } from '../../utils/sortTables';

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  shape: string;
  x: number;
  y: number;
  status: string;
}

const TableManagement = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: 2, shape: 'ROUND' });

  // Use restaurantId from user object
  const restaurantId = user?.restaurantId; 

  useSocket(user?.tenantId || '');

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/tables/all/${restaurantId}`);
      return res.data.data;
    },
    enabled: !!restaurantId
  });

  const tablesSorted = useMemo(
    () => (tables?.length ? sortTablesByNumber(tables as Table[]) : []),
    [tables]
  );

  const createMutation = useMutation({
    mutationFn: (table: any) => api.post('/tables', { ...table, restaurantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table added');
      setIsModalOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/tables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated');
      setIsModalOpen(false);
      setEditingTableId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table removed');
    }
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, x, y }: any) => api.patch(`/tables/${id}`, { x, y }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] })
  });

  const handleDragEnd = (id: string, info: any) => {
    // In a real app, calculate grid-snapped coordinates
    const x = info.point.x;
    const y = info.point.y;
    updatePositionMutation.mutate({ id, x, y });
  };

  if (isLoading) return <div className="p-8 text-center text-muted">Loading floor plan...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-secondary">Table Management</h1>
          <p className="text-muted text-sm mt-1">Design your restaurant floor plan</p>
        </div>
        <div className="flex gap-4">
           <button 
            onClick={() => {
              setEditingTableId(null);
              setNewTable({ tableNumber: '', capacity: 2, shape: 'ROUND' });
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Add Table
          </button>
        </div>
      </div>

      <div className="flex-1 bg-stone-100 rounded-3xl border-2 border-dashed border-stone-200 relative overflow-hidden min-h-[500px]">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

        {/* Tables Layer */}
        <AnimatePresence>
          {tablesSorted.map((table: Table) => (
            <motion.div
              key={table.id}
              drag
              dragMomentum={false}
              onDragEnd={(_, info) => handleDragEnd(table.id, info)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={`
                absolute w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center cursor-move p-2
                ${table.shape === 'ROUND' ? 'rounded-full' : 'rounded-2xl'}
                bg-white shadow-xl border-2 border-orange-100 hover:border-primary transition-colors group
              `}
              style={{ left: table.x || 100, top: table.y || 100 }}
            >
              <span className="text-xs font-bold text-muted mb-1 uppercase tracking-wider">Table</span>
              <span className="text-xl font-black text-secondary">{table.tableNumber}</span>
              <div className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1 border" style={{ 
                color: table.status === 'AVAILABLE' ? '#10b981' : table.status === 'OCCUPIED' ? '#ef4444' : '#f97316',
                borderColor: table.status === 'AVAILABLE' ? '#10b981' : table.status === 'OCCUPIED' ? '#ef4444' : '#f97316'
              }}>
                {table.status}
              </div>
              <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                <Users size={12} /> {table.capacity}
              </div>
              
              <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingTableId(table.id);
                    setNewTable({ tableNumber: table.tableNumber, capacity: table.capacity, shape: table.shape });
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/20 hover:scale-110 transition-transform"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => deleteMutation.mutate(table.id)}
                  className="p-1.5 bg-danger text-white rounded-full shadow-lg shadow-red-500/20 hover:scale-110 transition-transform"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {tablesSorted.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
            <Layers size={48} className="mb-4 opacity-20" />
            <p className="font-medium">No tables added yet.</p>
            <p className="text-sm">Click "Add Table" to start designing your floor plan.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Table Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-2xl font-serif font-bold text-secondary mb-6">
              {editingTableId ? 'Edit Table' : 'Add New Table'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Table Number / Label</label>
                <input 
                  type="text" className="input-field" placeholder="e.g. T-10, VIP-1"
                  value={newTable.tableNumber} onChange={(e) => setNewTable({...newTable, tableNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Capacity (Persons)</label>
                <input 
                  type="number" className="input-field" min="1"
                  value={newTable.capacity} onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-700">Table Shape</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button 
                    onClick={() => setNewTable({...newTable, shape: 'ROUND'})}
                    className={`p-3 rounded-xl border-2 transition-all ${newTable.shape === 'ROUND' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-100 text-gray-400'}`}
                  >
                    Round
                  </button>
                  <button 
                    onClick={() => setNewTable({...newTable, shape: 'SQUARE'})}
                    className={`p-3 rounded-xl border-2 transition-all ${newTable.shape === 'SQUARE' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-100 text-gray-400'}`}
                  >
                    Square
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTableId(null);
                }}
                className="flex-1 px-6 py-3 rounded-xl text-stone-500 font-semibold hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => editingTableId ? updateMutation.mutate({ id: editingTableId, ...newTable }) : createMutation.mutate(newTable)}
                className="flex-[2] btn-primary"
              >
                {editingTableId ? 'Update Table' : 'Create Table'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;
