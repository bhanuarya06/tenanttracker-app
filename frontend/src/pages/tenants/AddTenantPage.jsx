import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createTenant } from '../../store/slices/tenantSlice';
import { fetchProperties } from '../../store/slices/propertySlice';
import propertyService from '../../services/propertyService';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { RENT_TYPES } from '../../config/constants';
import toast from 'react-hot-toast';

export default function AddTenantPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const preselectedProperty = searchParams.get('property');

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    property: preselectedProperty || '', unitNumber: '', monthlyRent: '',
    rentType: 'monthly', occupantCount: 1,
    leaseStart: '', leaseEnd: '', securityDeposit: '', moveInDate: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    propertyService.getAll({ limit: 100 }).then((data) => setProperties(data.properties || []));
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email) e.email = 'Required';
    if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
    if (!form.property) e.property = 'Required';
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
    setLoading(true);
    try {
      const payload = {
        user: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        },
        property: form.property,
        unit: form.unitNumber,
        monthlyRent: Number(form.monthlyRent),
        rentType: form.rentType,
        occupantCount: Number(form.occupantCount) || 1,
        moveInDate: form.moveInDate || undefined,
      };
      if (form.rentType === 'lease') {
        payload.leaseDetails = {
          startDate: form.leaseStart,
          endDate: form.leaseEnd,
          ...(form.securityDeposit && { securityDeposit: Number(form.securityDeposit) }),
        };
      }
      await dispatch(createTenant(payload)).unwrap();
      dispatch(fetchProperties({ limit: 100 }));
      toast.success('Tenant added');
      navigate('/tenants');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <BackButton to="/tenants" label="Tenants" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Tenant</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm font-medium text-slate-700">Tenant Information</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
            <Input label="Last name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
          </div>
          <Input label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} placeholder="Min 8 characters" />

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Rental Details</p>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Property" value={form.property} onChange={set('property')} error={errors.property}
              placeholder="Select property"
              options={properties.map((p) => ({ value: p._id, label: `${p.name} (${p.availableUnits} available)` }))}
            />
            <Input label="Unit number" value={form.unitNumber} onChange={set('unitNumber')} placeholder="A-101" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Monthly rent (₹)" type="number" min="0" value={form.monthlyRent} onChange={set('monthlyRent')} error={errors.monthlyRent} />
            <Select label="Rent type" value={form.rentType} onChange={set('rentType')} options={RENT_TYPES} />
            <Input label="Occupants" type="number" min="1" value={form.occupantCount} onChange={set('occupantCount')} />
          </div>
          <Input label="Move-in date" type="date" value={form.moveInDate} onChange={set('moveInDate')} />

          {form.rentType === 'lease' && (
            <>
              <hr className="border-slate-200" />
              <p className="text-sm font-medium text-slate-700">Lease Details</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lease start" type="date" value={form.leaseStart} onChange={set('leaseStart')} error={errors.leaseStart} />
                <Input label="Lease end" type="date" value={form.leaseEnd} onChange={set('leaseEnd')} error={errors.leaseEnd} />
              </div>
              <Input label="Security deposit (₹)" type="number" min="0" value={form.securityDeposit} onChange={set('securityDeposit')} />
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/tenants')}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Tenant</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
