const { Property, Tenant, Bill, Payment } = require('../models');
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/response');

exports.getOwnerDashboard = async (req, res) => {
  const ownerId = req.user.userId;

  const [properties, tenants, activeTenants, recentBills, recentPayments] = await Promise.all([
    Property.find({ owner: ownerId }).select('name address totalUnits availableUnits'),
    Tenant.countDocuments({ owner: ownerId }),
    Tenant.countDocuments({ owner: ownerId, status: 'active' }),
    Bill.find({ owner: ownerId })
      .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('property', 'name')
      .sort('-createdAt')
      .limit(5),
    Payment.find({ owner: ownerId, status: 'completed' })
      .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
      .sort('-paymentDate')
      .limit(5),
  ]);

  // Financial overview
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ownerOid = new mongoose.Types.ObjectId(ownerId);

  const [monthlyRevenue, outstandingBills, overdueCount, expiringLeases] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          owner: ownerOid,
          status: 'completed',
          paymentDate: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Bill.aggregate([
      {
        $match: {
          owner: ownerOid,
          status: { $in: ['sent', 'partial', 'overdue'] },
        },
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Bill.countDocuments({ owner: ownerId, status: 'overdue' }),
    Tenant.find({
      owner: ownerId,
      status: 'active',
      rentType: 'lease',
      'leaseDetails.endDate': {
        $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        $gte: now,
      },
    })
      .populate('user', 'firstName lastName')
      .populate('property', 'name')
      .limit(5),
  ]);

  const totalUnits = properties.reduce((s, p) => s + (p.totalUnits || 0), 0);
  const availableUnits = properties.reduce((s, p) => s + (p.availableUnits || 0), 0);

  return sendSuccess(res, 'Dashboard data fetched', {
    overview: {
      totalProperties: properties.length,
      totalTenants: tenants,
      activeTenants,
      totalUnits,
      availableUnits,
      occupancyRate: totalUnits > 0 ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) : 0,
    },
    financial: {
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      monthlyPayments: monthlyRevenue[0]?.count || 0,
      totalOutstanding: outstandingBills[0]?.totalOutstanding || 0,
      outstandingBills: outstandingBills[0]?.count || 0,
      overdueBills: overdueCount,
    },
    recentBills,
    recentPayments,
    expiringLeases,
    properties,
  });
};
