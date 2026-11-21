import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiRequest, setStoredToken, setStoredUser } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (res.success && res.token) {
        setStoredToken(res.token);
        setStoredUser(res.user);
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1D23] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white border border-[#E4E7EB] rounded-2xl p-7 shadow-sm space-y-5">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="w-11 h-11 mx-auto rounded-xl bg-[#1A73C7] flex items-center justify-center text-white font-bold text-lg shadow-xs">
            SP
          </div>
          <h1 className="text-xl font-bold text-[#1A1D23] tracking-tight">SPTech Admin</h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-semibold">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#E4E7EB] focus:border-[#1A73C7] focus:bg-white rounded-xl px-3.5 py-2.5 text-[#1A1D23] font-medium outline-none transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#E4E7EB] focus:border-[#1A73C7] focus:bg-white rounded-xl px-3.5 py-2.5 text-[#1A1D23] font-medium outline-none transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#1A73C7] hover:bg-[#0F4C81] disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#E4E7EB]">
          <Link
            to="/kiosk"
            className="text-xs text-[#1A73C7] font-semibold hover:underline"
          >
            Kiosk Terminal
          </Link>
        </div>
      </div>
    </div>
  );
};
