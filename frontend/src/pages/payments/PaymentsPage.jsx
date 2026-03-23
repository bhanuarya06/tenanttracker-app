import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Search, Plus } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPayments } from '../../store/slices/paymentSlice';
import tenantService from '../../services/tenantService';
import useDebounce from '../../hooks/useDebounce';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { PAYMENT_METHODS, ROLES } from '../../config/constants';

export default function PaymentsPage() {
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((s) => s.payments);
  const { user } = useSelector((s) => s.auth);
  const isOwner = user?.role !== ROLES.TENANT;
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [tenants, setTenants] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isOwner) tenantService.getAll({ limit: 100 }).then((d) => setTenants(d.tenants || [])).catch(() => {});
  }, [isOwner]);

  useEffect(() => {
    dispatch(fetchPayments({ page, limit: 15, status: statusFilter || undefined, tenant: tenantFilter || undefined, search: debouncedSearch || undefined }));
  }, [dispatch, page, statusFilter, tenantFilter, debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1">{isOwner ? 'Track all payment transactions' : 'Your payment history'}</p>
        </div>
        {isOwner && <Link to="/payments/record"><Button><Plus size={18} /> Record Payment</Button></Link>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by tenant name, transaction ID..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        {isOwner && (
          <select value={tenantFilter} onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">All tenants</option>
            {tenants.map((t) => (
              <option key={t._id} value={t._id}>{t.user?.firstName} {t.user?.lastName} — {t.property?.name || 'N/A'}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? <PageLoader /> : !items || items.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments yet" description="Payments will appear here once recorded." />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">
                        {p.tenant?.user?.firstName} {p.tenant?.user?.lastName}
                      </p>
                      {p.bill && <p className="text-xs text-slate-500">Bill: {p.bill?.billingPeriod?.month}/{p.bill?.billingPeriod?.year}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                      {PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-emerald-600">
                      ₹{p.amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge color={p.status === 'completed' ? 'emerald' : p.status === 'pending' ? 'amber' : 'rose'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
