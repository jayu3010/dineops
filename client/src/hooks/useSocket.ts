import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export const useSocket = (tenantId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      socket.emit('join-restaurant', tenantId);
    });

    socket.on('table-status-updated', ({ tableId, status }) => {
      // Optimistically update the cache for specific restaurant's tables
      queryClient.setQueryData(['tables', tenantId], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((table: any) => 
          table.id === tableId ? { ...table, status } : table
        );
      });
    });

    socket.on('table-updated', (updatedTable) => {
      queryClient.setQueryData(['tables', tenantId], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((table: any) => 
          table.id === updatedTable.id ? updatedTable : table
        );
      });
    });

    socket.on('new-booking', () => {
      // Invalidate dashboard stats or bookings list
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-bookings'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [tenantId, queryClient]);
};
