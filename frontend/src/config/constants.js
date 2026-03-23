export const APP_NAME = 'TenantTracker';

export const ROLES = { OWNER: 'owner', TENANT: 'tenant', ADMIN: 'admin' };

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'villa', label: 'Villa' },
  { value: 'pg', label: 'PG / Hostel' },
  { value: 'other', label: 'Other' },
];

export const TENANT_STATUS = [
  { value: 'active', label: 'Active', color: 'emerald' },
  { value: 'inactive', label: 'Inactive', color: 'slate' },
  { value: 'evicted', label: 'Evicted', color: 'rose' },
  { value: 'pending', label: 'Pending', color: 'amber' },
];

export const RENT_TYPES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'lease', label: 'Lease' },
];

export const BILL_STATUS = [
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'partial', label: 'Partial', color: 'amber' },
  { value: 'paid', label: 'Paid', color: 'emerald' },
  { value: 'overdue', label: 'Overdue', color: 'rose' },
  { value: 'cancelled', label: 'Cancelled', color: 'slate' },
];

export const CHARGE_TYPES = [
  { key: 'rent', label: 'Rent' },
  { key: 'water', label: 'Water' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'gas', label: 'Gas' },
  { key: 'internet', label: 'Internet' },
  { key: 'trash', label: 'Trash' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'parking', label: 'Parking' },
  { key: 'petFee', label: 'Pet Fee' },
  { key: 'lateFee', label: 'Late Fee' },
  { key: 'additionalCharges', label: 'Additional' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online (Razorpay)' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
