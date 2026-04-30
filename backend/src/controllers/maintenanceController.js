const { Maintenance, Tenant } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { paginate, buildSort } = require('../utils/query');

exports.createRequest = async (req, res) => {
  const { category, title, description, priority } = req.body;

  // Find the tenant record for this user
  const tenant = await Tenant.findOne({ user: req.user.userId, status: 'active' });
  if (!tenant) return sendError(res, 'No active tenancy found', 404);

  const request = await Maintenance.create({
    tenant: tenant._id,
    property: tenant.property,
    owner: tenant.owner,
    category,
    title,
    description,
    priority: priority || 'medium',
    createdBy: req.user.userId,
  });

  return sendSuccess(res, 'Maintenance request submitted', { request }, null, 201);
};

exports.getRequests = async (req, res) => {
  const { page = 1, limit = 20, sort, status: filterStatus, category: filterCategory } = req.query;
  let filter;

  if (req.user.role === 'tenant') {
    const tenant = await Tenant.findOne({ user: req.user.userId });
    if (!tenant) return sendError(res, 'No tenancy found', 404);
    filter = { tenant: tenant._id };
  } else {
    filter = { owner: req.user.userId };
  }

  if (filterStatus) filter.status = filterStatus;
  if (filterCategory) filter.category = filterCategory;

  const query = Maintenance.find(filter)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
    .populate('property', 'name')
    .sort(buildSort(sort || '-createdAt'));

  const result = await paginate(query, Number(page), Number(limit));
  return sendSuccess(res, 'Requests fetched', { requests: result.data }, result.pagination);
};

exports.getRequestById = async (req, res) => {
  let filter = { _id: req.params.id };
  if (req.user.role === 'owner') {
    filter.owner = req.user.userId;
  } else {
    const tenant = await Tenant.findOne({ user: req.user.userId });
    if (tenant) filter.tenant = tenant._id;
  }

  const request = await Maintenance.findOne(filter)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName email phone' } })
    .populate('property', 'name address');

  if (!request) return sendError(res, 'Request not found', 404);
  return sendSuccess(res, 'Request fetched', { request });
};

exports.updateStatus = async (req, res) => {
  const { status, resolutionNotes } = req.body;
  const request = await Maintenance.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!request) return sendError(res, 'Request not found', 404);

  request.status = status;
  if (resolutionNotes !== undefined) request.resolutionNotes = resolutionNotes;
  if (status === 'resolved' && !request.resolvedAt) request.resolvedAt = new Date();
  request.updatedBy = req.user.userId;
  await request.save();

  return sendSuccess(res, 'Status updated', { request });
};
