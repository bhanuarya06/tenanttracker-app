const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit number is required'],
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // --- NEW: Rent type replaces mandatory lease ---
    rentType: {
      type: String,
      enum: ['monthly', 'lease'],
      required: [true, 'Rent type is required'],
      default: 'monthly',
    },
    monthlyRent: {
      type: Number,
      required: [true, 'Monthly rent is required'],
      min: 0,
    },
    // lease details — only required when rentType is 'lease'
    leaseDetails: {
      startDate: Date,
      endDate: Date,
      securityDeposit: { type: Number, default: 0, min: 0 },
      leaseType: {
        type: String,
        enum: ['fixed', 'month-to-month', 'yearly'],
      },
    },
    // --- NEW: occupant count always captured ---
    occupantCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    occupants: [
      {
        name: { type: String, required: true },
        relationship: {
          type: String,
          enum: ['spouse', 'child', 'parent', 'sibling', 'relative', 'roommate', 'other'],
        },
        dateOfBirth: Date,
        phone: String,
      },
    ],
    emergencyContacts: [
      {
        name: { type: String, required: true },
        relationship: String,
        phone: { type: String, required: true },
        email: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    balance: { type: Number, default: 0 },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
      },
      paymentMethod: {
        type: String,
        enum: ['cash', 'check', 'bank_transfer', 'online', 'other'],
        default: 'cash',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated', 'pending'],
      default: 'active',
    },
    moveInDate: Date,
    moveOutDate: Date,
    notes: [
      {
        content: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        isPrivate: { type: Boolean, default: false },
      },
    ],
    documents: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ['lease', 'id', 'employment', 'income', 'reference', 'other'],
        },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

tenantSchema.index({ owner: 1, status: 1 });
// Partial unique index: only enforce one active/pending tenant per unit
tenantSchema.index(
  { property: 1, unit: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['active', 'pending'] } } }
);
tenantSchema.index({ user: 1 });
tenantSchema.index({ status: 1 });

tenantSchema.virtual('leaseDuration').get(function () {
  if (this.rentType !== 'lease' || !this.leaseDetails?.startDate || !this.leaseDetails?.endDate) return null;
  const diff = this.leaseDetails.endDate - this.leaseDetails.startDate;
  return Math.round(diff / (1000 * 60 * 60 * 24 * 30));
});

tenantSchema.virtual('leaseStatus').get(function () {
  if (this.rentType !== 'lease') return 'monthly';
  if (!this.leaseDetails?.startDate || !this.leaseDetails?.endDate) return 'no-lease';
  const now = new Date();
  if (now < this.leaseDetails.startDate) return 'upcoming';
  if (now > this.leaseDetails.endDate) return 'expired';
  const remaining = this.leaseDetails.endDate - now;
  const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
  if (days <= 30) return 'expiring';
  return 'active';
});

tenantSchema.virtual('totalOccupants').get(function () {
  return this.occupantCount || this.occupants?.length || 1;
});

tenantSchema.set('toJSON', { virtuals: true });
tenantSchema.set('toObject', { virtuals: true });

tenantSchema.pre('save', function (next) {
  // Validate lease dates when rentType is 'lease'
  if (this.rentType === 'lease' && this.leaseDetails) {
    if (this.leaseDetails.startDate && this.leaseDetails.endDate) {
      if (this.leaseDetails.endDate <= this.leaseDetails.startDate) {
        return next(new Error('Lease end date must be after start date'));
      }
    }
  }
  // Keep occupantCount in sync
  if (this.occupants?.length > 0 && this.occupants.length > this.occupantCount) {
    this.occupantCount = this.occupants.length;
  }
  // Enforce single primary emergency contact
  const primaries = (this.emergencyContacts || []).filter((c) => c.isPrimary);
  if (primaries.length > 1) {
    this.emergencyContacts.forEach((c, i) => { c.isPrimary = i === 0 && c.isPrimary; });
  }
  next();
});

tenantSchema.statics.findByOwner = function (ownerId, status) {
  const filter = { owner: ownerId };
  if (status) filter.status = status;
  return this.find(filter)
    .populate('user', 'firstName lastName email phone avatar')
    .populate('property', 'name address propertyType');
};

tenantSchema.statics.findByProperty = function (propertyId, status) {
  const filter = { property: propertyId };
  if (status) filter.status = status;
  return this.find(filter)
    .populate('user', 'firstName lastName email phone')
    .sort('unit');
};

tenantSchema.statics.findExpiringLeases = function (ownerId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return this.find({
    owner: ownerId,
    rentType: 'lease',
    status: 'active',
    'leaseDetails.endDate': { $lte: futureDate, $gte: new Date() },
  })
    .populate('user', 'firstName lastName email phone')
    .populate('property', 'name');
};

module.exports = mongoose.model('Tenant', tenantSchema);
