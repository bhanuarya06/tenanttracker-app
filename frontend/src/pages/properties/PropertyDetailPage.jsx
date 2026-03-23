import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Edit3, Trash2, Users, MapPin, Building2, Hash, Image } from 'lucide-react';
import propertyService from '../../services/propertyService';
import { deleteProperty } from '../../store/slices/propertySlice';
import BackButton from '../../components/ui/BackButton';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [property, setProperty] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    propertyService.getById(id)
      .then((data) => {
        setProperty(data.property);
        setTenants(data.tenants || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteProperty(id)).unwrap();
      toast.success('Property deleted');
      navigate('/properties');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!property) return <p className="text-slate-500">Property not found.</p>;

  const occupancy = property.totalUnits > 0
    ? Math.round(((property.totalUnits - (property.availableUnits || 0)) / property.totalUnits) * 100)
    : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <BackButton to="/properties" label="Properties" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
          <div className="flex items-center gap-1.5 text-slate-500 mt-1">
            <MapPin size={16} />
            <span>{property.address?.street}, {property.address?.city}, {property.address?.state} {property.address?.zipCode}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/properties/${id}/edit`)}>
            <Edit3 size={16} /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 size={16} /> Delete
          </Button>
        </div>
      </div>

      {/* Property Images */}
      {property.images?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {property.images.map((img, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={resolveUrl(img.url)} alt={img.caption || property.name} className="w-full h-40 object-cover" />
              {img.isPrimary && (
                <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Primary</span>
              )}
              {img.caption && (
                <p className="text-xs text-slate-500 p-2">{img.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <Building2 className="h-5 w-5 text-primary-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-900">{property.totalUnits}</p>
          <p className="text-xs text-slate-500">Total Units</p>
        </Card>
        <Card className="text-center">
          <Hash className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-900">{property.availableUnits || 0}</p>
          <p className="text-xs text-slate-500">Available</p>
        </Card>
        <Card className="text-center">
          <Users className="h-5 w-5 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-slate-900">{tenants.length}</p>
          <p className="text-xs text-slate-500">Tenants</p>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold text-slate-900">{occupancy}%</div>
          <p className="text-xs text-slate-500">Occupancy</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{ width: `${occupancy}%` }} />
          </div>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <Card.Title>Details</Card.Title>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div><span className="text-slate-500">Type:</span> <span className="font-medium capitalize">{property.type}</span></div>
          <div><span className="text-slate-500">Country:</span> <span className="font-medium">{property.address?.country}</span></div>
          {property.description && (
            <div className="col-span-2"><span className="text-slate-500">Description:</span> <span className="font-medium">{property.description}</span></div>
          )}
          {property.amenities?.length > 0 && (
            <div className="col-span-2">
              <span className="text-slate-500 block mb-1">Amenities:</span>
              <div className="flex flex-wrap gap-1.5">
                {property.amenities.map((a) => <Badge key={a} color="primary">{a}</Badge>)}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Tenants */}
      <Card>
        <Card.Header>
          <Card.Title>Tenants ({tenants.length})</Card.Title>
          <Link to={`/tenants/add?property=${id}`}>
            <Button size="sm">Add Tenant</Button>
          </Link>
        </Card.Header>
        {tenants.length > 0 ? (
          <div className="space-y-2">
            {tenants.map((t) => (
              <Link key={t._id} to={`/tenants/${t._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.user?.firstName} {t.user?.lastName}</p>
                  <p className="text-xs text-slate-500">Unit {t.unitNumber} · ₹{t.monthlyRent?.toLocaleString()}/mo</p>
                </div>
                <Badge color={t.status === 'active' ? 'emerald' : 'slate'}>{t.status}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">No tenants assigned yet</p>
        )}
      </Card>

      <ConfirmDialog
        isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        title="Delete Property" message="This will permanently delete this property. Tenants must be removed first."
        loading={deleting}
      />
    </div>
  );
}
