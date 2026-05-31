const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['Electrical', 'Plumbing', 'Carpentry', 'Painting', 'Cleaning', 'Other'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    photos: [{ url: String, name: String }],
    resolutionNotes: { type: String, default: '', maxlength: 500 },
    resolvedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

maintenanceSchema.index({ owner: 1, status: 1, createdAt: -1 });
maintenanceSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
