import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Footer from './components/Footer';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/user/LandingPage';
import RestaurantDetail from './pages/user/RestaurantDetail';
import ExplorePage from './pages/user/ExplorePage';
import OnlineOrderPage from './pages/user/OnlineOrderPage';
import MyBookings from './pages/user/MyBookings';
import RecipesPage from './pages/user/RecipesPage';
import RecipeDetail from './pages/user/RecipeDetail';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import RestaurantSetup from './pages/admin/RestaurantSetup';
import AdminDashboard from './pages/admin/AdminDashboard';
import TableManagement from './pages/admin/TableManagement';
import MenuManagement from './pages/admin/MenuManagement';
import POS from './pages/admin/POS';
import KitchenDisplay from './pages/admin/KitchenDisplay';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import OrderReportsPage from './pages/admin/OrderReportsPage';
import DayClosePage from './pages/admin/DayClosePage';
import StaffManagement from './pages/admin/StaffManagement';
import InventoryManagement from './pages/admin/InventoryManagement';
import PlanManagement from './pages/superadmin/PlanManagement';
import UserManagement from './pages/superadmin/UserManagement';

const RESTAURANT_STAFF_ROLES = ['ADMIN', 'MANAGER', 'WAITER', 'CASHIER'] as const;

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
          <Route
            element={
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <Outlet />
                </main>
                <Footer />
              </div>
            }
          >
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/restaurant/:tenantId" element={<RestaurantDetail />} />
            <Route path="/order/:tenantId" element={<OnlineOrderPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
          </Route>

          {/* User Protected Routes with Navbar */}
          <Route
            element={
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <ProtectedRoute allowedRoles={['USER', 'ADMIN', 'SUPERADMIN', 'MANAGER', 'WAITER', 'CASHIER']} />
                </main>
                <Footer />
              </div>
            }
          >
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/profile" element={<div>Profile</div>} />
          </Route>

          {/* Kitchen — full screen */}
          <Route element={<ProtectedRoute allowedRoles={[...RESTAURANT_STAFF_ROLES]} />}>
            <Route path="/kitchen" element={<KitchenDisplay />} />
          </Route>

          {/* Restaurant operations (sidebar layout) */}
          <Route element={<ProtectedRoute allowedRoles={[...RESTAURANT_STAFF_ROLES]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/profile" element={<RestaurantSetup />} />
              <Route path="/admin/tables" element={<TableManagement />} />
              <Route path="/admin/menu" element={<MenuManagement />} />
              <Route path="/admin/inventory" element={<InventoryManagement />} />
              <Route path="/admin/pos" element={<POS />} />
              <Route path="/admin/reports" element={<OrderReportsPage />} />
              <Route path="/admin/day-close" element={<DayClosePage />} />
              <Route path="/admin/staff" element={<StaffManagement />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>

          {/* SuperAdmin */}
          <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
            <Route element={<AdminLayout />}>
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
