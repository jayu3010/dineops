import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      if (response.data.success) {
        toast.success('Account created! Please login.');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-secondary mb-2">Join ReserveTable</h1>
          <p className="text-muted text-sm">Create an account to start booking</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                required
                className="input-field pl-11"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                className="input-field pl-11"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                className="input-field pl-11"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => setRole('USER')}
              className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                role === 'USER' ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole('ADMIN')}
              className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                role === 'ADMIN' ? 'bg-primary text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Restaurant Owner
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
