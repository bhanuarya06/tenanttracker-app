import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Eye, EyeOff } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'owner' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email) e.email = 'Email is required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await register(data);
      navigate('/dashboard');
    } catch {
      // handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <Home className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TenantTracker</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">Start managing in minutes</h1>
          <p className="text-lg text-slate-400">Free to get started. Set up your properties, add tenants, and take control.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">TenantTracker</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-slate-500 mb-8">Get started for free</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
              <Input label="Last name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
            </div>
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
            <Select
              label="I am a..."
              value={form.role} onChange={set('role')}
              options={[{ value: 'owner', label: 'Property Owner' }, { value: 'tenant', label: 'Tenant' }]}
            />
            <div className="relative">
              <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                     value={form.password} onChange={set('password')} error={errors.password} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-9 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Input label="Confirm password" type="password" placeholder="••••••••"
                   value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
          </form>

          <SocialLoginButtons mode="register" />

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account? <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
