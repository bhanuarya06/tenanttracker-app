import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import tenantService from '../../services/tenantService';
import { updateTenant } from '../../store/slices/tenantSlice';
import { fetchProperties } from '../../store/slices/propertySlice';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { RENT_TYPES, TENANT_STATUS } from '../../config/constants';
import { TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessages';

export default function EditTenantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalRent, setOriginalRent] = useState(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '',
    unit: '', monthlyRent: '', rentType: 'monthly',
    occupantCount: 1, status: 'active',
    leaseStart: '', leaseEnd: '', securityDeposit: '',
    moveInDate: '', moveOutDate: '',
    lateFeeEnabled: false,
    rentChangeReason: '', rentEffectiveDate: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    tenantService.getById(id).then((data) => {
      const t = data.tenant;
      const user = t.user || {};
      setOriginalRent(t.monthlyRent || 0);
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        unit: t.unit || '',
        monthlyRent: t.monthlyRent || '',
        rentType: t.rentType || 'monthly',
        occupantCount: t.occupantCount || 1,
        status: t.status || 'active',
        leaseStart: t.leaseDetails?.startDate ? t.leaseDetails.startDate.slice(0, 10) : '',
        leaseEnd: t.leaseDetails?.endDate ? t.leaseDetails.endDate.slice(0, 10) : '',
        securityDeposit: t.securityDeposit || '',
        moveInDate: t.moveInDate ? t.moveInDate.slice(0, 10) : '',
        moveOutDate: t.moveOutDate ? t.moveOutDate.slice(0, 10) : '',
        lateFeeEnabled: t.lateFeeEnabled || false,
        rentChangeReason: '', rentEffectiveDate: '',
      });
    }).catch(() => toast.error('Failed to load tenant')).finally(() => setLoading(false));
  }, [id]);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: '' });
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.unit.trim()) e.unit = 'Required';
    if (!form.monthlyRent || form.monthlyRent <= 0) e.monthlyRent = 'Required';
    if (form.rentType === 'lease') {
      if (!form.leaseStart) e.leaseStart = 'Required for lease';
      if (!form.leaseEnd) e.leaseEnd = 'Required for lease';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const rentChanged = Number(form.monthlyRent) !== originalRent;
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        unit: form.unit,
        monthlyRent: Number(form.monthlyRent),
        rentType: form.rentType,
        securityDeposit: Number(form.securityDeposit) || 0,
        occupantCount: Number(form.occupantCount) || 1,
        status: form.status,
        moveInDate: form.moveInDate || undefined,
        moveOutDate: form.moveOutDate || undefined,
        lateFeeEnabled: form.lateFeeEnabled,
        ...(rentChanged && {
          rentChangeReason: form.rentChangeReason,
          rentEffectiveDate: form.rentEffectiveDate || undefined,
        }),
      };
      if (form.rentType === 'lease') {
        payload.leaseDetails = {
          startDate: form.leaseStart,
          endDate: form.leaseEnd,
        };
      }
      await dispatch(updateTenant({ id, data: payload })).unwrap();
      dispatch(fetchProperties({ limit: 100 }));
      toast.success('Tenant updated');
      navigate(`/tenants/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update tenant'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-2xl">
      <BackButton to={`/tenants/${id}`} label="Tenant Profile" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Tenant</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm font-medium text-slate-700">Tenant Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Input label="Last name" value={form.lastName} onChange={set('lastName')} />
          </div>
          <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} />

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Rental Details</p>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Unit number" value={form.unit} onChange={set('unit')} error={errors.unit} />
            <Input label="Monthly rent (₹)" type="number" min="0" value={form.monthlyRent} onChange={set('monthlyRent')} error={errors.monthlyRent} />
          </div>

          {originalRent !== null && Number(form.monthlyRent) !== originalRent && Number(form.monthlyRent) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <TrendingUp size={15} />
                <span className="text-sm font-medium">
                  Rent changing from ₹{originalRent.toLocaleString()} → ₹{Number(form.monthlyRent).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Reason (optional)" value={form.rentChangeReason} onChange={set('rentChangeReason')} placeholder="Annual revision, market rate..." />
                <Input label="Effective from" type="date" value={form.rentEffectiveDate} onChange={set('rentEffectiveDate')} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Select label="Rent type" value={form.rentType} onChange={set('rentType')} options={RENT_TYPES} />
            <Input label="Occupants" type="number" min="1" value={form.occupantCount} onChange={set('occupantCount')} />
            <Select label="Status" value={form.status} onChange={set('status')} options={TENANT_STATUS} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Security deposit / Advance (₹)" type="number" min="0" value={form.securityDeposit} onChange={set('securityDeposit')} placeholder="0" />
            <Input label="Move-in date" type="date" value={form.moveInDate} onChange={set('moveInDate')} />
            <Input label="Move-out date" type="date" value={form.moveOutDate} onChange={set('moveOutDate')} />
          </div>

          {form.rentType === 'lease' && (
            <>
              <hr className="border-slate-200" />
              <p className="text-sm font-medium text-slate-700">Lease Details</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lease start" type="date" value={form.leaseStart} onChange={set('leaseStart')} error={errors.leaseStart} />
                <Input label="Lease end" type="date" value={form.leaseEnd} onChange={set('leaseEnd')} error={errors.leaseEnd} />
              </div>
            </>
          )}

          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Late fee</p>
              <p className="text-xs text-slate-500">Charge late fee when rent is overdue</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, lateFeeEnabled: !form.lateFeeEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.lateFeeEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.lateFeeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`/tenants/${id}`)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
