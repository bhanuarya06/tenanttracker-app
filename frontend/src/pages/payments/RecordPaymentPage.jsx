import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { PAYMENT_METHODS } from '../../config/constants';
import { fetchTenants } from '../../store/slices/tenantSlice';
import { fetchBills } from '../../store/slices/billSlice';
import { createPayment } from '../../store/slices/paymentSlice';

export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const prefillBill = searchParams.get('bill');

  const { items: tenants } = useSelector((s) => s.tenants);
  const { items: bills } = useSelector((s) => s.bills);

  const [form, setForm] = useState({
    tenant: '', bill: prefillBill || '', amount: '', method: 'cash',
    paymentDate: new Date().toISOString().split('T')[0], transactionId: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tenantBills, setTenantBills] = useState([]);

  useEffect(() => { dispatch(fetchTenants({ limit: 100 })); }, [dispatch]);

  // When a bill is prefilled, load that bill's tenant
  useEffect(() => {
    if (prefillBill && bills.length === 0) {
      dispatch(fetchBills({ limit: 100 }));
    }
  }, [prefillBill, bills.length, dispatch]);

  useEffect(() => {
    if (prefillBill && bills.length > 0) {
      const bill = bills.find((b) => b._id === prefillBill);
      if (bill) {
        setForm((f) => ({
          ...f,
          tenant: bill.tenant?._id || bill.tenant || '',
          bill: prefillBill,
          amount: String((bill.totalAmount || 0) - (bill.paidAmount || 0)),
        }));
      }
    }
  }, [prefillBill, bills]);

  // Filter bills for selected tenant
  useEffect(() => {
    if (form.tenant) {
      const filtered = bills.filter(
        (b) => (b.tenant?._id || b.tenant) === form.tenant && b.status !== 'paid'
      );
      setTenantBills(filtered);
    } else {
      setTenantBills([]);
    }
  }, [form.tenant, bills]);

  // Load all bills when tenant changes
  useEffect(() => {
    if (form.tenant && bills.length === 0) {
      dispatch(fetchBills({ limit: 100 }));
    }
  }, [form.tenant, bills.length, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));

    // Auto-fill amount when bill selected
    if (name === 'bill' && value) {
      const bill = bills.find((b) => b._id === value);
      if (bill) {
        setForm((f) => ({
          ...f,
          bill: value,
          amount: String((bill.totalAmount || 0) - (bill.paidAmount || 0)),
        }));
      }
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.tenant) errs.tenant = 'Select a tenant';
    if (!form.bill) errs.bill = 'Select a bill';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!form.method) errs.method = 'Select payment method';
    if (!form.paymentDate) errs.paymentDate = 'Select payment date';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await dispatch(createPayment({
        bill: form.bill,
        amount: Number(form.amount),
        paymentMethod: form.method,
        paymentDate: form.paymentDate,
        transactionId: form.transactionId || undefined,
        notes: form.notes || undefined,
      })).unwrap();
      dispatch(fetchBills({ limit: 100 }));
      toast.success('Payment recorded successfully!');
      navigate('/payments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton />
      <h1 className="text-2xl font-bold text-slate-900">Record Payment</h1>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Select label="Tenant *" name="tenant" value={form.tenant} onChange={handleChange} error={errors.tenant}>
            <option value="">Select tenant</option>
            {tenants.map((t) => (
              <option key={t._id} value={t._id}>
                {t.user?.firstName} {t.user?.lastName} — {t.property?.name}
              </option>
            ))}
          </Select>

          {form.tenant && (
            <Select label="Bill *" name="bill" value={form.bill} onChange={handleChange} error={errors.bill}>
              <option value="">Select a bill</option>
              {tenantBills.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.billingPeriod?.month}/{b.billingPeriod?.year} — ₹{b.totalAmount?.toLocaleString()} (Due: ₹{((b.totalAmount || 0) - (b.paidAmount || 0)).toLocaleString()})
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹) *" name="amount" type="number" value={form.amount}
              onChange={handleChange} error={errors.amount} min="1" />
            <Select label="Method *" name="method" value={form.method} onChange={handleChange} error={errors.method}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Payment Date *" name="paymentDate" type="date" value={form.paymentDate}
              onChange={handleChange} error={errors.paymentDate} />
            <Input label="Transaction ID" name="transactionId" value={form.transactionId}
              onChange={handleChange} placeholder="Reference / UTR" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              placeholder="Optional note about this payment" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Record Payment</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
