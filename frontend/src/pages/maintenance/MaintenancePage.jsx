import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Wrench, AlertCircle, Clock, CheckSquare, ChevronDown, Send,
} from 'lucide-react';
import maintenanceService from '../../services/maintenanceService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { ROLES } from '../../config/constants';

// ─── Shared constants ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open:        { color: 'rose',    label: 'Open',        icon: AlertCircle },
  in_progress: { color: 'amber',   label: 'In Progress', icon: Clock },
  resolved:    { color: 'emerald', label: 'Resolved',    icon: CheckSquare },
};

const PRIORITY_COLOR = { low: 'blue', medium: 'amber', high: 'rose' };
const CATEGORIES = ['Electrical', 'Plumbing', 'Carpentry', 'Painting', 'Cleaning', 'Other'];

// ─── Tenant view ──────────────────────────────────────────────────────────────

function TenantMaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: 'Electrical', title: '', description: '', priority: 'medium' });

  useEffect(() => {
    maintenanceService.getAll({ limit: 50 })
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const { request } = await maintenanceService.create(form);
      setRequests((prev) => [request, ...prev]);
      setForm({ category: 'Electrical', title: '', description: '', priority: 'medium' });
      toast.success('Request submitted — your landlord will be notified');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>
        <p className="text-slate-500 mt-1">Report an issue and track its resolution status</p>
      </div>

      {/* Submit form — always visible */}
      <Card>
        <Card.Header>
          <Card.Title>Report an Issue</Card.Title>
        </Card.Header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={field}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={field}>
                <option value="low">Low — Not urgent</option>
                <option value="medium">Medium — Needs attention</option>
                <option value="high">High — Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Short Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Water leakage in bathroom ceiling"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120}
              className={field}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the problem in detail — what happened, where exactly, since when…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={1000}
              className={`${field} resize-none`}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            <Send size={15} />
            {submitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </form>
      </Card>

      {/* Past requests */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">My Requests</h2>
        {loading ? (
          <PageLoader />
        ) : requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((r) => {
              const conf = STATUS_CONFIG[r.status] || STATUS_CONFIG.open;
              const StatusIcon = conf.icon;
              return (
                <div key={r._id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon size={16} className={`mt-0.5 flex-shrink-0 ${
                      r.status === 'resolved' ? 'text-emerald-500' :
                      r.status === 'in_progress' ? 'text-amber-500' : 'text-rose-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-slate-900 text-sm">{r.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge color={PRIORITY_COLOR[r.priority]}>{r.priority}</Badge>
                          <Badge color={conf.color}>{conf.label}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{r.description}</p>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {r.category} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {r.resolutionNotes && (
                        <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-emerald-700 mb-0.5">Landlord note</p>
                          <p className="text-xs text-emerald-600">{r.resolutionNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-10">
              <Wrench className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No requests submitted yet</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Owner view ───────────────────────────────────────────────────────────────

function RequestCard({ request, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({ status: request.status, resolutionNotes: request.resolutionNotes || '' });
  const conf = STATUS_CONFIG[request.status] || STATUS_CONFIG.open;

  const handleSave = async () => {
    setUpdating(true);
    try {
      const { request: updated } = await maintenanceService.updateStatus(request._id, form);
      onUpdate(updated);
      setExpanded(false);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge color={conf.color}>{conf.label}</Badge>
            <Badge color={PRIORITY_COLOR[request.priority]}>{request.priority} priority</Badge>
            <span className="text-xs text-slate-400">{request.category}</span>
          </div>
          <p className="font-semibold text-slate-900">{request.title}</p>
          <p className="text-sm text-slate-500 mt-1">{request.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
            <span>{request.tenant?.user?.firstName} {request.tenant?.user?.lastName} · Unit {request.tenant?.unit}</span>
            <span>{request.property?.name}</span>
            <span>{new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {request.resolutionNotes && (
            <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{request.resolutionNotes}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
          <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Update Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={field}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Resolution Notes</label>
              <input
                type="text"
                placeholder="e.g. Fixed the wiring on 2nd floor"
                value={form.resolutionNotes}
                onChange={(e) => setForm((f) => ({ ...f, resolutionNotes: e.target.value }))}
                className={field}
              />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={updating}>
            {updating ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}

function OwnerMaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async (status = '') => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (status) params.status = status;
      const data = await maintenanceService.getAll(params);
      setRequests(data.requests || []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleUpdate = (updated) => {
    setRequests((prev) => prev.map((r) => r._id === updated._id ? updated : r));
  };

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>
        <p className="text-slate-500 mt-1">All tenant maintenance and repair queries</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: '',            label: `All (${counts.all})` },
          { value: 'open',        label: `Open (${counts.open})` },
          { value: 'in_progress', label: `In Progress (${counts.in_progress})` },
          { value: 'resolved',    label: `Resolved (${counts.resolved})` },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              statusFilter === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard key={r._id} request={r} onUpdate={handleUpdate} />
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-16">
            <Wrench className="h-14 w-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">No maintenance requests</p>
            <p className="text-slate-400 text-sm mt-1">
              {statusFilter ? `No ${statusFilter.replace('_', ' ')} requests` : 'Tenants can submit requests from the Maintenance page'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Page — role gate ─────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const { user } = useSelector((s) => s.auth);
  return user?.role === ROLES.TENANT ? <TenantMaintenancePage /> : <OwnerMaintenancePage />;
}
