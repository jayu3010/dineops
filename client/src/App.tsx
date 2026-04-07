import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/user/LandingPage';
import RestaurantDetail from './pages/user/RestaurantDetail';
import ExplorePage from './pages/user/ExplorePage';
import MyBookings from './pages/user/MyBookings';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import RestaurantSetup from './pages/admin/RestaurantSetup';
import AdminDashboard from './pages/admin/AdminDashboard';
import TableManagement from './pages/admin/TableManagement';
import MenuManagement from './pages/admin/MenuManagement';
import POS from './pages/admin/POS';
import PlanManagement from './pages/superadmin/PlanManagement';
import UserManagement from './pages/superadmin/UserManagement';

const App = () => {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-serif text-xl font-bold text-primary">ReserveTable</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="min-h-screen bg-background-light">
        <Routes>
          {/* Public Routes with Navbar */}
          <Route element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1"><Outlet /></main>
            </div>
          }>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/restaurant/:tenantId" element={<RestaurantDetail />} />
          </Route>

          {/* User Protected Routes with Navbar */}
          <Route element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1"><ProtectedRoute allowedRoles={['USER', 'ADMIN', 'SUPERADMIN']} /></main>
            </div>
          }>
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/profile" element={<div>Profile</div>} />
          </Route>

          {/* Admin Protected Routes with Sidebar */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AdminLayout role="ADMIN" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/profile" element={<RestaurantSetup />} />
              <Route path="/admin/tables" element={<TableManagement />} />
              <Route path="/admin/menu" element={<MenuManagement />} />
              <Route path="/admin/pos" element={<POS />} />
            </Route>
          </Route>

          {/* SuperAdmin Protected Routes with Sidebar */}
          <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
            <Route element={<AdminLayout role="SUPERADMIN" />}>
              <Route path="/superadmin" element={<SuperAdminDashboard />} />
              <Route path="/superadmin/restaurants" element={<SuperAdminDashboard />} />
              <Route path="/superadmin/plans" element={<PlanManagement />} />
              <Route path="/superadmin/users" element={<UserManagement />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
