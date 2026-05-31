const { User, Tenant, Property, Bill, Payment } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { paginate, buildSort, escapeRegex } = require('../utils/query');
const emailService = require('../services/emailService');

exports.createTenant = async (req, res) => {
  const { user: userData, property: propertyId, unit, rentType, monthlyRent, securityDeposit, leaseDetails, occupantCount, occupants, emergencyContacts, preferences, status, moveInDate, notes } = req.body;

  // Verify property ownership
  const property = await Property.findOne({ _id: propertyId, owner: req.user.userId });
  if (!property) return sendError(res, 'Property not found or not owned by you', 404);

  // Check unit availability
  const existingTenant = await Tenant.findOne({ property: propertyId, unit, status: { $in: ['active', 'pending'] } });
  if (existingTenant) return sendError(res, 'Unit is already occupied', 409);

  // Handle user: either existing userId or create new user
  let tenantUser;
  let tempPassword = null;
  if (typeof userData === 'string') {
    tenantUser = await User.findById(userData);
    if (!tenantUser) return sendError(res, 'User not found', 404);
  } else {
    // Check if email already exists
    const existing = await User.findOne({ email: userData.email.toLowerCase() });
    if (existing) return sendError(res, 'A user with this email already exists', 409);

    // Generate temp password if none provided
    if (!userData.password) {
      tempPassword = Math.random().toString(36).slice(-8) + 'T1!';
      userData.password = tempPassword;
    }

    tenantUser = await User.create({
      ...userData,
      role: 'tenant',
    });
  }

  const tenant = await Tenant.create({
    user: tenantUser._id,
    property: propertyId,
    unit,
    owner: req.user.userId,
    rentType,
    monthlyRent,
    securityDeposit: securityDeposit || 0,
    leaseDetails: rentType === 'lease' ? leaseDetails : undefined,
    occupantCount: occupantCount || (occupants?.length || 1),
    occupants,
    emergencyContacts,
    preferences,
    status: status || 'active',
    moveInDate,
    rentHistory: [{ amount: monthlyRent, effectiveDate: moveInDate || new Date(), reason: 'Initial rent', changedBy: req.user.userId }],
    notes: notes ? [{ content: notes, createdBy: req.user.userId }] : [],
    createdBy: req.user.userId,
  });

  // Update property available units
  if (property.availableUnits > 0) {
    property.availableUnits -= 1;
    await property.save();
  }

  const populated = await Tenant.findById(tenant._id)
    .populate('user', 'firstName lastName email phone avatar')
    .populate('property', 'name address propertyType');

  // Best-effort onboarding email to the tenant
  const owner = await User.findById(req.user.userId).select('firstName lastName');
  if (owner) {
    emailService.sendTenantOnboardingEmail(tenantUser, owner, property, tempPassword).catch(() => {});
  }

  return sendSuccess(res, 'Tenant added successfully', { tenant: populated }, null, 201);
};

exports.getTenants = async (req, res) => {
  const { page = 1, limit = 20, sort, search, status: filterStatus, property: filterProperty } = req.query;
  const filter = { owner: req.user.userId };
  if (filterStatus) {
    const statuses = filterStatus.split(',').map((s) => s.trim()).filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }
  if (filterProperty) filter.property = filterProperty;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    // Search by tenant name/email/phone (User model) + unit
    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [{ unit: regex }, { user: { $in: userIds } }];
  }

  const query = Tenant.find(filter)
    .populate('user', 'firstName lastName email phone avatar')
    .populate('property', 'name address propertyType')
    .sort(buildSort(sort));

  const result = await paginate(query, Number(page), Number(limit));

  return sendSuccess(res, 'Tenants fetched', { tenants: result.data }, result.pagination);
};

exports.getTenantById = async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId })
    .populate('user', 'firstName lastName email phone avatar dateOfBirth gender address bio')
    .populate('property', 'name address propertyType amenities totalUnits');

  if (!tenant) return sendError(res, 'Tenant not found', 404);

  // Get financial summary
  const bills = await Bill.find({ tenant: tenant._id });
  const payments = await Payment.find({ tenant: tenant._id, status: 'completed' });

  const totalBilled = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = bills
    .filter((b) => ['issued', 'partial', 'overdue'].includes(b.status))
    .reduce((s, b) => s + b.remainingBalance, 0);
  const overdue = bills
    .filter((b) => b.isOverdue)
    .reduce((s, b) => s + b.remainingBalance, 0);

  return sendSuccess(res, 'Tenant fetched', {
    tenant,
    financialSummary: { totalBilled, totalPaid, outstanding, overdue },
    recentBills: bills.slice(0, 5),
  });
};

