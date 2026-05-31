import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Eye, EyeOff, Building2, User } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('owner'); // 'owner' | 'tenant'
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch {
      // toast handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrors({});
  };

  const isOwner = mode === 'owner';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className={`hidden lg:flex lg:w-1/2 items-center justify-center p-12 transition-colors duration-500
          ${isOwner ? 'bg-slate-900' : 'bg-violet-950'}`}
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isOwner ? 'bg-primary-600' : 'bg-violet-500'}`}>
              {isOwner ? <Home className="h-7 w-7 text-white" /> : <Building2 className="h-7 w-7 text-white" />}
            </div>
            <Link to="/"><span className="text-2xl font-bold text-white">TenantTracker</span></Link>
          </div>

          {isOwner ? (
            <>
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                Manage your properties with clarity
              </h1>
              <p className="text-lg text-slate-400">
                Track tenants, bills, and payments — all in one clean, intuitive dashboard.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-white leading-tight mb-4">
                Welcome home
              </h1>
              <p className="text-lg text-violet-300 mb-8">
                Access your lease details, view bills, track payments, and stay connected with your landlord.
              </p>
              <div className="space-y-4">
                {[
                  'View your bills and payment history',
                  'Check lease details and status',
                  'Download payment receipts anytime',
                  'Contact your landlord directly',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-violet-400" />
                    </div>
                    <span className="text-violet-200 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <Link to="/"><span className="text-xl font-bold text-slate-900">TenantTracker</span></Link>
          </div>

          {/* Role tab switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-8" role="tablist" aria-label="Login mode">
            <button
              type="button"
              role="tab"
              aria-selected={isOwner}
              onClick={() => switchMode('owner')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isOwner
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Building2 size={16} />
              Property Owner
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isOwner}
              onClick={() => switchMode('tenant')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${!isOwner
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <User size={16} />
              Tenant
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {isOwner ? 'Welcome back' : 'Tenant sign in'}
          </h2>
          <p className="text-slate-500 mb-8">
            {isOwner ? 'Sign in to manage your properties' : 'Access your tenant portal'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              autoComplete="email"
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              {isOwner ? 'Sign in' : 'Access tenant portal'}
            </Button>
          </form>

          {/* Social login — owners only */}
          {isOwner && <SocialLoginButtons mode="login" />}

          {/* Tenant help notice */}
          {!isOwner && (
            <div className="mt-6 p-4 bg-violet-50 rounded-xl border border-violet-100">
              <p className="text-xs text-violet-700 leading-relaxed">
                <span className="font-semibold">New tenant?</span>{' '}
                Your landlord will send you login credentials when setting up your tenancy.
                Contact them if you haven&apos;t received access yet.
              </p>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
