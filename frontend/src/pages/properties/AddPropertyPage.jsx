import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createProperty } from '../../store/slices/propertySlice';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import MultiImageUpload from '../../components/ui/MultiImageUpload';
import { PROPERTY_TYPES } from '../../config/constants';
import toast from 'react-hot-toast';

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'apartment', totalUnits: 1, description: '',
    street: '', city: '', state: '', zipCode: '', country: 'India',
    amenities: '',
    images: [],
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

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
    setLoading(true);
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
      await dispatch(createProperty(payload)).unwrap();
      toast.success('Property created');
      navigate('/properties');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <BackButton to="/properties" label="Properties" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Property</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Property name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Sunrise Apartments" />
            <Select label="Type" value={form.type} onChange={set('type')} options={PROPERTY_TYPES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Total units" type="number" min="1" value={form.totalUnits} onChange={set('totalUnits')} error={errors.totalUnits} />
            <Input label="Country" value={form.country} onChange={set('country')} />
          </div>

          <hr className="border-slate-200" />
          <p className="text-sm font-medium text-slate-700">Address</p>

          <Input label="Street" value={form.street} onChange={set('street')} error={errors.street} placeholder="123 Main Street" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={form.city} onChange={set('city')} error={errors.city} />
            <Input label="State" value={form.state} onChange={set('state')} error={errors.state} />
            <Input label="ZIP Code" value={form.zipCode} onChange={set('zipCode')} error={errors.zipCode} />
          </div>

          <Input label="Amenities (comma-separated)" value={form.amenities} onChange={set('amenities')} placeholder="Parking, WiFi, Gym" />
          <Input label="Description" value={form.description} onChange={set('description')} placeholder="Optional description..." />

          <hr className="border-slate-200" />
          <MultiImageUpload value={form.images} onChange={(images) => setForm({ ...form, images })} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/properties')}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Property</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
