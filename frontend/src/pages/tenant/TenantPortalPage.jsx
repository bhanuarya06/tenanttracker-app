import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, MapPin, Phone, Mail, Calendar, Shield, Receipt, CreditCard,
  Users, ChevronRight, CheckCircle, AlertTriangle, FileText, Banknote, Home,
  TrendingUp, Wrench, ArrowRight,
} from 'lucide-react';
import tenantService from '../../services/tenantService';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatsCard from '../../components/ui/StatsCard';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { BILL_STATUS, MONTHS } from '../../config/constants';

// ─── Lease Timeline ────────────────────────────────────────────────────────────

function LeaseTimeline({ tenant }) {
  if (tenant.rentType !== 'lease' || !tenant.leaseDetails?.startDate || !tenant.leaseDetails?.endDate) return null;
  const start = new Date(tenant.leaseDetails.startDate);
  const end = new Date(tenant.leaseDetails.endDate);
  const now = new Date();
  const total = end - start;
  const elapsed = Math.max(0, Math.min(now - start, total));
  const progress = Math.round((elapsed / total) * 100);
  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const barColor = progress > 90 ? 'bg-rose-500' : progress > 75 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span>{end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">{progress}% elapsed</span>
        <span className={`text-xs font-semibold ${progress > 90 ? 'text-rose-600' : progress > 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
          {tenant.leaseStatus === 'active' && `${daysRemaining} days remaining`}
          {tenant.leaseStatus === 'expiring' && `${daysRemaining} days — Expiring soon!`}
          {tenant.leaseStatus === 'expired' && 'Lease has expired'}
          {tenant.leaseStatus === 'upcoming' && 'Lease not started yet'}
        </span>
      </div>
    </div>
  );
}

// ─── Rent History ─────────────────────────────────────────────────────────────

function RentHistory({ history }) {
  if (!history?.length) return null;
  return (
    <Card>
      <Card.Header>
        <Card.Title>Rent History</Card.Title>
        <TrendingUp size={16} className="text-slate-400" />
      </Card.Header>
      <div className="relative pl-4">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-5">
          {[...history].reverse().map((h, i) => (
            <div key={i} className="relative pl-5">
              <div className="absolute -left-[1px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500 border-2 border-white" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <p className="text-sm font-bold text-slate-900">₹{h.amount.toLocaleString()}/mo</p>
                  {h.reason && <p className="text-xs text-slate-500">{h.reason}</p>}
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(h.effectiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Deposit Status ───────────────────────────────────────────────────────────

function DepositStatus({ tenant }) {
  const base = tenant.securityDeposit || 0;
  const additions = (tenant.depositAdditions || []).reduce((s, a) => s + a.amount, 0);
  const deductions = (tenant.depositDeductions || []).reduce((s, d) => s + d.amount, 0);
  const totalHeld = base + additions;
  const netRefund = totalHeld - deductions;
  const refund = tenant.depositRefund || {};

  const refundStatusColor = { pending: 'amber', partial: 'blue', refunded: 'emerald' };
  const refundStatusLabel = { pending: 'Pending', partial: 'Partially Refunded', refunded: 'Fully Refunded' };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Security Deposit</Card.Title>
        <Shield size={16} className="text-slate-400" />
      </Card.Header>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Total Held</p>
          <p className="font-bold text-slate-900 text-sm">₹{totalHeld.toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Deductions</p>
          <p className="font-bold text-rose-600 text-sm">₹{deductions.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">Net Refund</p>
          <p className="font-bold text-emerald-700 text-sm">₹{netRefund.toLocaleString()}</p>
        </div>
      </div>

      {(tenant.depositDeductions || []).length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Deductions</p>
          {tenant.depositDeductions.map((d, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-600">{d.category}{d.description ? ` — ${d.description}` : ''}</span>
              <span className="font-medium text-rose-600">−₹{d.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {refund.status && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">Refund status</span>
          <Badge color={refundStatusColor[refund.status] || 'amber'}>
            {refundStatusLabel[refund.status] || refund.status}
          </Badge>
        </div>
      )}
    </Card>
  );
}

// ─── Lease Status Badge Config ─────────────────────────────────────────────────

const LEASE_STATUS_CONFIG = {
  active: { color: 'emerald', label: 'Active' },
  expiring: { color: 'amber', label: 'Expiring Soon' },
  expired: { color: 'rose', label: 'Expired' },
  upcoming: { color: 'blue', label: 'Upcoming' },
  monthly: { color: 'primary', label: 'Month-to-Month' },
  'no-lease': { color: 'slate', label: 'No Lease' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantPortalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noTenancy, setNoTenancy] = useState(false);

  useEffect(() => {
    tenantService.getDashboard()
      .then(setData)
      .catch(() => setNoTenancy(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  if (noTenancy || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Lease</h1>
          <p className="text-slate-500 mt-1">Your tenancy details and portal</p>
        </div>
        <Card>
          <div className="text-center py-16">
            <Building2 className="h-14 w-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-700 font-semibold text-lg">No active tenancy found</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Your landlord will set up your tenancy in the system. Contact them if you believe this is an error.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const { tenant, summary, currentBill, recentBills, recentPayments } = data;
  const property = tenant?.property;
  const owner = tenant?.owner;
  const lsConf = LEASE_STATUS_CONFIG[tenant.leaseStatus] || LEASE_STATUS_CONFIG.monthly;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Lease & Portal</h1>
        <p className="text-slate-500 mt-1">
          {property?.name ? `${property.name} • ` : ''}Unit {tenant.unit}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Banknote} label="Monthly Rent" value={`₹${(summary?.monthlyRent || 0).toLocaleString()}`} color="primary" subtext={tenant.rentType === 'lease' ? 'Lease' : 'Month-to-month'} />
        <StatsCard icon={AlertTriangle} label="Outstanding" value={`₹${(summary?.outstanding || 0).toLocaleString()}`} color={summary?.outstanding > 0 ? 'amber' : 'emerald'} subtext={summary?.outstanding > 0 ? 'Due now' : 'All paid up'} />
        <StatsCard icon={CreditCard} label="Total Paid" value={`₹${(summary?.totalPaid || 0).toLocaleString()}`} color="emerald" />
        <StatsCard icon={Shield} label="Security Deposit" value={`₹${(summary?.securityDeposit || 0).toLocaleString()}`} color="violet" />
      </div>

      {/* Outstanding bill banner */}
      {currentBill && summary?.outstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Receipt className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Payment Due</p>
              <p className="text-sm text-amber-700 mt-0.5">
                ₹{currentBill.remainingBalance?.toLocaleString()} remaining for{' '}
                {MONTHS[(currentBill.billingPeriod?.month ?? 1) - 1]} {currentBill.billingPeriod?.year}
              </p>
            </div>
          </div>
          <Link to={`/bills/${currentBill._id}`} className="sm:flex-shrink-0">
            <Button variant="warning" size="sm">View Bill <ChevronRight size={16} /></Button>
          </Link>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property details */}
          <Card>
            <Card.Header>
              <Card.Title>Property Details</Card.Title>
              <Badge color={lsConf.color}>{lsConf.label}</Badge>
            </Card.Header>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Home size={17} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{property?.name}</p>
                    <p className="text-sm text-slate-500 capitalize">{property?.propertyType}</p>
                  </div>
                </div>
                {property?.address?.street && (
                  <div className="flex items-start gap-3">
                    <MapPin size={17} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700">{property.address.street}</p>
                      <p className="text-sm text-slate-500">
                        {property.address.city}{property.address.state ? `, ${property.address.state}` : ''}
                        {property.address.zipCode ? ` ${property.address.zipCode}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Unit</p>
                    <p className="font-bold text-slate-900">{tenant.unit}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Occupants</p>
                    <p className="font-bold text-slate-900">{tenant.occupantCount || 1}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Status</p>
                    <p className="font-bold text-slate-900 capitalize text-xs">{tenant.status}</p>
                  </div>
                </div>
                {tenant.moveInDate && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={15} className="text-slate-400 flex-shrink-0" />
                    Moved in{' '}
                    {new Date(tenant.moveInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
            {property?.amenities?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span key={a} className="px-3 py-1 bg-slate-50 text-slate-600 text-xs rounded-full border border-slate-200 capitalize">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Lease period */}
          {tenant.rentType === 'lease' && tenant.leaseDetails?.startDate && (
            <Card>
              <Card.Header>
                <Card.Title>Lease Agreement</Card.Title>
                {tenant.leaseDetails?.leaseType && (
                  <span className="text-sm text-slate-500 capitalize">{tenant.leaseDetails.leaseType.replace('-', ' ')}</span>
                )}
              </Card.Header>
              <LeaseTimeline tenant={tenant} />
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Start Date</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(tenant.leaseDetails.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">End Date</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(tenant.leaseDetails.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Duration</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {tenant.leaseDuration != null ? `${tenant.leaseDuration} months` : '—'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Rent history */}
          {tenant.rentHistory?.length > 0 && <RentHistory history={tenant.rentHistory} />}

          {/* Maintenance shortcut */}
          <Link to="/maintenance" className="block">
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between hover:shadow-md hover:border-primary-200 transition group">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Wrench className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Maintenance Requests</p>
                  <p className="text-sm text-slate-500 mt-0.5">Report an issue or check your request status</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
            </div>
          </Link>

          {/* Payment history */}
          <Card>
            <Card.Header>
              <Card.Title>Payment History</Card.Title>
              <Link to="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View all <ChevronRight size={14} />
              </Link>
            </Card.Header>
            {recentPayments?.length > 0 ? (
              <div className="space-y-2">
                {recentPayments.map((payment) => (
                  <div key={payment._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 capitalize">{payment.paymentMethod?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">+₹{payment.amount?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No payments recorded yet</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          {/* Landlord contact */}
          {owner && (
            <Card>
              <Card.Title>Your Landlord</Card.Title>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-bold text-base">
                      {(owner.firstName?.[0] || '').toUpperCase()}{(owner.lastName?.[0] || '').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{owner.firstName} {owner.lastName}</p>
                    <p className="text-xs text-slate-500">Property Owner</p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  {owner.email && (
                    <a href={`mailto:${owner.email}`} className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-primary-600 transition-colors">
                      <Mail size={15} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </a>
                  )}
                  {owner.phone && (
                    <a href={`tel:${owner.phone}`} className="flex items-center gap-2.5 text-sm text-slate-600 hover:text-primary-600 transition-colors">
                      <Phone size={15} className="text-slate-400 flex-shrink-0" />
                      {owner.phone}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Deposit status */}
          <DepositStatus tenant={tenant} />

          {/* Recent bills */}
          <Card>
            <Card.Header>
              <Card.Title>Recent Bills</Card.Title>
            </Card.Header>
            {recentBills?.length > 0 ? (
              <div className="space-y-1">
                {recentBills.slice(0, 5).map((bill) => {
                  const statusInfo = BILL_STATUS.find((s) => s.value === bill.status);
                  return (
                    <Link key={bill._id} to={`/bills/${bill._id}`}
                          className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 transition">
                      <div>
                        <p className="text-xs font-medium text-slate-800">
                          {MONTHS[(bill.billingPeriod?.month ?? 1) - 1]} {bill.billingPeriod?.year}
                        </p>
                        <p className="text-xs text-slate-500">₹{bill.totalAmount?.toLocaleString()}</p>
                      </div>
                      <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">No bills yet</p>
            )}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <Link to="/bills" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1">
                View all bills <ChevronRight size={12} />
              </Link>
            </div>
          </Card>

          {/* Quick actions */}
          <Card>
            <Card.Title>Quick Actions</Card.Title>
            <nav className="mt-3 space-y-1">
              {[
                { to: '/bills', icon: Receipt, label: 'View all bills' },
                { to: '/payments', icon: CreditCard, label: 'Payment history' },
                { to: '/profile', icon: Users, label: 'My profile' },
                { to: '/dashboard', icon: FileText, label: 'Dashboard' },
              ].map(({ to, icon: Icon, label }) => (
                <Link key={to} to={to}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition text-sm text-slate-700 group">
                  <Icon size={17} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                  {label}
                </Link>
              ))}
            </nav>
          </Card>
        </div>
      </div>
    </div>
  );
}
