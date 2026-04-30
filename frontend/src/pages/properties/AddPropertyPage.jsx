import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createProperty } from '../../store/slices/propertySlice';
import BackButton from '../../components/ui/BackButton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import { PROPERTY_TYPES } from '../../config/constants';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessages';
import { Plus, Trash2, Building2 } from 'lucide-react';

const FLOOR_LABELS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', '6th Floor', '7th Floor', '8th Floor', '9th Floor'];

function generateRooms(floorNumber, count) {
  return Array.from({ length: count }, (_, i) => ({
    roomNumber: `${floorNumber}${String(i + 1).padStart(2, '0')}`,
  }));
}

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'apartment', description: '',
    street: '', city: '', state: '', zipCode: '', country: 'India',
    amenities: '',
  });
  const [errors, setErrors] = useState({});
  const [floorCount, setFloorCount] = useState(1);
  const [floors, setFloors] = useState([
    { floorNumber: 1, roomCount: 1, rooms: [{ roomNumber: '101' }] },
  ]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleFloorCountChange = (e) => {
    const count = Math.max(1, Math.min(10, Number(e.target.value)));
    setFloorCount(count);
    setFloors((prev) => {
      const next = Array.from({ length: count }, (_, i) => {
        const existing = prev[i];
        if (existing) return existing;
        const floorNumber = i + 1;
        return { floorNumber, roomCount: 1, rooms: generateRooms(floorNumber, 1) };
      });
      return next;
    });
  };

  const handleRoomCountChange = (floorIdx, value) => {
    const count = Math.max(1, Math.min(50, Number(value)));
    setFloors((prev) =>
      prev.map((f, i) => {
        if (i !== floorIdx) return f;
        const rooms = Array.from({ length: count }, (_, ri) => {
          return f.rooms[ri] ?? { roomNumber: `${f.floorNumber}${String(ri + 1).padStart(2, '0')}` };
        });
        return { ...f, roomCount: count, rooms };
      })
    );
  };

  const handleRoomNumberChange = (floorIdx, roomIdx, value) => {
    setFloors((prev) =>
      prev.map((f, i) => {
        if (i !== floorIdx) return f;
        const rooms = f.rooms.map((r, ri) => (ri === roomIdx ? { ...r, roomNumber: value } : r));
        return { ...f, rooms };
      })
    );
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.street.trim()) e.street = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    if (!form.zipCode.trim()) e.zipCode = 'Required';
    floors.forEach((f, fi) => {
      f.rooms.forEach((r, ri) => {
        if (!r.roomNumber.trim()) e[`room_${fi}_${ri}`] = 'Required';
      });
    });
    // Check for duplicate room numbers across all floors
    const allNumbers = floors.flatMap((f) => f.rooms.map((r) => r.roomNumber.trim()));
    const seen = new Set();
    allNumbers.forEach((n) => {
      if (seen.has(n)) e.duplicateRoom = `Duplicate room number: ${n}`;
      seen.add(n);
    });
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
        description: form.description,
        address: { street: form.street, city: form.city, state: form.state, zipCode: form.zipCode, country: form.country },
        amenities: form.amenities ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean) : [],
        floors: floors.map((f) => ({
          floorNumber: f.floorNumber,
          rooms: f.rooms.map((r) => ({ roomNumber: r.roomNumber.trim() })),
        })),
      };
      await dispatch(createProperty(payload)).unwrap();
      toast.success('Property created');
      navigate('/properties');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create property'));
    } finally {
      setLoading(false);
    }
  };

  const totalRooms = floors.reduce((sum, f) => sum + f.rooms.length, 0);

  return (
    <div className="max-w-3xl">
      <BackButton to="/properties" label="Properties" />
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Property</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-4">Basic Information</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Property name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Sunrise Apartments" />
              <Select label="Type" value={form.type} onChange={set('type')} options={PROPERTY_TYPES} />
            </div>
            <Input label="Description" value={form.description} onChange={set('description')} placeholder="Optional description..." />
            <Input label="Amenities (comma-separated)" value={form.amenities} onChange={set('amenities')} placeholder="Parking, WiFi, Generator" />
          </div>
        </Card>

        {/* Address */}
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-4">Address</p>
          <div className="space-y-4">
            <Input label="Street" value={form.street} onChange={set('street')} error={errors.street} placeholder="123 Main Street" />
            <div className="grid grid-cols-3 gap-4">
              <Input label="City" value={form.city} onChange={set('city')} error={errors.city} />
              <Input label="State" value={form.state} onChange={set('state')} error={errors.state} />
              <Input label="ZIP Code" value={form.zipCode} onChange={set('zipCode')} error={errors.zipCode} />
            </div>
            <Input label="Country" value={form.country} onChange={set('country')} />
          </div>
        </Card>

        {/* Floor & Room Configuration */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Floor & Room Configuration</p>
              <p className="text-xs text-slate-500 mt-0.5">{totalRooms} total room{totalRooms !== 1 ? 's' : ''} across {floorCount} floor{floorCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Number of floors</label>
              <input
                type="number" min="1" max="10" value={floorCount}
                onChange={handleFloorCountChange}
                className="w-16 text-center border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {errors.duplicateRoom && (
            <p className="text-xs text-red-500 mb-3">{errors.duplicateRoom}</p>
          )}

          <div className="space-y-5">
            {floors.map((floor, fi) => (
              <div key={fi} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {FLOOR_LABELS[fi] ?? `Floor ${floor.floorNumber}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Rooms on this floor</label>
                    <input
                      type="number" min="1" max="50" value={floor.roomCount}
                      onChange={(e) => handleRoomCountChange(fi, e.target.value)}
                      className="w-14 text-center border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {floor.rooms.map((room, ri) => (
                    <div key={ri} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-400">Room {ri + 1}</span>
                      <input
                        value={room.roomNumber}
                        onChange={(e) => handleRoomNumberChange(fi, ri, e.target.value)}
                        className={`w-16 text-center border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${errors[`room_${fi}_${ri}`] ? 'border-red-400' : 'border-slate-300'}`}
                        placeholder="101"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/properties')}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Property</Button>
        </div>
      </form>
    </div>
  );
}
