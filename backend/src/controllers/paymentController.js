const mongoose = require('mongoose');
const { Payment, Bill, Tenant } = require('../models');
const { sendSuccess, AppError } = require('../utils/response');
const { paginate, buildSort, escapeRegex } = require('../utils/query');
const razorpayService = require('../services/razorpayService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// ── Owner: Record a manual payment ──────────────────────────────────
exports.createPayment = async (req, res) => {
  const { bill: billId, amount, paymentMethod, paymentDate, transactionId, checkNumber, bankDetails, notes } = req.body;

  const bill = await Bill.findOne({ _id: billId, owner: req.user.userId })
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName email' } });
  if (!bill) throw new AppError('Bill not found', 404);

  if (bill.status === 'paid') throw new AppError('Bill is already fully paid', 400);

  const remaining = bill.totalAmount - (bill.paidAmount || 0);
  if (amount > remaining) throw new AppError(`Payment exceeds remaining balance of ₹${remaining}`, 400);

  const payment = await Payment.create({
    bill: bill._id,
    tenant: bill.tenant._id,
    owner: req.user.userId,
    amount,
    paymentDate: paymentDate || new Date(),
    paymentMethod: paymentMethod || 'cash',
    transactionId,
    checkNumber,
    bankDetails,
    notes,
    status: 'completed',
    createdBy: req.user.userId,
  });

  // Update bill — pre-save hook handles status
  bill.paidAmount = (bill.paidAmount || 0) + amount;
  bill.paymentMethod = paymentMethod;
  bill.updatedBy = req.user.userId;
  await bill.save();

  // Best-effort email confirmation
  try {
    await emailService.sendPaymentConfirmation(bill.tenant, payment, bill);
  } catch (err) {
    logger.warn('Failed to send payment confirmation email', { error: err.message });
  }

  sendSuccess(res, 'Payment recorded', payment, null, 201);
};

// ── List payments ───────────────────────────────────────────────────
exports.getPayments = async (req, res) => {
  const { page = 1, limit = 15, sort, tenant: filterTenant, status: filterStatus, search } = req.query;
  const filter = {};

  if (req.user.role === 'tenant') {
    const tenant = await Tenant.findOne({ user: req.user.userId });
    if (!tenant) return sendSuccess(res, 'No payments', { payments: [] });
    filter.tenant = tenant._id;
  } else {
    filter.owner = req.user.userId;
    if (filterTenant) filter.tenant = filterTenant;
  }
  if (filterStatus) filter.status = filterStatus;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    const { User } = require('../models');
    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);
    const matchingTenants = await Tenant.find({ user: { $in: userIds } }).select('_id');
    const tenantIds = matchingTenants.map((t) => t._id);
    filter.$or = [
      { tenant: { $in: tenantIds } },
      { transactionId: regex },
      { notes: regex },
    ];
  }

  const query = Payment.find(filter)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('bill', 'billingPeriod totalAmount status')
    .sort(buildSort(sort || '-paymentDate'));

  const result = await paginate(query, Number(page), Number(limit));
  sendSuccess(res, 'Payments retrieved', { payments: result.data }, result.pagination);
};

// ── Get single payment ──────────────────────────────────────────────
exports.getPaymentById = async (req, res) => {
  const filter = { _id: req.params.id };

  if (req.user.role === 'tenant') {
    const tenant = await Tenant.findOne({ user: req.user.userId });
    if (!tenant) throw new AppError('Tenant profile not found', 404);
    filter.tenant = tenant._id;
  } else if (req.user.role !== 'admin') {
    filter.owner = req.user.userId;
  }

  const payment = await Payment.findOne(filter)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName email' } })
    .populate('bill', 'billingPeriod totalAmount paidAmount status dueDate');

  if (!payment) throw new AppError('Payment not found', 404);
  sendSuccess(res, 'Payment retrieved', payment);
};

