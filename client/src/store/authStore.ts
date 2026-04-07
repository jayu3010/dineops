import { create } from 'zustand';
import api from '../api/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'WAITER' | 'CASHIER' | 'USER';
  restaurantId?: string;
  tenantId?: string;
  restaurant?: any;
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (userData, token) => {
    localStorage.setItem('accessToken', token);
    const user = { 
      ...userData, 
      restaurantId: userData.restaurant?.id,
      tenantId: userData.restaurant?.tenantId 
    };
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        const userData = response.data.data;
        const user = { 
          ...userData, 
          restaurantId: userData.restaurant?.id,
          tenantId: userData.restaurant?.tenantId 
        };
        set({ user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
