import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Receipt, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBills } from '../../store/slices/billSlice';
import tenantService from '../../services/tenantService';
import useDebounce from '../../hooks/useDebounce';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { BILL_STATUS, ROLES, MONTHS } from '../../config/constants';

export default function BillsPage() {
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((s) => s.bills);
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
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
    dispatch(fetchBills({ page, limit: 15, status: statusFilter || undefined, tenant: tenantFilter || undefined, search: debouncedSearch || undefined }));
  }, [dispatch, page, statusFilter, tenantFilter, debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isOwner ? 'Bills' : 'My Bills'}</h1>
          <p className="text-slate-500 mt-1">{isOwner ? 'Manage utility bills for tenants' : 'View your bills and payment status'}</p>
        </div>
        {isOwner && <Link to="/bills/add"><Button><Plus size={18} /> Create Bill</Button></Link>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by tenant name, property..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">All statuses</option>
          {BILL_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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

      {loading ? <PageLoader /> : items.length === 0 ? (
        <EmptyState icon={Receipt} title="No bills yet"
          description={isOwner ? 'Create your first bill.' : 'No bills have been generated.'}
          action={isOwner ? <Link to="/bills/add"><Button size="sm"><Plus size={16} /> Create Bill</Button></Link> : null}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Paid</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((bill) => {
                  const status = BILL_STATUS.find((s) => s.value === bill.status);
                  return (
                    <tr key={bill._id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/bills/${bill._id}`)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          {bill.tenant?.user?.firstName} {bill.tenant?.user?.lastName}
                        </p>
                        {bill.property?.name && <p className="text-xs text-slate-500">{bill.property.name}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {MONTHS[bill.billingPeriod?.month - 1]} {bill.billingPeriod?.year}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                        ₹{bill.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-emerald-600">
                        ₹{(bill.paidAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge color={status?.color}>{status?.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
