const { Bill, Tenant, Payment } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { paginate, buildSort, escapeRegex } = require('../utils/query');
const emailService = require('../services/emailService');

exports.createBill = async (req, res) => {
  const { tenant: tenantId, billingPeriod, charges, credits, previousBalance, dueDate, notes } = req.body;

  const tenant = await Tenant.findOne({ _id: tenantId, owner: req.user.userId })
    .populate('user', 'firstName lastName email');
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  // Check duplicate billing period
  const existing = await Bill.findOne({
    tenant: tenantId,
    'billingPeriod.month': billingPeriod.month,
    'billingPeriod.year': billingPeriod.year,
  });
  if (existing) return sendError(res, `Bill already exists for ${billingPeriod.month}/${billingPeriod.year}`, 409);

  const bill = await Bill.create({
    tenant: tenantId,
    property: tenant.property,
    owner: req.user.userId,
    billingPeriod,
    charges,
    credits,
    previousBalance: previousBalance || tenant.balance || 0,
    dueDate,
    notes,
    totalAmount: 0, // Will be calculated by pre-save hook
    createdBy: req.user.userId,
  });

  const populated = await Bill.findById(bill._id)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('property', 'name');

  return sendSuccess(res, 'Bill created', { bill: populated }, null, 201);
};

exports.getBills = async (req, res) => {
  const { page = 1, limit = 10, sort, status: filterStatus, tenant: filterTenant, search } = req.query;
  let filter;

  if (req.user.role === 'tenant') {
    const tenant = await Tenant.findOne({ user: req.user.userId });
    if (!tenant) return sendError(res, 'No tenancy found', 404);
    filter = { tenant: tenant._id };
  } else {
    filter = { owner: req.user.userId };
    if (filterTenant) filter.tenant = filterTenant;
  }
  if (filterStatus) filter.status = filterStatus;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    // Find users matching the search, then find their tenant IDs
    const { User } = require('../models');
    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);
    const matchingTenants = await Tenant.find({ user: { $in: userIds } }).select('_id');
    const tenantIds = matchingTenants.map((t) => t._id);
    // Also search by property name
    const { Property } = require('../models');
    const matchingProperties = await Property.find({ name: regex }).select('_id');
    const propIds = matchingProperties.map((p) => p._id);
    filter.$or = [
      { tenant: { $in: tenantIds } },
      { property: { $in: propIds } },
    ];
  }

  const query = Bill.find(filter)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('property', 'name')
    .sort(buildSort(sort || '-billingPeriod.year,-billingPeriod.month'));

  const result = await paginate(query, Number(page), Number(limit));

  return sendSuccess(res, 'Bills fetched', { bills: result.data }, result.pagination);
};

exports.getBillsByTenantId = async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.tenantId, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  const { page = 1, limit = 20 } = req.query;
  const query = Bill.find({ tenant: tenant._id })
    .populate('property', 'name')
    .sort('-billingPeriod.year -billingPeriod.month');

  const result = await paginate(query, Number(page), Number(limit));

  return sendSuccess(res, 'Bills fetched', { bills: result.data }, result.pagination);
};

exports.getBillById = async (req, res) => {
  let filter = { _id: req.params.id };
  if (req.user.role === 'owner') {
    filter.owner = req.user.userId;
  } else {
    const tenant = await Tenant.findOne({ user: req.user.userId });
    if (tenant) filter.tenant = tenant._id;
  }

  const bill = await Bill.findOne(filter)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName email phone' } })
    .populate('property', 'name address');

  if (!bill) return sendError(res, 'Bill not found', 404);

  const payments = await Payment.find({ bill: bill._id }).sort('-paymentDate');

  return sendSuccess(res, 'Bill fetched', { bill, payments });
};

exports.updateBill = async (req, res) => {
  const blocked = ['tenant', 'property', 'owner', 'createdBy'];
  blocked.forEach((f) => delete req.body[f]);

  const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!bill) return sendError(res, 'Bill not found', 404);

  Object.assign(bill, req.body, { updatedBy: req.user.userId });
  if (req.body.charges) bill.markModified('charges');
  if (req.body.credits) bill.markModified('credits');
  await bill.save();

  const populated = await Bill.findById(bill._id)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName email' } })
    .populate('property', 'name address');

  return sendSuccess(res, 'Bill updated', { bill: populated });
};

exports.deleteBill = async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!bill) return sendError(res, 'Bill not found', 404);

  const paymentCount = await Payment.countDocuments({ bill: bill._id });
  if (paymentCount > 0) return sendError(res, 'Cannot delete bill with existing payments', 400);

  await Bill.findByIdAndDelete(bill._id);
  return sendSuccess(res, 'Bill deleted');
};

exports.sendBill = async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!bill) return sendError(res, 'Bill not found', 404);
  if (bill.status !== 'draft') return sendError(res, 'Only draft bills can be sent', 400);

  bill.status = 'sent';
  bill.reminders.push({ sentAt: new Date(), type: 'initial', method: 'email' });
  await bill.save();

  // Send email notification
  const tenant = await Tenant.findById(bill.tenant).populate('user', 'firstName lastName email');
  if (tenant) {
    await emailService.sendBillNotification(tenant, bill);
  }

  return sendSuccess(res, 'Bill sent to tenant', { bill });
};

exports.getBillsSummary = async (req, res) => {
  const revenueSummary = await Bill.getRevenueSummary(req.user.userId);

  const summary = {
    total: 0, paid: 0, outstanding: 0, overdue: 0,
    totalAmount: 0, paidAmount: 0, outstandingAmount: 0,
  };

  revenueSummary.forEach((item) => {
    summary.total += item.count;
    summary.totalAmount += item.totalAmount;
    if (item._id === 'paid') {
      summary.paid = item.count;
      summary.paidAmount = item.paidAmount;
    } else if (['sent', 'partial'].includes(item._id)) {
      summary.outstanding += item.count;
      summary.outstandingAmount += item.totalAmount - item.paidAmount;
    }
  });

  // Recent bills
  const recentBills = await Bill.find({ owner: req.user.userId })
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .sort('-createdAt')
    .limit(5);

  return sendSuccess(res, 'Summary fetched', { summary, recentBills });
};

exports.generateRecurringBills = async (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) return sendError(res, 'Month and year required', 400);

  const tenants = await Tenant.find({ owner: req.user.userId, status: 'active' });
  const results = { created: 0, skipped: 0, errors: [] };

  for (const tenant of tenants) {
    try {
      const existing = await Bill.findOne({
        tenant: tenant._id,
        'billingPeriod.month': month,
        'billingPeriod.year': year,
      });
      if (existing) {
        results.skipped++;
        continue;
      }

      const dueDate = new Date(year, month - 1, 5); // 5th of the month
      await Bill.create({
        tenant: tenant._id,
        property: tenant.property,
        owner: req.user.userId,
        billingPeriod: { month, year },
        charges: { rent: tenant.monthlyRent },
        previousBalance: tenant.balance || 0,
        dueDate,
        totalAmount: 0,
        createdBy: req.user.userId,
      });
      results.created++;
    } catch (err) {
      results.errors.push({ tenant: tenant._id, error: err.message });
    }
  }

  return sendSuccess(res, `Generated ${results.created} bills, skipped ${results.skipped}`, { results });
};
