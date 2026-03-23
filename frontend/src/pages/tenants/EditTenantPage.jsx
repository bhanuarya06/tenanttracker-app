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
import toast from 'react-hot-toast';

export default function EditTenantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '',
    unit: '', monthlyRent: '', rentType: 'monthly',
    occupantCount: 1, status: 'active',
    leaseStart: '', leaseEnd: '', securityDeposit: '',
    moveInDate: '', moveOutDate: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    tenantService.getById(id).then((data) => {
      const t = data.tenant;
      const user = t.user || {};
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
        securityDeposit: t.leaseDetails?.securityDeposit || '',
        moveInDate: t.moveInDate ? t.moveInDate.slice(0, 10) : '',
        moveOutDate: t.moveOutDate ? t.moveOutDate.slice(0, 10) : '',
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
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        unit: form.unit,
        monthlyRent: Number(form.monthlyRent),
        rentType: form.rentType,
        occupantCount: Number(form.occupantCount) || 1,
        status: form.status,
        moveInDate: form.moveInDate || undefined,
        moveOutDate: form.moveOutDate || undefined,
      };
      if (form.rentType === 'lease') {
        payload.leaseDetails = {
          startDate: form.leaseStart,
          endDate: form.leaseEnd,
          ...(form.securityDeposit && { securityDeposit: Number(form.securityDeposit) }),
        };
      }
      await dispatch(updateTenant({ id, data: payload })).unwrap();
      dispatch(fetchProperties({ limit: 100 }));
      toast.success('Tenant updated');
      navigate(`/tenants/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tenant');
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

          <div className="grid grid-cols-3 gap-4">
            <Select label="Rent type" value={form.rentType} onChange={set('rentType')} options={RENT_TYPES} />
            <Input label="Occupants" type="number" min="1" value={form.occupantCount} onChange={set('occupantCount')} />
            <Select label="Status" value={form.status} onChange={set('status')} options={TENANT_STATUS} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Move-in date" type="date" value={form.moveInDate} onChange={set('moveInDate')} />
            <Input label="Move-out date" type="date" value={form.moveOutDate} onChange={set('moveOutDate')} />
          </div>

          {form.rentType === 'lease' && (
            <>
              <hr className="border-slate-200" />
              <p className="text-sm font-medium text-slate-700">Lease Details</p>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Lease start" type="date" value={form.leaseStart} onChange={set('leaseStart')} error={errors.leaseStart} />
                <Input label="Lease end" type="date" value={form.leaseEnd} onChange={set('leaseEnd')} error={errors.leaseEnd} />
                <Input label="Security deposit (₹)" type="number" min="0" value={form.securityDeposit} onChange={set('securityDeposit')} />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => navigate(`/tenants/${id}`)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
