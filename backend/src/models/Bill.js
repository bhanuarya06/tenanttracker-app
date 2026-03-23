const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    billingPeriod: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true, min: 2000 },
    },
    charges: {
      rent: { type: Number, required: true, min: 0 },
      utilities: {
        water: { type: Number, default: 0, min: 0 },
        electricity: { type: Number, default: 0, min: 0 },
        gas: { type: Number, default: 0, min: 0 },
        internet: { type: Number, default: 0, min: 0 },
        trash: { type: Number, default: 0, min: 0 },
        other: {
          amount: { type: Number, default: 0, min: 0 },
          description: String,
        },
      },
      maintenance: { type: Number, default: 0, min: 0 },
      parking: { type: Number, default: 0, min: 0 },
      petFee: { type: Number, default: 0, min: 0 },
      lateFee: { type: Number, default: 0, min: 0 },
      additionalCharges: [
        {
          description: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
        },
      ],
    },
    credits: {
      securityDepositRefund: { type: Number, default: 0, min: 0 },
      prorationCredit: { type: Number, default: 0, min: 0 },
      otherCredits: [
        {
          description: String,
          amount: { type: Number, min: 0 },
        },
      ],
    },
    previousBalance: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
      default: 'draft',
    },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    paidAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'razorpay', 'other'],
    },
    notes: { type: String, maxlength: 500 },
    attachments: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    reminders: [
      {
        sentAt: Date,
        type: { type: String, enum: ['initial', 'reminder', 'final_notice'] },
        method: { type: String, enum: ['email', 'sms'] },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

billSchema.index({ tenant: 1 });
billSchema.index({ owner: 1, status: 1, dueDate: 1 });
billSchema.index({ 'billingPeriod.year': 1, 'billingPeriod.month': 1 });
billSchema.index({ tenant: 1, 'billingPeriod.year': 1, 'billingPeriod.month': 1 }, { unique: true });

billSchema.virtual('totalCharges').get(function () {
  const c = this.charges;
  if (!c) return 0;
  const u = c.utilities || {};
  const utilTotal = (u.water || 0) + (u.electricity || 0) + (u.gas || 0) + (u.internet || 0) + (u.trash || 0) + (u.other?.amount || 0);
  const additional = (c.additionalCharges || []).reduce((s, a) => s + (a.amount || 0), 0);
  return (c.rent || 0) + utilTotal + (c.maintenance || 0) + (c.parking || 0) + (c.petFee || 0) + (c.lateFee || 0) + additional;
});

billSchema.virtual('totalCredits').get(function () {
  const cr = this.credits || {};
  const otherCr = (cr.otherCredits || []).reduce((s, c) => s + (c.amount || 0), 0);
  return (cr.securityDepositRefund || 0) + (cr.prorationCredit || 0) + otherCr;
});

billSchema.virtual('netAmount').get(function () {
  return this.totalCharges - this.totalCredits + (this.previousBalance || 0);
});

billSchema.virtual('remainingBalance').get(function () {
  return Math.max(0, this.totalAmount - (this.paidAmount || 0));
});

billSchema.virtual('isOverdue').get(function () {
  return this.dueDate < new Date() && ['sent', 'partial'].includes(this.status);
});

billSchema.virtual('billingPeriodString').get(function () {
  if (!this.billingPeriod) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[this.billingPeriod.month - 1]} ${this.billingPeriod.year}`;
});

billSchema.set('toJSON', { virtuals: true });
billSchema.set('toObject', { virtuals: true });

billSchema.pre('save', function (next) {
  // Auto-calculate totalAmount
  if (this.isModified('charges') || this.isModified('credits') || this.isModified('previousBalance') || this.isNew) {
    this.totalAmount = this.netAmount;
  }
  // Auto-update status based on payment
  if (this.isModified('paidAmount')) {
    if (this.paidAmount >= this.totalAmount && this.totalAmount > 0) {
      this.status = 'paid';
      this.paidDate = this.paidDate || new Date();
    } else if (this.paidAmount > 0) {
      this.status = 'partial';
    }
  }
  next();
});

billSchema.statics.findByOwner = function (ownerId, filters = {}) {
  const query = { owner: ownerId, ...filters };
  return this.find(query)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('property', 'name')
    .sort('-billingPeriod.year -billingPeriod.month');
};

billSchema.statics.findOverdue = function (ownerId) {
  return this.find({
    owner: ownerId,
    status: { $in: ['sent', 'partial'] },
    dueDate: { $lt: new Date() },
  })
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('property', 'name');
};

billSchema.statics.getRevenueSummary = function (ownerId, startDate, endDate) {
  const match = { owner: new mongoose.Types.ObjectId(ownerId) };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
      },
    },
  ]);
};

module.exports = mongoose.model('Bill', billSchema);
