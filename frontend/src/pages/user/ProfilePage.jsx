import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import authService from '../../services/authService';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import ImageUpload from '../../components/ui/ImageUpload';
import toast from 'react-hot-toast';

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    avatar: user?.avatar || null,
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
    bio: user?.bio || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || 'India',
    },
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setAddress = (field) => (e) => setForm({ ...form, address: { ...form.address, [field]: e.target.value } });
  const setPw = (field) => (e) => setPwForm({ ...pwForm, [field]: e.target.value });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || undefined,
      };
      await updateProfile(payload);
    } catch {
      // handled in useAuth
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      {/* Avatar & Basic Info */}
      <Card>
        <Card.Title>Personal Information</Card.Title>
        <form onSubmit={handleProfileUpdate} className="space-y-5 mt-4">
          <div className="flex items-center gap-6">
            <ImageUpload
              value={form.avatar}
              onChange={(url) => setForm({ ...form, avatar: url })}
              shape="circle"
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-900">{user?.fullName || `${form.firstName} ${form.lastName}`.trim()}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>

          <hr className="border-slate-200" />

          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={form.firstName} onChange={set('firstName')} />
            <Input label="Last name" value={form.lastName} onChange={set('lastName')} />
          </div>
          <Input label="Email" type="email" value={user?.email || ''} disabled />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
            <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          </div>
          <Select label="Gender" value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
            <textarea
              value={form.bio}
              onChange={set('bio')}
              maxLength={500}
              rows={3}
              placeholder="Tell us a bit about yourself..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500/20 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{form.bio.length}/500</p>
          </div>

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Address</p>

          <Input label="Street" value={form.address.street} onChange={setAddress('street')} placeholder="123 Main Street" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={form.address.city} onChange={setAddress('city')} />
            <Input label="State" value={form.address.state} onChange={setAddress('state')} />
            <Input label="ZIP Code" value={form.address.zipCode} onChange={setAddress('zipCode')} />
          </div>
          <Input label="Country" value={form.address.country} onChange={setAddress('country')} />

          <div className="flex justify-end">
            <Button type="submit" loading={loading}>Save changes</Button>
          </div>
        </form>
      </Card>

      {/* Linked Accounts */}
      {user?.oauthProviders?.length > 0 && (
        <Card>
          <Card.Title>Linked Accounts</Card.Title>
          <div className="mt-4 space-y-3">
            {user.oauthProviders.map((p) => (
              <div key={p.provider} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <span className="text-lg">{p.provider === 'google' ? '🔵' : '⚫'}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900 capitalize">{p.provider}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
                <span className="ml-auto text-xs text-emerald-600 font-medium">Connected</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Hide password section for OAuth-only users (they have no local password) */}
      {!(user?.oauthProviders?.length > 0 && !user?.hasPassword) && (
        <Card>
          <Card.Title>Change Password</Card.Title>
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
            <Input label="Current password" type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} />
            <Input label="New password" type="password" value={pwForm.newPassword} onChange={setPw('newPassword')} />
            <Input label="Confirm new password" type="password" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} />
            <div className="flex justify-end">
              <Button type="submit" loading={pwLoading}>Change password</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
