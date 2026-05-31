const { Bill, Tenant } = require('../models');
const logger = require('../utils/logger');

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

async function generateBillsForMonth(month, year, ownerFilter = null) {
  const filter = { status: 'active' };
  if (ownerFilter) filter.owner = ownerFilter;

  const tenants = await Tenant.find(filter);
  const results = { created: 0, skipped: 0, errors: [] };

  for (const tenant of tenants) {
    try {
      const existing = await Bill.findOne({
        tenant: tenant._id,
        'billingPeriod.month': month,
        'billingPeriod.year': year,
      });
      if (existing) { results.skipped++; continue; }

      // Carry forward outstanding balance from last unpaid bill
      const lastBill = await Bill.findOne({ tenant: tenant._id })
        .sort({ 'billingPeriod.year': -1, 'billingPeriod.month': -1 });
      const previousBalance = lastBill ? Math.max(0, lastBill.remainingBalance) : 0;

      // Pro-rata credit for tenants who moved in mid-month
      let prorationCredit = 0;
      if (tenant.moveInDate) {
        const moveIn = new Date(tenant.moveInDate);
        const isMoveInMonth = moveIn.getFullYear() === year && (moveIn.getMonth() + 1) === month;
        if (isMoveInMonth && moveIn.getDate() > 1) {
          const totalDays = daysInMonth(month, year);
          prorationCredit = Math.round(((moveIn.getDate() - 1) / totalDays) * tenant.monthlyRent);
        }
      }

      // Late fee: 5% of monthly rent when enabled and previous bill is overdue
      let lateFee = 0;
      if (tenant.lateFeeEnabled && lastBill && lastBill.isOverdue) {
        lateFee = Math.round(tenant.monthlyRent * 0.05);
      }

      await Bill.create({
        tenant: tenant._id,
        property: tenant.property,
        owner: tenant.owner,
        billingPeriod: { month, year },
        charges: { rent: tenant.monthlyRent, lateFee },
        credits: { prorationCredit },
        previousBalance,
        dueDate: new Date(year, month - 1, 5),
        totalAmount: 0,
        createdBy: tenant.owner,
      });

      results.created++;
    } catch (err) {
      results.errors.push({ tenant: tenant._id, error: err.message });
      logger.error(`Bill generation failed for tenant ${tenant._id}: ${err.message}`);
    }
  }

  logger.info(`Bill generation ${month}/${year}: created=${results.created} skipped=${results.skipped} errors=${results.errors.length}`);
  return results;
}

module.exports = { generateBillsForMonth };
