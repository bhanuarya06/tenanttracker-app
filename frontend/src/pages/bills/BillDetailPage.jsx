import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Send, Trash2, CreditCard, Edit3, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import billService from '../../services/billService';
import paymentService from '../../services/paymentService';
import { deleteBill, updateBill } from '../../store/slices/billSlice';
import BackButton from '../../components/ui/BackButton';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { BILL_STATUS, CHARGE_TYPES, MONTHS, ROLES } from '../../config/constants';
import toast from 'react-hot-toast';

export default function BillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const isOwner = user?.role !== ROLES.TENANT;

  const [bill, setBill] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    billService.getById(id).then((data) => {
      setBill(data.bill);
      setPayments(data.payments || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSend = async () => {
    setSending(true);
    try {
      const data = await billService.send(id);
      setBill(data.bill);
      toast.success('Bill sent to tenant');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  const handleStatusChange = async (newStatus, label) => {
    try {
      const result = await dispatch(updateBill({ id, data: { status: newStatus } })).unwrap();
      setBill(result.bill);
      toast.success(`Bill marked as ${label}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteBill(id)).unwrap();
      toast.success('Bill deleted');
      navigate('/bills');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(false); setShowDelete(false); }
  };

  const handlePayOnline = async () => {
    setPaying(true);
    try {
      const order = await paymentService.createOrder(id);
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'TenantTracker',
        description: `Bill Payment`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await paymentService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success('Payment successful!');
            // Reload bill
            const data = await billService.getById(id);
            setBill(data.bill);
            setPayments(data.payments || []);
          } catch { toast.error('Payment verification failed'); }
        },
        theme: { color: '#4F46E5' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
    } finally { setPaying(false); }
  };

  if (loading) return <PageLoader />;
  if (!bill) return <p className="text-slate-500">Bill not found.</p>;

  const statusInfo = BILL_STATUS.find((s) => s.value === bill.status);
  const remaining = (bill.totalAmount || 0) - (bill.paidAmount || 0);

  return (
    <div className="max-w-3xl space-y-6">
      <BackButton to="/bills" label="Bills" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bill — {MONTHS[bill.billingPeriod?.month - 1]} {bill.billingPeriod?.year}
          </h1>
          <p className="text-slate-500">{bill.tenant?.user?.firstName} {bill.tenant?.user?.lastName} · {bill.property?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && bill.status === 'draft' && (
            <Button size="sm" onClick={handleSend} loading={sending}><Send size={16} /> Send to Tenant</Button>
          )}
          {isOwner && bill.status === 'sent' && (
            <Button size="sm" variant="warning" onClick={() => handleStatusChange('overdue', 'Overdue')}>
              <AlertTriangle size={16} /> Mark Overdue
            </Button>
          )}
          {isOwner && ['sent', 'partial', 'overdue'].includes(bill.status) && (
            <Button size="sm" variant="success" onClick={() => handleStatusChange('paid', 'Paid')}>
              <CheckCircle size={16} /> Mark Paid
            </Button>
          )}
          {isOwner && !['paid', 'cancelled'].includes(bill.status) && (
            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('cancelled', 'Cancelled')}>
              <XCircle size={16} /> Cancel
            </Button>
          )}
          {!isOwner && remaining > 0 && (
            <Button size="sm" onClick={handlePayOnline} loading={paying}><CreditCard size={16} /> Pay ₹{remaining.toLocaleString()}</Button>
          )}
          {isOwner && !['paid', 'cancelled'].includes(bill.status) && (
            <Link to={`/bills/${id}/edit`}><Button variant="outline" size="sm"><Edit3 size={16} /> Edit</Button></Link>
          )}
          {isOwner && (
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}><Trash2 size={16} /></Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-2xl font-bold text-slate-900">₹{bill.totalAmount?.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-emerald-600">₹{(bill.paidAmount || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500">Paid</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-600">₹{remaining.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Remaining</p>
        </Card>
        <Card className="text-center">
          <Badge color={statusInfo?.color} className="text-base">{statusInfo?.label}</Badge>
          <p className="text-xs text-slate-500 mt-1">Status</p>
        </Card>
      </div>

      {/* Charges Breakdown */}
      <Card>
        <Card.Title>Charges Breakdown</Card.Title>
        <div className="mt-4 space-y-2">
          {bill.charges && Object.entries(bill.charges).filter(([, v]) => v > 0).map(([key, value]) => {
            const chargeInfo = CHARGE_TYPES.find((c) => c.key === key);
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{chargeInfo?.label || key}</span>
                <span className="text-sm font-medium text-slate-900">₹{value.toLocaleString()}</span>
              </div>
            );
          })}
          {bill.previousBalance > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Previous Balance</span>
              <span className="text-sm font-medium text-slate-900">₹{bill.previousBalance.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 font-semibold">
            <span>Total</span>
            <span>₹{bill.totalAmount?.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      <Card>
        <Card.Header>
          <Card.Title>Payments ({payments.length})</Card.Title>
          {isOwner && remaining > 0 && (
            <Link to={`/payments/record?bill=${id}`}><Button size="sm">Record Payment</Button></Link>
          )}
        </Card.Header>
        {payments.length > 0 ? (
          <div className="space-y-2 mt-2">
            {payments.map((p) => (
              <div key={p._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">₹{p.amount?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 capitalize">{p.method} · {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge color={p.status === 'completed' ? 'emerald' : 'amber'}>{p.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">No payments recorded</p>
        )}
      </Card>

      {bill.notes && (
        <Card>
          <Card.Title>Notes</Card.Title>
          <p className="text-sm text-slate-600 mt-2">{bill.notes}</p>
        </Card>
      )}

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Bill" message="This action cannot be undone. Bills with payments cannot be deleted." loading={deleting} />
    </div>
  );
}
