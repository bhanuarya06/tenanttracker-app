export const UTILITY_KEYS = ['water', 'electricity', 'gas', 'internet', 'trash'];
export const DIRECT_CHARGE_KEYS = ['maintenance', 'parking', 'petFee', 'lateFee'];

const UTILITY_LABELS = { water: 'Water', electricity: 'Electricity', gas: 'Gas', internet: 'Internet', trash: 'Trash' };
const DIRECT_LABELS = { maintenance: 'Maintenance', parking: 'Parking', petFee: 'Pet Fee', lateFee: 'Late Fee' };

/** Convert flat form state → nested backend charges format */
export function buildChargesPayload(flat) {
  const payload = { rent: Number(flat.rent) || 0 };
  const utilities = {};
  UTILITY_KEYS.forEach((k) => { if (flat[k]) utilities[k] = Number(flat[k]); });
  if (Object.keys(utilities).length > 0) payload.utilities = utilities;
  DIRECT_CHARGE_KEYS.forEach((k) => { if (flat[k]) payload[k] = Number(flat[k]); });
  return payload;
}

/** Convert nested backend charges → flat form state (for edit forms) */
export function flattenChargesToForm(charges) {
  if (!charges) return {};
  const flat = {};
  if (charges.rent) flat.rent = charges.rent;
  const utils = charges.utilities || {};
  UTILITY_KEYS.forEach((k) => { if (utils[k] > 0) flat[k] = utils[k]; });
  DIRECT_CHARGE_KEYS.forEach((k) => { if (charges[k] > 0) flat[k] = charges[k]; });
  return flat;
}

/** Convert nested backend charges → display line items */
export function flattenChargesToLines(charges) {
  if (!charges) return [];
  const lines = [];
  if (charges.rent > 0) lines.push({ label: 'Rent', value: charges.rent });
  const u = charges.utilities || {};
  Object.entries(UTILITY_LABELS).forEach(([k, label]) => { if (u[k] > 0) lines.push({ label, value: u[k] }); });
  Object.entries(DIRECT_LABELS).forEach(([k, label]) => { if (charges[k] > 0) lines.push({ label, value: charges[k] }); });
  (charges.additionalCharges || []).forEach((a) => { if (a.amount > 0) lines.push({ label: a.description, value: a.amount }); });
  return lines;
}