// ── Owner: Update payment ───────────────────────────────────────────
exports.updatePayment = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!payment) throw new AppError('Payment not found', 404);

  const { status, notes } = req.body;
  if (status) payment.status = status;
  if (notes !== undefined) payment.notes = notes;
  payment.updatedBy = req.user.userId;
  await payment.save();

  sendSuccess(res, 'Payment updated', payment);
};

// ── Owner: Payment stats ────────────────────────────────────────────
exports.getPaymentStats = async (req, res) => {
  const { startDate, endDate } = req.query;
  const summary = await Payment.getPaymentSummary(req.user.userId, startDate, endDate);

  const stats = { totalCollected: 0, totalRefunded: 0, transactionCount: 0, byMethod: {} };
  summary.forEach((s) => {
    stats.totalCollected += s.totalAmount;
    stats.totalRefunded += s.totalRefunds;
    stats.transactionCount += s.count;
    stats.byMethod[s._id] = { count: s.count, amount: s.totalAmount };
  });
  stats.netCollected = stats.totalCollected - stats.totalRefunded;

  // Monthly trend (last 12 months)
  const monthlyTrend = await Payment.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(req.user.userId), status: 'completed' } },
    {
      $group: {
        _id: { year: { $year: '$paymentDate' }, month: { $month: '$paymentDate' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  sendSuccess(res, 'Payment stats', { ...stats, monthlyTrend });
};

// ── Tenant: Create Razorpay order ───────────────────────────────────
exports.createOrder = async (req, res) => {
  if (!razorpayService.isConfigured()) {
    throw new AppError('Online payments are not configured', 503);
  }

  const { billId } = req.body;
  if (!billId) throw new AppError('Bill ID is required', 400);

  const tenant = await Tenant.findOne({ user: req.user.userId });
  if (!tenant) throw new AppError('Tenant profile not found', 404);

  const bill = await Bill.findOne({ _id: billId, tenant: tenant._id });
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status === 'paid') throw new AppError('Bill is already paid', 400);

  const remaining = bill.totalAmount - (bill.paidAmount || 0);
  if (remaining <= 0) throw new AppError('No outstanding balance', 400);

  const order = await razorpayService.createOrder({
    amount: remaining,
    receipt: `bill_${bill._id}`,
    notes: { billId: bill._id.toString(), tenantId: tenant._id.toString() },
  });

  // Create pending payment record
  const payment = await Payment.create({
    bill: bill._id,
    tenant: tenant._id,
    owner: bill.owner,
    amount: remaining,
    paymentDate: new Date(),
    paymentMethod: 'razorpay',
    status: 'pending',
    razorpayOrderId: order.id,
    createdBy: req.user.userId,
  });

  sendSuccess(res, 'Order created', {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment._id,
  });
};

// ── Tenant: Verify Razorpay payment ─────────────────────────────────
exports.verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new AppError('Missing payment verification fields', 400);
  }

  const isValid = razorpayService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValid) throw new AppError('Payment verification failed', 400);

  const payment = await Payment.findOne({ razorpayOrderId, status: 'pending' });
  if (!payment) throw new AppError('Payment record not found', 404);

  // Fetch actual amount from Razorpay
  const rpPayment = await razorpayService.fetchPayment(razorpayPaymentId);
  const amount = rpPayment.amount / 100; // paise → rupees

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.amount = amount;
  payment.status = 'completed';
  await payment.save();

  // Update bill
  const bill = await Bill.findById(payment.bill);
  if (bill) {
    bill.paidAmount = (bill.paidAmount || 0) + amount;
    bill.paymentMethod = 'razorpay';
    await bill.save();
  }

  // Email confirmation
  const tenant = await Tenant.findById(payment.tenant).populate('user', 'firstName lastName email');
  if (tenant) {
    try {
      await emailService.sendPaymentConfirmation(tenant, payment, bill);
    } catch (err) {
      logger.warn('Payment confirmation email failed', { error: err.message });
    }
  }

  sendSuccess(res, 'Payment verified and recorded', payment);
};
