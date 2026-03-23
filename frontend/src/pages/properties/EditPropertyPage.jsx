import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchPropertyById, updateProperty } from '../../store/slices/propertySlice';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import MultiImageUpload from '../../components/ui/MultiImageUpload';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { PROPERTY_TYPES } from '../../config/constants';

export default function EditPropertyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { current, loading: fetchLoading } = useSelector((s) => s.properties);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { dispatch(fetchPropertyById(id)); }, [dispatch, id]);

  useEffect(() => {
    if (current && current._id === id) {
      setForm({
        name: current.name || '',
        type: current.propertyType || 'apartment',
        totalUnits: current.totalUnits || 1,
        description: current.description || '',
        street: current.address?.street || '',
        city: current.address?.city || '',
        state: current.address?.state || '',
        zipCode: current.address?.zipCode || '',
        country: current.address?.country || 'India',
        amenities: (current.amenities || []).join(', '),
        images: (current.images || []).map((img) => ({
          url: img.url || '',
          caption: img.caption || '',
          isPrimary: !!img.isPrimary,
        })),
      });
    }
  }, [current, id]);

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: '' });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.street.trim()) e.street = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    if (!form.zipCode.trim()) e.zipCode = 'Required';
    if (form.totalUnits < 1) e.totalUnits = 'At least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        propertyType: form.type,
        totalUnits: Number(form.totalUnits),
        description: form.description,
        address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country },
        amenities: form.amenities ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
        images: form.images,
      };
      await dispatch(updateProperty({ id, data: payload })).unwrap();
      toast.success('Property updated');
      navigate(`/properties/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  if (fetchLoading || !form) return <PageLoader />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackButton to={`/properties/${id}`} label="Back to property" />
      <h1 className="text-2xl font-bold text-slate-900">Edit Property</h1>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Property name" value={form.name} onChange={set('name')} error={errors.name} />
            <Select label="Type" value={form.type} onChange={set('type')}>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total units" type="number" min="1" value={form.totalUnits} onChange={set('totalUnits')} error={errors.totalUnits} />
            <Input label="Country" value={form.country} onChange={set('country')} />
          </div>

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Address</p>

          <Input label="Street" value={form.street} onChange={set('street')} error={errors.street} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={form.city} onChange={set('city')} error={errors.city} />
            <Input label="State" value={form.state} onChange={set('state')} error={errors.state} />
            <Input label="ZIP Code" value={form.zipCode} onChange={set('zipCode')} error={errors.zipCode} />
          </div>

          <Input label="Amenities (comma-separated)" value={form.amenities} onChange={set('amenities')} placeholder="Parking, WiFi, Gym" />
          <Input label="Description" value={form.description} onChange={set('description')} />

          <hr className="border-slate-200" />
          <MultiImageUpload value={form.images} onChange={(images) => setForm({ ...form, images })} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => navigate(`/properties/${id}`)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
