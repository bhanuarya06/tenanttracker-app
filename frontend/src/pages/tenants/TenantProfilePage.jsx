import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Edit3, Trash2, Receipt, CreditCard, Calendar, MapPin, Users as UsersIcon, Phone, Mail } from 'lucide-react';
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

export default function TenantProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    tenantService.getById(id).then((data) => setTenant(data.tenant)).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteTenant(id)).unwrap();
      dispatch(fetchProperties({ limit: 100 }));
      toast.success('Tenant removed');
      navigate('/tenants');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove tenant');
    } finally { setDeleting(false); setShowDelete(false); }
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
          </div>
        </Card>
      </div>

      {tenant.rentType === 'lease' && tenant.leaseDetails && (
        <Card>
          <Card.Title>Lease Details</Card.Title>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <span className="text-slate-500">Start:</span>
              <span className="font-medium ml-1">{new Date(tenant.leaseDetails.startDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-slate-500">End:</span>
              <span className="font-medium ml-1">{new Date(tenant.leaseDetails.endDate).toLocaleDateString()}</span>
            </div>
            {tenant.leaseDetails.securityDeposit && (
              <div>
                <span className="text-slate-500">Deposit:</span>
                <span className="font-medium ml-1">₹{tenant.leaseDetails.securityDeposit.toLocaleString()}</span>
              </div>
            )}
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
