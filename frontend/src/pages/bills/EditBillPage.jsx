import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import billService from '../../services/billService';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { BILL_STATUS, CHARGE_TYPES, MONTHS } from '../../config/constants';
import { buildChargesPayload, flattenChargesToForm } from '../../utils/chargeTransformers';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessages';

export default function EditBillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bill, setBill] = useState(null);
  const [charges, setCharges] = useState({});
  const [form, setForm] = useState({
    dueDate: '', previousBalance: 0, notes: '', status: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    billService.getById(id).then((data) => {
      const b = data.bill;
      setBill(b);

      setCharges(flattenChargesToForm(b.charges));

      setForm({
        dueDate: b.dueDate ? b.dueDate.slice(0, 10) : '',
        previousBalance: b.previousBalance || 0,
        notes: b.notes || '',
        status: b.status || 'draft',
      });
    }).catch(() => toast.error('Failed to load bill')).finally(() => setLoading(false));
  }, [id]);

  const handleChargeChange = (key, value) => {
    setCharges((prev) => {
      const next = { ...prev };
      if (value === '' || Number(value) === 0) delete next[key];
      else next[key] = Number(value);
      return next;
    });
  };

  const total = Object.values(charges).reduce((s, v) => s + (Number(v) || 0), 0) + Number(form.previousBalance || 0);

  const validate = () => {
    const e = {};
    if (!form.dueDate) e.dueDate = 'Required';
    if (Object.keys(charges).length === 0) e.charges = 'Add at least one charge';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await billService.update(id, {
        charges: buildChargesPayload(charges),
        previousBalance: Number(form.previousBalance) || 0,
        dueDate: form.dueDate,
        notes: form.notes,
        status: form.status,
      });
      toast.success('Bill updated');
      navigate(`/bills/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update bill'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!bill) return <p className="text-slate-500">Bill not found.</p>;

  // Determine which statuses the owner can transition to
  const allowedStatuses = BILL_STATUS.filter((s) => {
    if (bill.status === 'draft') return ['draft', 'issued', 'cancelled'].includes(s.value);
    if (bill.status === 'issued') return ['issued', 'overdue', 'cancelled'].includes(s.value);
    if (bill.status === 'partial') return ['partial', 'overdue', 'cancelled'].includes(s.value);
    if (bill.status === 'overdue') return ['overdue', 'cancelled'].includes(s.value);
    return s.value === bill.status;
  });

  return (
    <div className="max-w-2xl">
      <BackButton to={`/bills/${id}`} label="Bill Details" />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Edit Bill</h1>
      <p className="text-slate-500 mb-6">
        {bill.tenant?.user?.firstName} {bill.tenant?.user?.lastName} · {MONTHS[bill.billingPeriod?.month - 1]} {bill.billingPeriod?.year}
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} error={errors.dueDate} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={allowedStatuses} />
          </div>

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Charges</p>
          {errors.charges && <p className="text-sm text-rose-600">{errors.charges}</p>}

          <div className="grid grid-cols-2 gap-3">
            {CHARGE_TYPES.filter((c) => c.key !== 'additionalCharges').map(({ key, label }) => (
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
            <Button variant="ghost" type="button" onClick={() => navigate(`/bills/${id}`)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
