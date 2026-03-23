import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, UserCheck, UserX, Building2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTenants } from '../../store/slices/tenantSlice';
import propertyService from '../../services/propertyService';
import useDebounce from '../../hooks/useDebounce';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { TENANT_STATUS } from '../../config/constants';

const TABS = [
  { key: 'active', label: 'Active', icon: UserCheck, statuses: ['active', 'pending'] },
  { key: 'past', label: 'Past', icon: UserX, statuses: ['inactive', 'evicted'] },
];

export default function TenantsPage() {
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((s) => s.tenants);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [activeTab, setActiveTab] = useState('active');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [properties, setProperties] = useState([]);
  const [page, setPage] = useState(1);

  const currentTab = TABS.find((t) => t.key === activeTab);

  useEffect(() => {
    propertyService.getAll({ limit: 100 }).then((d) => setProperties(d.properties || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const statuses = currentTab.statuses.join(',');
    dispatch(fetchTenants({ page, limit: 12, search: debouncedSearch || undefined, status: statuses, property: propertyFilter || undefined }));
  }, [dispatch, page, debouncedSearch, activeTab, propertyFilter]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-500 mt-1">Manage your tenants</p>
        </div>
        <Link to="/tenants/add"><Button><Plus size={18} /> Add Tenant</Button></Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by name, email, phone, unit..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
        <select
          value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">All properties</option>
          {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        activeTab === 'active' ? (
          <EmptyState icon={Users} title="No active tenants" description="Add your first tenant to get started."
            action={<Link to="/tenants/add"><Button size="sm"><Plus size={16} /> Add Tenant</Button></Link>}
          />
        ) : (
          <EmptyState icon={UserX} title="No past tenants" description="Inactive and evicted tenants will appear here." />
        )
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((t) => {
              const statusInfo = TENANT_STATUS.find((s) => s.value === t.status);
              return (
                <Link key={t._id} to={`/tenants/${t._id}`}>
                  <Card className="hover:shadow-md hover:border-primary-200 transition-all cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-700">
                          {t.user?.firstName?.[0]}{t.user?.lastName?.[0]}
                        </span>
                      </div>
                      <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
                    </div>
                    <h3 className="font-semibold text-slate-900">{t.user?.firstName} {t.user?.lastName}</h3>
                    <p className="text-sm text-slate-500 mb-3">{t.property?.name} · Unit {t.unit || '—'}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
                      <span className="text-slate-500">₹{t.monthlyRent?.toLocaleString()}/mo</span>
                      <span className="capitalize text-slate-500">{t.rentType}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
