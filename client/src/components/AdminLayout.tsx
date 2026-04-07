import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';

const AdminLayout = ({ role }: { role: 'SUPERADMIN' | 'ADMIN' }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  // Force new admins to complete their restaurant profile first
  if (role === 'ADMIN' && !user?.restaurantId && location.pathname !== '/admin/profile' && location.pathname !== '/admin') {
    return <Navigate to="/admin/profile" replace />;
  }
  return (
    <div className="flex bg-background-light min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
