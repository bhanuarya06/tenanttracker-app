const { Property, Tenant, Bill, Payment } = require('../models');
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/response');

exports.getOwnerDashboard = async (req, res) => {
  const ownerId = req.user.userId;
  const ownerOid = new mongoose.Types.ObjectId(ownerId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build last 12 month periods
  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last12Months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  const oldest = last12Months[0];
  const oldestDate = new Date(oldest.year, oldest.month - 1, 1);

  const [
    properties,
    activeTenants,
    totalTenantsCount,
    recentBills,
    recentPayments,
    monthlyRevenue,
    outstandingBills,
    currentMonthBilled,
    revenueByMonth,
    paymentsByMonth,
    expiringLeases,
    overdueTenantsCount,
  ] = await Promise.all([
    Property.find({ owner: ownerId }).select('name address totalUnits availableUnits'),

    Tenant.countDocuments({ owner: ownerId, status: 'active' }),
    Tenant.countDocuments({ owner: ownerId }),

    Bill.find({ owner: ownerId })
      .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
      .populate('property', 'name')
      .sort('-createdAt')
      .limit(5),

    Payment.find({ owner: ownerId, status: 'completed' })
      .populate({ path: 'tenant', populate: { path: 'user', select: 'firstName lastName' } })
      .sort('-paymentDate')
      .limit(5),

    // This month's collected
    Payment.aggregate([
      { $match: { owner: ownerOid, status: 'completed', paymentDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),

    // Outstanding (not paid)
    Bill.aggregate([
      { $match: { owner: ownerOid, status: { $in: ['issued', 'partial', 'overdue'] } } },
      { $group: { _id: null, totalOutstanding: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } }, count: { $sum: 1 } } },
    ]),

    // This month total billed
    Bill.aggregate([
      {
        $match: {
          owner: ownerOid,
          'billingPeriod.month': now.getMonth() + 1,
          'billingPeriod.year': now.getFullYear(),
          status: { $ne: 'draft' },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, { $subtract: ['$totalAmount', '$paidAmount'] }, 0] } } } },
    ]),

    // 12-month billed totals
    Bill.aggregate([
      {
        $match: {
          owner: ownerOid,
          status: { $ne: 'draft' },
          $or: last12Months.map(({ month, year }) => ({ 'billingPeriod.month': month, 'billingPeriod.year': year })),
        },
      },
      { $group: { _id: { month: '$billingPeriod.month', year: '$billingPeriod.year' }, billed: { $sum: '$totalAmount' } } },
    ]),

    // 12-month collected totals
    Payment.aggregate([
      { $match: { owner: ownerOid, status: 'completed', paymentDate: { $gte: oldestDate } } },
      {
        $group: {
          _id: { month: { $month: '$paymentDate' }, year: { $year: '$paymentDate' } },
          collected: { $sum: '$amount' },
        },
      },
    ]),

    // Expiring leases within 60 days
    Tenant.find({
      owner: ownerId,
      status: 'active',
      rentType: 'lease',
      'leaseDetails.endDate': { $lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), $gte: now },
    })
      .populate('user', 'firstName lastName')
      .populate('property', 'name')
      .limit(10),

    // Overdue tenants
    Bill.countDocuments({ owner: ownerId, status: 'overdue' }),
  ]);

  // Build revenue chart merging billed + collected per month
  const billedMap = {};
  revenueByMonth.forEach((r) => { billedMap[`${r._id.year}-${r._id.month}`] = r.billed; });
  const collectedMap = {};
  paymentsByMonth.forEach((r) => { collectedMap[`${r._id.year}-${r._id.month}`] = r.collected; });

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueChart = last12Months.map(({ month, year }) => ({
    label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`,
    billed: billedMap[`${year}-${month}`] || 0,
    collected: collectedMap[`${year}-${month}`] || 0,
  }));

  // Per-property breakdown
  const allActiveTenants = await Tenant.find({ owner: ownerId, status: 'active' }).select('property monthlyRent');
  const propTenantMap = {};
  allActiveTenants.forEach((t) => {
    const pid = t.property.toString();
    if (!propTenantMap[pid]) propTenantMap[pid] = { count: 0, expectedRent: 0 };
    propTenantMap[pid].count += 1;
    propTenantMap[pid].expectedRent += (t.monthlyRent || 0);
  });

  const propertyBreakdown = properties.map((p) => {
    const info = propTenantMap[p._id.toString()] || { count: 0, expectedRent: 0 };
    const occupied = p.totalUnits - (p.availableUnits || 0);
    return {
      _id: p._id,
      name: p.name,
      totalUnits: p.totalUnits || 0,
      occupiedUnits: occupied,
      availableUnits: p.availableUnits || 0,
      occupancyRate: p.totalUnits > 0 ? Math.round((occupied / p.totalUnits) * 100) : 0,
      activeTenants: info.count,
      expectedRent: info.expectedRent,
    };
  });

  // Vacancy cost = sum of available units × avg rent of that property
  const vacancyCost = propertyBreakdown.reduce((sum, p) => {
    const avgRent = p.activeTenants > 0 ? Math.round(p.expectedRent / p.activeTenants) : 0;
    return sum + p.availableUnits * avgRent;
  }, 0);

  const totalUnits = properties.reduce((s, p) => s + (p.totalUnits || 0), 0);
  const availableUnits = properties.reduce((s, p) => s + (p.availableUnits || 0), 0);

  const thisMonthBilled = currentMonthBilled[0]?.total || 0;
  const thisMonthCollected = monthlyRevenue[0]?.total || 0;
  const thisMonthOverdue = currentMonthBilled[0]?.overdue || 0;
  const thisMonthPending = Math.max(0, thisMonthBilled - thisMonthCollected);

  return sendSuccess(res, 'Dashboard data fetched', {
    overview: {
      totalProperties: properties.length,
      totalTenants: totalTenantsCount,
      activeTenants,
      totalUnits,
      availableUnits,
      occupancyRate: totalUnits > 0 ? Math.round(((totalUnits - availableUnits) / totalUnits) * 100) : 0,
    },
    financial: {
      thisMonthBilled,
      thisMonthCollected,
      thisMonthPending,
      thisMonthOverdue,
      totalOutstanding: outstandingBills[0]?.totalOutstanding || 0,
      outstandingBills: outstandingBills[0]?.count || 0,
      overdueBills: overdueTenantsCount,
      vacancyCost,
      monthlyRevenue: thisMonthCollected,
      monthlyPayments: monthlyRevenue[0]?.count || 0,
    },
    revenueChart,
    propertyBreakdown,
    recentBills,
    recentPayments,
    expiringLeases,
    properties,
    alerts: {
      overdueCount: overdueTenantsCount,
      expiringIn30: expiringLeases.filter((t) => {
        const days = Math.ceil((new Date(t.leaseDetails?.endDate) - now) / (1000 * 60 * 60 * 24));
        return days <= 30;
      }).length,
      expiringIn60: expiringLeases.length,
    },
  });
};
