import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-serif font-bold text-primary">ReserveTable</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 hover:text-primary font-medium">Home</Link>
            <Link to="/explore" className="text-gray-600 hover:text-primary font-medium">Explore</Link>
            <Link to="/recipes" className="text-gray-600 hover:text-primary font-medium">Recipes</Link>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link 
                  to={user?.role === 'SUPERADMIN' ? '/superadmin' : user?.role === 'ADMIN' ? '/admin' : '/my-bookings'}
                  className="flex items-center gap-2 text-secondary font-semibold"
                >
                  <User className="w-5 h-5" />
                  {user?.name}
                </Link>
                <button onClick={handleLogout} className="text-muted hover:text-danger">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="px-4 py-2 text-primary font-semibold hover:text-orange-600">Login</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-gray-600">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-orange-100 p-4 space-y-4">
          <Link to="/" className="block text-gray-600 font-medium">Home</Link>
          <Link to="/explore" className="block text-gray-600 font-medium">Explore</Link>
          <Link to="/recipes" className="block text-gray-600 font-medium">Recipes</Link>
          <div className="pt-4 border-t border-gray-100">
            {isAuthenticated ? (
              <button onClick={handleLogout} className="flex items-center gap-2 text-danger font-medium">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            ) : (
              <div className="space-y-3">
                <Link to="/login" className="block w-full text-center py-2 text-primary font-semibold">Login</Link>
                <Link to="/register" className="block w-full text-center btn-primary">Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
