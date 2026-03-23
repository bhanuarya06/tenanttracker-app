import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, Search, MapPin } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProperties } from '../../store/slices/propertySlice';
import useDebounce from '../../hooks/useDebounce';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';

export default function PropertiesPage() {
  const dispatch = useDispatch();
  const { items, pagination, loading } = useSelector((s) => s.properties);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchProperties({ page, limit: 12, search: debouncedSearch || undefined }));
  }, [dispatch, page, debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-500 mt-1">Manage your rental properties</p>
        </div>
        <Link to="/properties/add">
          <Button><Plus size={18} /> Add Property</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Search properties..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to get started."
          action={<Link to="/properties/add"><Button size="sm"><Plus size={16} /> Add Property</Button></Link>}
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <Link key={p._id} to={`/properties/${p._id}`}>
                <Card className="hover:shadow-md hover:border-primary-200 transition-all duration-200 cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <Badge color={p.availableUnits > 0 ? 'emerald' : 'amber'}>
                      {p.availableUnits > 0 ? `${p.availableUnits} available` : 'Full'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{p.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                    <MapPin size={14} />
                    <span>{p.address?.city}, {p.address?.state}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-sm">
                      <span className="text-slate-500">Units: </span>
                      <span className="font-medium text-slate-900">{p.totalUnits}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500">Type: </span>
                      <span className="font-medium text-slate-900 capitalize">{p.type}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
