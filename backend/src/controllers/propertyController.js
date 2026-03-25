const { Property, Tenant, Bill } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { paginate, buildSort, escapeRegex } = require('../utils/query');

exports.createProperty = async (req, res) => {
  const property = await Property.create({
    ...req.body,
    owner: req.user.userId,
    createdBy: req.user.userId,
  });
  return sendSuccess(res, 'Property created', { property }, null, 201);
};

exports.getProperties = async (req, res) => {
  const { page = 1, limit = 10, sort, search } = req.query;
  const filter = { owner: req.user.userId, isActive: true };

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { 'address.city': regex }, { 'address.state': regex }];
  }

  const query = Property.find(filter).sort(buildSort(sort));
  const result = await paginate(query, Number(page), Number(limit));

  return sendSuccess(res, 'Properties fetched', { properties: result.data }, result.pagination);
};

exports.getPropertyById = async (req, res) => {
  const property = await Property.findOne({
    _id: req.params.id,
    owner: req.user.userId,
  });
  if (!property) return sendError(res, 'Property not found', 404);

  const tenants = await Tenant.find({ property: property._id, status: 'active' })
    .populate('user', 'firstName lastName email phone');

  return sendSuccess(res, 'Property fetched', { property, tenants });
};

exports.updateProperty = async (req, res) => {
  const blocked = ['owner', 'createdBy'];
  blocked.forEach((f) => delete req.body[f]);

  // If totalUnits is changing, recalculate availableUnits
  if (req.body.totalUnits != null) {
    const existing = await Property.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!existing) return sendError(res, 'Property not found', 404);

    const occupiedUnits = await Tenant.countDocuments({
      property: existing._id,
      status: { $in: ['active', 'pending'] },
    });
    const newTotal = Number(req.body.totalUnits);
    if (newTotal < occupiedUnits) {
      return sendError(res, `Cannot reduce total units below ${occupiedUnits} (currently occupied)`, 400);
    }
    req.body.availableUnits = newTotal - occupiedUnits;
  }

  const property = await Property.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.userId },
    { ...req.body, updatedBy: req.user.userId },
    { new: true, runValidators: true }
  );
  if (!property) return sendError(res, 'Property not found', 404);
  return sendSuccess(res, 'Property updated', { property });
};

exports.deleteProperty = async (req, res) => {
  const property = await Property.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!property) return sendError(res, 'Property not found', 404);

  const activeTenants = await Tenant.countDocuments({ property: property._id, status: 'active' });
  if (activeTenants > 0) {
    return sendError(res, 'Cannot delete property with active tenants', 400);
  }

  await Property.findByIdAndDelete(property._id);
  return sendSuccess(res, 'Property deleted');
};

exports.getPropertyStats = async (req, res) => {
  const property = await Property.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!property) return sendError(res, 'Property not found', 404);

  const [tenants, bills] = await Promise.all([
    Tenant.find({ property: property._id }),
    Bill.find({ property: property._id }),
  ]);

  const active = tenants.filter((t) => t.status === 'active').length;
  const totalRevenue = bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.paidAmount, 0);
  const outstanding = bills.filter((b) => ['sent', 'partial'].includes(b.status)).reduce((sum, b) => sum + b.remainingBalance, 0);

  return sendSuccess(res, 'Property stats fetched', {
    occupancy: { total: property.totalUnits, occupied: active, available: property.totalUnits - active },
    financial: { totalRevenue, outstanding },
    tenantCount: { active, total: tenants.length },
  });
};

exports.getAvailableUnits = async (req, res) => {
  const property = await Property.findOne({ _id: req.params.id, owner: req.user.userId });
  if (!property) return sendError(res, 'Property not found', 404);

  const occupiedUnits = await Tenant.find(
    { property: property._id, status: { $in: ['active', 'pending'] } },
    'unit'
  );
  const occupied = occupiedUnits.map((t) => t.unit);

  // Generate all possible units
  const allUnits = [];
  for (let i = 1; i <= property.totalUnits; i++) {
    const unitName = `${i}`;
    allUnits.push({ unit: unitName, isOccupied: occupied.includes(unitName) });
  }

  return sendSuccess(res, 'Units fetched', { units: allUnits, available: allUnits.filter((u) => !u.isOccupied).length });
};
