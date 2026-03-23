const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, maxlength: 1000 },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'condo', 'studio', 'room', 'commercial', 'villa', 'pg'],
      required: true,
    },
    totalUnits: { type: Number, required: true, min: 1 },
    availableUnits: { type: Number, min: 0 },
    amenities: [String],
    images: [
      {
        url: String,
        caption: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

propertySchema.index({ owner: 1 });
propertySchema.index({ isActive: 1 });
propertySchema.index({ 'address.city': 1 });
propertySchema.index({ propertyType: 1 });

propertySchema.virtual('fullAddress').get(function () {
  const a = this.address;
  return [a.street, a.city, a.state, a.zipCode, a.country].filter(Boolean).join(', ');
});

propertySchema.virtual('occupancyRate').get(function () {
  if (!this.totalUnits) return 0;
  const occupied = this.totalUnits - (this.availableUnits ?? this.totalUnits);
  return Math.round((occupied / this.totalUnits) * 100);
});

propertySchema.set('toJSON', { virtuals: true });
propertySchema.set('toObject', { virtuals: true });

propertySchema.pre('save', function (next) {
  if (this.isNew && this.availableUnits == null) {
    this.availableUnits = this.totalUnits;
  }
  if (this.availableUnits > this.totalUnits) {
    return next(new Error('Available units cannot exceed total units'));
  }
  // Enforce single primary image
  const primaryImages = (this.images || []).filter((img) => img.isPrimary);
  if (primaryImages.length > 1) {
    this.images.forEach((img, i) => { img.isPrimary = i === 0 && img.isPrimary; });
  }
  next();
});

propertySchema.statics.findByOwner = function (ownerId, includeInactive = false) {
  const filter = { owner: ownerId };
  if (!includeInactive) filter.isActive = true;
  return this.find(filter).populate('owner', 'firstName lastName email');
};

propertySchema.statics.searchProperties = function (searchTerm, filters = {}) {
  const query = { isActive: true, ...filters };
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    query.$or = [
      { name: regex },
      { description: regex },
      { 'address.city': regex },
      { 'address.state': regex },
    ];
  }
  return this.find(query);
};

module.exports = mongoose.model('Property', propertySchema);
