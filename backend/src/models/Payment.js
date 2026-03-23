const mongoose = require('mongoose');
const crypto = require('crypto');

const paymentSchema = new mongoose.Schema(
  {
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'razorpay', 'other'],
      required: true,
    },
    transactionId: { type: String, index: true, sparse: true },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    checkNumber: String,
    bankDetails: {
      bankName: String,
      accountLast4: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'completed',
    },
    notes: { type: String, maxlength: 500 },
    receipt: { url: String, uploadedAt: Date },
    refund: {
      amount: { type: Number, min: 0 },
      reason: String,
      refundedAt: Date,
      refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ bill: 1 });
paymentSchema.index({ tenant: 1, paymentDate: -1 });
paymentSchema.index({ owner: 1, paymentDate: -1 });
paymentSchema.index({ status: 1 });

paymentSchema.virtual('netAmount').get(function () {
  return this.amount - (this.refund?.amount || 0);
});

paymentSchema.virtual('paymentType').get(function () {
  const electronic = ['credit_card', 'debit_card', 'online', 'razorpay', 'bank_transfer'];
  return electronic.includes(this.paymentMethod) ? 'electronic' : 'manual';
});

paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

paymentSchema.pre('save', function (next) {
  // Auto-generate transactionId for electronic payments
  if (this.isNew && !this.transactionId && this.paymentType === 'electronic') {
    this.transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
  // Validate refund amount
  if (this.refund?.amount && this.refund.amount > this.amount) {
    return next(new Error('Refund amount cannot exceed payment amount'));
  }
  next();
});

paymentSchema.statics.findByOwner = function (ownerId, filters = {}) {
  const query = { owner: ownerId, ...filters };
  return this.find(query)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('bill', 'billingPeriod totalAmount status')
    .sort('-paymentDate');
};

paymentSchema.statics.findByTenant = function (tenantId, filters = {}) {
  const query = { tenant: tenantId, ...filters };
  return this.find(query)
    .populate('bill', 'billingPeriod totalAmount status')
    .sort('-paymentDate');
};

paymentSchema.statics.getPaymentSummary = function (ownerId, startDate, endDate) {
  const match = { owner: new mongoose.Types.ObjectId(ownerId), status: 'completed' };
  if (startDate || endDate) {
    match.paymentDate = {};
    if (startDate) match.paymentDate.$gte = new Date(startDate);
    if (endDate) match.paymentDate.$lte = new Date(endDate);
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalRefunds: { $sum: { $ifNull: ['$refund.amount', 0] } },
      },
    },
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);
