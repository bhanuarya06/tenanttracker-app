import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createBill } from '../../store/slices/billSlice';
import tenantService from '../../services/tenantService';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { CHARGE_TYPES, MONTHS } from '../../config/constants';
import toast from 'react-hot-toast';

export default function AddBillPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const preselectedTenant = searchParams.get('tenant');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const now = new Date();

  const [form, setForm] = useState({
    tenant: preselectedTenant || '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    dueDate: '',
    previousBalance: 0,
    notes: '',
  });
  const [charges, setCharges] = useState({ rent: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    tenantService.getAll({ limit: 100, status: 'active' }).then((d) => setTenants(d.tenants || []));
  }, []);

  // Auto-fill rent when tenant selected
  useEffect(() => {
    if (form.tenant) {
      const t = tenants.find((t) => t._id === form.tenant);
      if (t?.monthlyRent) setCharges((prev) => ({ ...prev, rent: t.monthlyRent }));
    }
  }, [form.tenant, tenants]);

  const handleChargeChange = (key, value) => {
    setCharges((prev) => {
      const next = { ...prev };
      if (value === '' || value === 0) delete next[key];
      else next[key] = Number(value);
      return next;
    });
  };

  const total = Object.values(charges).reduce((s, v) => s + (Number(v) || 0), 0) + Number(form.previousBalance || 0);

  const validate = () => {
    const e = {};
    if (!form.tenant) e.tenant = 'Required';
    if (!form.dueDate) e.dueDate = 'Required';
    if (Object.keys(charges).length === 0) e.charges = 'Add at least one charge';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await dispatch(createBill({
        tenant: form.tenant,
        billingPeriod: { month: Number(form.month), year: Number(form.year) },
        charges,
        previousBalance: Number(form.previousBalance) || 0,
        dueDate: form.dueDate,
        notes: form.notes,
      })).unwrap();
      toast.success('Bill created');
      navigate('/bills');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <BackButton to="/bills" label="Bills" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create Bill</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Tenant" value={form.tenant}
            onChange={(e) => setForm({ ...form, tenant: e.target.value })}
            error={errors.tenant} placeholder="Select tenant"
            options={tenants.map((t) => ({
              value: t._id,
              label: `${t.user?.firstName} ${t.user?.lastName} — ${t.property?.name || 'N/A'} Unit ${t.unit || ''}`,
            }))}
          />

          <div className="grid grid-cols-3 gap-4">
            <Select label="Month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
              options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} />
            <Input label="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} error={errors.dueDate} />
          </div>

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Charges</p>
          {errors.charges && <p className="text-sm text-rose-600">{errors.charges}</p>}

          <div className="grid grid-cols-2 gap-3">
            {CHARGE_TYPES.map(({ key, label }) => (
              <Input
                key={key} label={label} type="number" min="0" placeholder="0"
                value={charges[key] || ''}
                onChange={(e) => handleChargeChange(key, e.target.value)}
              />
            ))}
          </div>

          <Input label="Previous balance (₹)" type="number" value={form.previousBalance}
            onChange={(e) => setForm({ ...form, previousBalance: e.target.value })} />

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <span className="font-medium text-slate-700">Total Amount</span>
            <span className="text-xl font-bold text-slate-900">₹{total.toLocaleString()}</span>
          </div>

          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/bills')}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Bill</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
