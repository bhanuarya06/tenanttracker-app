import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Edit3, Trash2, Receipt, Phone, Mail, TrendingUp, ShieldCheck, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import tenantService from '../../services/tenantService';
import { deleteTenant } from '../../store/slices/tenantSlice';
import { fetchProperties } from '../../store/slices/propertySlice';
import BackButton from '../../components/ui/BackButton';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { TENANT_STATUS } from '../../config/constants';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessages';

export default function TenantProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState('');
  const [depositForm, setDepositForm] = useState({ amount: '', date: '', reason: '' });
  const [deductionForm, setDeductionForm] = useState({ category: 'Painting', description: '', amount: '' });
  const [refundForm, setRefundForm] = useState({ status: 'pending', paidAmount: '', paidDate: '', paymentMode: 'cash', notes: '' });
  const [showAddDeposit, setShowAddDeposit] = useState(false);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  useEffect(() => {
    tenantService.getById(id).then((data) => {
      setTenant(data.tenant);
      const t = data.tenant;
      if (t.depositRefund) {
        setRefundForm({
          status: t.depositRefund.status || 'pending',
          paidAmount: t.depositRefund.paidAmount || '',
          paidDate: t.depositRefund.paidDate ? t.depositRefund.paidDate.slice(0, 10) : '',
          paymentMode: t.depositRefund.paymentMode || 'cash',
          notes: t.depositRefund.notes || '',
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteTenant(id)).unwrap();
      dispatch(fetchProperties({ limit: 100 }));
      toast.success('Tenant removed');
      navigate('/tenants');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove tenant'));
    } finally { setDeleting(false); setShowDelete(false); }
  };

  const handleAddDeposit = async (e) => {
    e.preventDefault();
    if (!depositForm.amount || !depositForm.date) return toast.error('Amount and date are required');
    setDepositLoading(true);
    try {
      const data = await tenantService.addDeposit(id, depositForm);
      setTenant((prev) => ({ ...prev, depositAdditions: data.depositAdditions }));
      setDepositForm({ amount: '', date: '', reason: '' });
      setShowAddDeposit(false);
      toast.success('Deposit added');
    } catch { toast.error('Failed to add deposit'); }
    finally { setDepositLoading(false); }
  };

  const handleAddDeduction = async (e) => {
    e.preventDefault();
    if (!deductionForm.amount) return toast.error('Amount is required');
    setDepositLoading(true);
    try {
      const data = await tenantService.addDeduction(id, deductionForm);
      setTenant((prev) => ({ ...prev, depositDeductions: data.depositDeductions }));
      setDeductionForm({ category: 'Painting', description: '', amount: '' });
      setShowAddDeduction(false);
      toast.success('Deduction added');
    } catch { toast.error('Failed to add deduction'); }
    finally { setDepositLoading(false); }
  };

  const handleRefundSave = async (e) => {
    e.preventDefault();
    setDepositLoading(true);
    try {
      const data = await tenantService.updateDepositRefund(id, refundForm);
      setTenant((prev) => ({ ...prev, depositRefund: data.depositRefund }));
      setShowRefund(false);
      toast.success('Refund updated');
    } catch { toast.error('Failed to update refund'); }
    finally { setDepositLoading(false); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      const data = await tenantService.addNote(id, note);
      setTenant((prev) => ({ ...prev, notes: data.tenant?.notes || prev.notes }));
      setNote('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  if (loading) return <PageLoader />;
  if (!tenant) return <p className="text-slate-500">Tenant not found.</p>;

  const statusInfo = TENANT_STATUS.find((s) => s.value === tenant.status);
  const user = tenant.user || {};

  return (
    <div className="max-w-4xl space-y-6">
      <BackButton to="/tenants" label="Tenants" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xl font-bold text-primary-700">{user.firstName?.[0]}{user.lastName?.[0]}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.firstName} {user.lastName}</h1>
            <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/tenants/${id}/edit`}><Button variant="outline" size="sm"><Edit3 size={16} /> Edit</Button></Link>
          <Link to={`/bills/add?tenant=${id}`}><Button size="sm"><Receipt size={16} /> Create Bill</Button></Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}><Trash2 size={16} /></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <Card.Title>Contact</Card.Title>
          <div className="space-y-3 mt-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><Mail size={16} /> {user.email}</div>
            {user.phone && <div className="flex items-center gap-2 text-slate-600"><Phone size={16} /> {user.phone}</div>}
          </div>
        </Card>

        <Card>
          <Card.Title>Rental Info</Card.Title>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div><span className="text-slate-500">Property:</span> <Link to={`/properties/${tenant.property?._id || tenant.property}`} className="font-medium text-primary-600 hover:underline">{tenant.property?.name || '—'}</Link></div>
            <div><span className="text-slate-500">Unit:</span> <span className="font-medium">{tenant.unit || '—'}</span></div>
            <div><span className="text-slate-500">Rent:</span> <span className="font-medium">₹{tenant.monthlyRent?.toLocaleString()}/mo</span></div>
            <div><span className="text-slate-500">Type:</span> <span className="font-medium capitalize">{tenant.rentType}</span></div>
            <div><span className="text-slate-500">Occupants:</span> <span className="font-medium">{tenant.occupantCount || 1}</span></div>
            {tenant.moveInDate && <div><span className="text-slate-500">Move-in:</span> <span className="font-medium">{new Date(tenant.moveInDate).toLocaleDateString()}</span></div>}
            {tenant.securityDeposit > 0 && (
              <div><span className="text-slate-500">Security deposit:</span> <span className="font-medium text-violet-700">₹{tenant.securityDeposit.toLocaleString()}</span></div>
            )}
          </div>
        </Card>
      </div>

      {tenant.rentType === 'lease' && tenant.leaseDetails && (
        <Card>
          <Card.Title>Lease Details</Card.Title>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <span className="text-slate-500">Start:</span>
              <span className="font-medium ml-1">{new Date(tenant.leaseDetails.startDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500">End:</span>
              <span className="font-medium ml-1">{new Date(tenant.leaseDetails.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Financial Summary */}
      {tenant.financialSummary && (
        <Card>
          <Card.Title>Financial Summary</Card.Title>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xl font-bold text-slate-900">₹{(tenant.financialSummary.totalBilled || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Billed</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-xl font-bold text-emerald-700">₹{(tenant.financialSummary.totalPaid || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Paid</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-xl font-bold text-amber-700">₹{(tenant.financialSummary.balance || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Outstanding</p>
            </div>
          </div>
        </Card>
      )}

      {/* Security Deposit */}
      {(() => {
        const totalDeposit = (tenant.securityDeposit || 0) + (tenant.depositAdditions || []).reduce((s, a) => s + a.amount, 0);
        const totalDeductions = (tenant.depositDeductions || []).reduce((s, d) => s + d.amount, 0);
        const netRefund = totalDeposit - totalDeductions;
        const refund = tenant.depositRefund;
        const refundStatusColor = { pending: 'bg-amber-100 text-amber-700', partial: 'bg-blue-100 text-blue-700', refunded: 'bg-emerald-100 text-emerald-700' };

        return (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-violet-500" />
                <Card.Title>Security Deposit</Card.Title>
              </div>
              <button onClick={() => setShowAddDeposit((v) => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={13} /> Add to Deposit
                {showAddDeposit ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-violet-50 rounded-xl">
                <p className="text-lg font-bold text-violet-700">₹{totalDeposit.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Held</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-lg font-bold text-red-600">₹{totalDeductions.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Deductions</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl">
                <p className="text-lg font-bold text-emerald-700">₹{netRefund.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Net Refund</p>
              </div>
            </div>

            {/* Deposit breakdown */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm px-1">
                <span className="text-slate-500">Initial deposit</span>
                <span className="font-medium">₹{(tenant.securityDeposit || 0).toLocaleString()}</span>
              </div>
              {(tenant.depositAdditions || []).map((a, i) => (
                <div key={i} className="flex justify-between text-sm px-1">
                  <span className="text-slate-500">
                    + Added {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {a.reason && <span className="text-slate-400"> · {a.reason}</span>}
                  </span>
                  <span className="font-medium text-violet-600">₹{a.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Add deposit inline form */}
            {showAddDeposit && (
              <form onSubmit={handleAddDeposit} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">Add to Deposit</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                    <input type="number" min="1" value={depositForm.amount}
                      onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5000" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                    <input type="date" value={depositForm.date}
                      onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reason (optional)</label>
                  <input value={depositForm.reason}
                    onChange={(e) => setDepositForm({ ...depositForm, reason: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rent increase adjustment..." />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddDeposit(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                  <Button type="submit" size="sm" loading={depositLoading}>Add</Button>
                </div>
              </form>
            )}

            {/* Deductions */}
            {(tenant.depositDeductions || []).length > 0 && (
              <div className="border-t border-slate-100 pt-3 mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Deductions</p>
                <div className="space-y-1">
                  {tenant.depositDeductions.map((d, i) => (
                    <div key={i} className="flex justify-between items-start text-sm px-1">
                      <div>
                        <span className="font-medium text-red-600">{d.category}</span>
                        {d.description && <span className="text-slate-400 ml-1">· {d.description}</span>}
                      </div>
                      <span className="font-medium text-red-600">−₹{d.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add deduction */}
            <div className="border-t border-slate-100 pt-3">
              <button onClick={() => setShowAddDeduction((v) => !v)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium mb-3">
                <Plus size={13} /> Add Deduction
                {showAddDeduction ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showAddDeduction && (
                <form onSubmit={handleAddDeduction} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 space-y-3">
                  <p className="text-sm font-medium text-red-800">Add Deduction</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                      <select value={deductionForm.category}
                        onChange={(e) => setDeductionForm({ ...deductionForm, category: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                        {['Painting', 'Repairs', 'Cleaning', 'Damages', 'Other'].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                      <input type="number" min="1" value={deductionForm.amount}
                        onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        placeholder="2000" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description (optional)</label>
                    <input value={deductionForm.description}
                      onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      placeholder="Repainted living room walls..." />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddDeduction(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                    <Button type="submit" size="sm" loading={depositLoading}>Add Deduction</Button>
                  </div>
                </form>
              )}

              {/* Refund status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">Refund Status</p>
                  {refund?.status && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${refundStatusColor[refund.status]}`}>
                      {refund.status}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowRefund((v) => !v)}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  {showRefund ? 'Hide' : 'Record Refund'}
                  {showRefund ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {refund?.paidAmount > 0 && (
                <p className="text-sm text-slate-600 mt-1">
                  ₹{refund.paidAmount.toLocaleString()} paid via <span className="capitalize">{refund.paymentMode}</span>
                  {refund.paidDate && ` on ${new Date(refund.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              )}

              {showRefund && (
                <form onSubmit={handleRefundSave} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-3 space-y-3">
                  <p className="text-sm font-medium text-emerald-800">Record Refund</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select value={refundForm.status}
                        onChange={(e) => setRefundForm({ ...refundForm, status: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Amount Paid (₹)</label>
                      <input type="number" min="0" value={refundForm.paidAmount}
                        onChange={(e) => setRefundForm({ ...refundForm, paidAmount: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder={netRefund} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                      <input type="date" value={refundForm.paidDate}
                        onChange={(e) => setRefundForm({ ...refundForm, paidDate: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Payment Mode</label>
                      <select value={refundForm.paymentMode}
                        onChange={(e) => setRefundForm({ ...refundForm, paymentMode: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                      <input value={refundForm.notes}
                        onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Optional notes..." />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowRefund(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                    <Button type="submit" size="sm" loading={depositLoading}>Save Refund</Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Rent History */}
      {tenant.rentHistory?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-slate-500" />
            <Card.Title>Rent History</Card.Title>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
            <div className="space-y-4">
              {[...tenant.rentHistory].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-4 pl-8 relative">
                  <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-bold ${i === 0 ? 'text-blue-700' : 'text-slate-700'}`}>
                        ₹{h.amount.toLocaleString()}/mo
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(h.effectiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {h.reason && <p className="text-xs text-slate-500 mt-1">{h.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <Card.Title>Notes</Card.Title>
        <form onSubmit={handleAddNote} className="flex gap-2 mt-4">
          <input
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button type="submit" size="sm">Add</Button>
        </form>
        {tenant.notes?.length > 0 && (
          <div className="space-y-2 mt-4">
            {[...tenant.notes].reverse().map((n, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-slate-700">{n.content}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Remove Tenant" message="This will remove the tenant. Outstanding bills must be cleared first." loading={deleting}
      />
    </div>
  );
}
