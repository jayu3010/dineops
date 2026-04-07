import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';

function defaultPathForRole(role: string): string {
  if (role === 'WAITER' || role === 'CASHIER') return '/admin/pos';
  if (role === 'MANAGER' || role === 'ADMIN') return '/admin';
  return '/';
}

function pathAllowedForRole(role: string, path: string): boolean {
  if (path === '/analytics') {
    return role === 'ADMIN' || role === 'MANAGER';
  }
  if (!path.startsWith('/admin')) {
    return false;
  }
  if (role === 'ADMIN') {
    return true;
  }
  if (role === 'MANAGER') {
    if (path.startsWith('/admin/staff') || path.startsWith('/admin/profile')) {
      return false;
    }
    return true;
  }
  if (role === 'WAITER') {
    return path.startsWith('/admin/pos');
  }
  if (role === 'CASHIER') {
    return path.startsWith('/admin/pos');
  }
  return false;
}

const AdminLayout = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const role = user?.role ?? '';

  if (role === 'SUPERADMIN') {
    return (
      <div className="flex bg-background-light min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  if (
    user?.role === 'ADMIN' &&
    !user?.restaurantId &&
    location.pathname !== '/admin/profile' &&
    location.pathname !== '/admin'
  ) {
    return <Navigate to="/admin/profile" replace />;
  }

  if (location.pathname === '/analytics') {
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return <Navigate to={defaultPathForRole(role)} replace />;
    }
  } else if (!pathAllowedForRole(role, location.pathname)) {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  return (
    <div className="flex bg-background-light min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