exports.updateTenant = async (req, res) => {
  const blocked = ['user', 'owner', 'property', 'createdBy', 'rentHistory'];
  blocked.forEach((f) => delete req.body[f]);

  const { rentChangeReason, rentEffectiveDate, ...rest } = req.body;

  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  // Handle user field updates
  const userFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'bio'];
  const userUpdate = {};
  userFields.forEach((f) => {
    if (rest[f] !== undefined) {
      userUpdate[f] = rest[f];
      delete rest[f];
    }
  });

  if (Object.keys(userUpdate).length > 0) {
    await User.findByIdAndUpdate(tenant.user, userUpdate, { runValidators: true });
  }

  // Check unit availability if changing unit
  if (rest.unit && rest.unit !== tenant.unit) {
    const existing = await Tenant.findOne({
      property: tenant.property,
      unit: rest.unit,
      status: { $in: ['active', 'pending'] },
      _id: { $ne: tenant._id },
    });
    if (existing) return sendError(res, 'Unit is already occupied', 409);
  }

  // Record rent change in history
  if (rest.monthlyRent !== undefined && Number(rest.monthlyRent) !== tenant.monthlyRent) {
    tenant.rentHistory.push({
      amount: Number(rest.monthlyRent),
      effectiveDate: rentEffectiveDate || new Date(),
      reason: rentChangeReason || '',
      changedBy: req.user.userId,
    });
  }

  // Track status change for availableUnits adjustment
  const wasActive = ['active', 'pending'].includes(tenant.status);
  const willBeActive = rest.status ? ['active', 'pending'].includes(rest.status) : wasActive;

  Object.assign(tenant, rest);
  tenant.updatedBy = req.user.userId;
  await tenant.save();

  // Adjust property availableUnits if occupancy changed
  if (wasActive && !willBeActive) {
    await Property.findByIdAndUpdate(tenant.property, { $inc: { availableUnits: 1 } });
  } else if (!wasActive && willBeActive) {
    await Property.findByIdAndUpdate(tenant.property, { $inc: { availableUnits: -1 } });
  }

  const updated = await Tenant.findById(tenant._id)
    .populate('user', 'firstName lastName email phone avatar')
    .populate('property', 'name address propertyType');

  return sendSuccess(res, 'Tenant updated', { tenant: updated });
};

exports.deleteTenant = async (req, res) => {
  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  const outstandingBills = await Bill.countDocuments({
    tenant: tenant._id,
    status: { $in: ['issued', 'partial', 'overdue'] },
  });
  if (outstandingBills > 0) {
    return sendError(res, 'Cannot delete tenant with outstanding bills', 400);
  }

  // Free up the unit
  await Property.findByIdAndUpdate(tenant.property, { $inc: { availableUnits: 1 } });
  await Tenant.findByIdAndDelete(tenant._id);

  return sendSuccess(res, 'Tenant removed');
};

exports.getExpiringLeases = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const tenants = await Tenant.findExpiringLeases(req.user.userId, days);
  return sendSuccess(res, 'Expiring leases fetched', { tenants, count: tenants.length });
};

exports.addDeposit = async (req, res) => {
  const { amount, date, reason } = req.body;
  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  tenant.depositAdditions.push({ amount: Number(amount), date: date || new Date(), reason: reason || '', addedBy: req.user.userId });
  await tenant.save();
  return sendSuccess(res, 'Deposit added', { depositAdditions: tenant.depositAdditions, totalDeposit: tenant.securityDeposit + tenant.depositAdditions.reduce((s, a) => s + a.amount, 0) });
};

exports.addDeduction = async (req, res) => {
  const { category, description, amount } = req.body;
  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  tenant.depositDeductions.push({ category, description: description || '', amount: Number(amount), addedBy: req.user.userId });
  await tenant.save();
  return sendSuccess(res, 'Deduction added', { depositDeductions: tenant.depositDeductions });
};

exports.updateDepositRefund = async (req, res) => {
  const { status, paidAmount, paidDate, paymentMode, notes } = req.body;
  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  tenant.depositRefund = { status, paidAmount: Number(paidAmount) || 0, paidDate: paidDate || undefined, paymentMode, notes: notes || '' };
  await tenant.save();
  return sendSuccess(res, 'Refund updated', { depositRefund: tenant.depositRefund });
};

exports.addTenantNote = async (req, res) => {
  const { content, isPrivate } = req.body;
  const tenant = await Tenant.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!tenant) return sendError(res, 'Tenant not found', 404);

  tenant.notes.push({ content, createdBy: req.user.userId, isPrivate: isPrivate || false });
  await tenant.save();

  return sendSuccess(res, 'Note added', { notes: tenant.notes });
};

exports.getTenantDashboard = async (req, res) => {
  // Find tenant record for current user
  const tenant = await Tenant.findOne({ user: req.user.userId, status: 'active' })
    .populate('property', 'name address propertyType amenities')
    .populate('owner', 'firstName lastName email phone');

  if (!tenant) return sendError(res, 'No active tenancy found', 404);

  const [bills, payments] = await Promise.all([
    Bill.find({ tenant: tenant._id, status: { $ne: 'draft' } }).sort('-billingPeriod.year -billingPeriod.month').limit(12),
    Payment.find({ tenant: tenant._id, status: 'completed' }).sort('-paymentDate').limit(10),
  ]);

  const currentBill = bills.find((b) => ['issued', 'partial', 'overdue'].includes(b.status));
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = bills
    .filter((b) => ['issued', 'partial', 'overdue'].includes(b.status))
    .reduce((s, b) => s + b.remainingBalance, 0);

  return sendSuccess(res, 'Dashboard fetched', {
    tenant,
    summary: {
      monthlyRent: tenant.monthlyRent,
      outstanding,
      totalPaid,
      securityDeposit: tenant.securityDeposit || 0,
      rentType: tenant.rentType,
      leaseStatus: tenant.leaseStatus,
    },
    currentBill,
    recentBills: bills.slice(0, 6),
    recentPayments: payments.slice(0, 5),
  });
};
