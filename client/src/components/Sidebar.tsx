import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Utensils,
  Receipt,
  FileBarChart,
  UserCog,
  CalendarClock,
  ChefHat,
  Warehouse
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';

type SidebarLink = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  path: string;
  end?: boolean;
};

const superAdminLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/superadmin', end: true },
  { icon: Store, label: 'Restaurants', path: '/superadmin/restaurants' },
  { icon: CreditCard, label: 'Plans', path: '/superadmin/plans' },
  { icon: Users, label: 'Users', path: '/superadmin/users' }
];

const ownerLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', end: true },
  { icon: Receipt, label: 'POS / Billing', path: '/admin/pos' },
  { icon: Users, label: 'Tables', path: '/admin/tables' },
  { icon: FileBarChart, label: 'Orders & payments', path: '/admin/reports' },
  { icon: CalendarClock, label: 'Day close', path: '/admin/day-close' },
  { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
  { icon: Utensils, label: 'Menu', path: '/admin/menu' },
  { icon: Warehouse, label: 'Inventory', path: '/admin/inventory' },
  { icon: UserCog, label: 'Staff', path: '/admin/staff' },
  { icon: ChefHat, label: 'Kitchen', path: '/kitchen' },
  { icon: Store, label: 'My Restaurant', path: '/admin/profile' }
];

const managerLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', end: true },
  { icon: Receipt, label: 'POS / Billing', path: '/admin/pos' },
  { icon: Users, label: 'Tables', path: '/admin/tables' },
  { icon: FileBarChart, label: 'Orders & payments', path: '/admin/reports' },
  { icon: CalendarClock, label: 'Day close', path: '/admin/day-close' },
  { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
  { icon: Utensils, label: 'Menu', path: '/admin/menu' },
  { icon: Warehouse, label: 'Inventory', path: '/admin/inventory' },
  { icon: ChefHat, label: 'Kitchen', path: '/kitchen' }
];

const waiterLinks: SidebarLink[] = [
  { icon: Receipt, label: 'POS / Billing', path: '/admin/pos' },
  { icon: ChefHat, label: 'Kitchen', path: '/kitchen' }
];

const cashierLinks: SidebarLink[] = [{ icon: Receipt, label: 'POS / Billing', path: '/admin/pos' }];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { user, logout } = useAuthStore();
  const role = user?.role;

  let links: SidebarLink[] = superAdminLinks;
  if (role === 'ADMIN') {
    links = ownerLinks;
  } else if (role === 'MANAGER') {
    links = managerLinks;
  } else if (role === 'WAITER') {
    links = waiterLinks;
  } else if (role === 'CASHIER') {
    links = cashierLinks;
  }

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="h-screen sticky top-0 bg-stone-900 text-white flex flex-col transition-all duration-300"
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xl font-serif font-bold text-primary">ReserveTable</span>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={Boolean(link.end)}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
              ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <link.icon size={20} />
            {!isCollapsed && <span className="font-medium">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-primary font-bold">
            {user?.name?.[0]}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-danger hover:bg-red-500/5 transition-all"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
