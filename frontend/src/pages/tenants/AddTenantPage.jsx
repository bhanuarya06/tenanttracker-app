import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createTenant } from '../../store/slices/tenantSlice';
import { fetchProperties } from '../../store/slices/propertySlice';
import propertyService from '../../services/propertyService';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessages';
import { Info } from 'lucide-react';

const FLOOR_LABELS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', '6th Floor', '7th Floor', '8th Floor', '9th Floor'];

export default function AddTenantPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const preselectedProperty = searchParams.get('property');

  const [properties, setProperties] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    property: preselectedProperty || '',
    selectedFloor: '', selectedRoom: '',
    monthlyRent: '', securityDeposit: '', moveInDate: '',
    leaseStart: '', leaseEnd: '',
    lateFeeEnabled: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    propertyService.getAll({ limit: 100 }).then((data) => setProperties(data.properties || []));
  }, []);

  useEffect(() => {
    if (!form.property) { setFloors([]); return; }
    setLoadingUnits(true);
    setForm((f) => ({ ...f, selectedFloor: '', selectedRoom: '' }));
    propertyService.getAvailableUnits(form.property)
      .then((data) => setFloors(data.floors || []))
      .catch(() => setFloors([]))
      .finally(() => setLoadingUnits(false));
  }, [form.property]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const selectedFloorData = floors.find((f) => String(f.floorNumber) === String(form.selectedFloor));
  const availableRooms = selectedFloorData
    ? selectedFloorData.rooms.filter((r) => !r.isOccupied)
    : [];

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email) e.email = 'Required';
    if (!form.property) e.property = 'Required';
    if (!form.selectedRoom) e.selectedRoom = 'Please select a room';
    if (!form.monthlyRent || form.monthlyRent <= 0) e.monthlyRent = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        user: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
        },
        property: form.property,
        unit: form.selectedRoom,
        monthlyRent: Number(form.monthlyRent),
        rentType: 'monthly',
        securityDeposit: Number(form.securityDeposit) || 0,
        moveInDate: form.moveInDate || undefined,
        lateFeeEnabled: form.lateFeeEnabled,
      };
      await dispatch(createTenant(payload)).unwrap();
      dispatch(fetchProperties({ limit: 100 }));
      toast.success('Tenant added — invite email sent');
      navigate('/tenants');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add tenant'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <BackButton to="/tenants" label="Tenants" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Tenant</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Info */}
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-4">Tenant Information</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
              <Input label="Last name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
              <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" />
            </div>
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                A login invite will be sent to the tenant's email with auto-generated credentials. They can also sign in with Google.
              </p>
            </div>
          </div>
        </Card>

        {/* Room Selection */}
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-4">Room Assignment</p>
          <div className="space-y-4">
            <Select
              label="Property"
              value={form.property}
              onChange={set('property')}
              error={errors.property}
              placeholder="Select property"
              options={properties.map((p) => ({ value: p._id, label: p.name }))}
            />

            {form.property && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Floor</label>
                  <select
                    value={form.selectedFloor}
                    onChange={(e) => setForm({ ...form, selectedFloor: e.target.value, selectedRoom: '' })}
                    disabled={loadingUnits || floors.length === 0}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">{loadingUnits ? 'Loading...' : 'Select floor'}</option>
                    {floors.map((f) => {
                      const available = f.rooms.filter((r) => !r.isOccupied).length;
                      return (
                        <option key={f.floorNumber} value={f.floorNumber} disabled={available === 0}>
                          {FLOOR_LABELS[f.floorNumber - 1] ?? `Floor ${f.floorNumber}`} ({available} available)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                  <select
                    value={form.selectedRoom}
                    onChange={(e) => setForm({ ...form, selectedRoom: e.target.value })}
                    disabled={!form.selectedFloor || availableRooms.length === 0}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 ${errors.selectedRoom ? 'border-red-400' : 'border-slate-300'}`}
                  >
                    <option value="">Select room</option>
                    {availableRooms.map((r) => (
                      <option key={r.roomNumber} value={r.roomNumber}>Room {r.roomNumber}</option>
                    ))}
                  </select>
                  {errors.selectedRoom && <p className="text-xs text-red-500 mt-1">{errors.selectedRoom}</p>}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Rent Details */}
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-4">Rent Details</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Monthly rent (₹)" type="number" min="0" value={form.monthlyRent} onChange={set('monthlyRent')} error={errors.monthlyRent} />
              <Input label="Security deposit (₹)" type="number" min="0" value={form.securityDeposit} onChange={set('securityDeposit')} placeholder="0" />
            </div>
            <Input label="Move-in date" type="date" value={form.moveInDate} onChange={set('moveInDate')} />

            <div className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Late fee</p>
                <p className="text-xs text-slate-500">Charge late fee when rent is overdue</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, lateFeeEnabled: !form.lateFeeEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.lateFeeEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.lateFeeEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/tenants')}>Cancel</Button>
          <Button type="submit" loading={submitting}>Add Tenant</Button>
        </div>
      </form>
    </div>
  );
}
