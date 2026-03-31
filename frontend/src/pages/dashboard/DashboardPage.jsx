import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Receipt, CreditCard, TrendingUp, AlertTriangle,
  ArrowRight, Banknote, CheckCircle, FileText, Phone, Mail,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import tenantService from '../../services/tenantService';
import StatsCard from '../../components/ui/StatsCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { ROLES, BILL_STATUS, MONTHS } from '../../config/constants';

// ─── Owner Dashboard ─────────────────────────────────────────────────────────

function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getOwnerDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const { overview, financial, recentBills, recentPayments, expiringLeases } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your rental business</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Building2} label="Properties" value={overview.totalProperties} color="primary" subtext={`${overview.occupancyRate}% occupied`} />
        <StatsCard icon={Users} label="Active Tenants" value={overview.activeTenants} color="blue" subtext={`of ${overview.totalTenants} total`} />
        <StatsCard icon={TrendingUp} label="Monthly Revenue" value={`₹${financial.monthlyRevenue.toLocaleString()}`} color="emerald" />
        <StatsCard icon={AlertTriangle} label="Outstanding" value={`₹${financial.totalOutstanding.toLocaleString()}`} color={financial.totalOutstanding > 0 ? 'amber' : 'emerald'} subtext={`${financial.outstandingBills} bills`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <Card.Title>Recent Bills</Card.Title>
            <Link to="/bills" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </Card.Header>
          {recentBills?.length > 0 ? (
            <div className="space-y-3">
              {recentBills.map((bill) => {
                const statusInfo = BILL_STATUS.find((s) => s.value === bill.status);
                return (
                  <Link key={bill._id} to={`/bills/${bill._id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {bill.tenant?.user?.firstName} {bill.tenant?.user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{bill.billingPeriod?.month}/{bill.billingPeriod?.year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">₹{bill.totalAmount?.toLocaleString()}</p>
                      <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No recent bills</p>
          )}
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Recent Payments</Card.Title>
            <Link to="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </Card.Header>
          {recentPayments?.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {payment.tenant?.user?.firstName} {payment.tenant?.user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{payment.method}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">+₹{payment.amount?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No recent payments</p>
          )}
        </Card>
      </div>

      {expiringLeases?.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Expiring Leases</Card.Title>
          </Card.Header>
          <div className="space-y-2">
            {expiringLeases.map((t) => (
              <Link key={t._id} to={`/tenants/${t._id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.user?.firstName} {t.user?.lastName}</p>
                  <p className="text-xs text-slate-500">{t.property?.name}</p>
                </div>
                <Badge color="amber">Expiring soon</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tenant Dashboard ─────────────────────────────────────────────────────────

function TenantDashboard() {
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
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">No active tenancy found</p>
            <p className="text-slate-400 text-sm mt-1">Contact your landlord to get set up in the system.</p>
          </div>
        </Card>
      </div>
    );
  }

  const { tenant, summary, currentBill, recentBills, recentPayments } = data;
  const property = tenant?.property;
  const owner = tenant?.owner;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {property?.name && `${property.name} • `}Unit {tenant?.unit}
          </p>
        </div>
        <Link to="/tenant/portal">
          <Button variant="outline" size="sm">
            <FileText size={16} />
            Lease & Portal
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          icon={Banknote}
          label="Monthly Rent"
          value={`₹${(summary?.monthlyRent || 0).toLocaleString()}`}
          color="primary"
          subtext={summary?.rentType === 'lease' ? 'Lease agreement' : 'Month-to-month'}
        />
        <StatsCard
          icon={AlertTriangle}
          label="Outstanding"
          value={`₹${(summary?.outstanding || 0).toLocaleString()}`}
          color={summary?.outstanding > 0 ? 'amber' : 'emerald'}
          subtext={summary?.outstanding > 0 ? 'Payment due' : 'All clear!'}
        />
        <StatsCard
          icon={CreditCard}
          label="Total Paid"
          value={`₹${(summary?.totalPaid || 0).toLocaleString()}`}
          color="emerald"
        />
      </div>

      {/* Current bill alert */}
      {currentBill && summary?.outstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Receipt className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">Payment Due</p>
              <p className="text-sm text-amber-700">
                ₹{currentBill.remainingBalance?.toLocaleString()} for{' '}
                {MONTHS[currentBill.billingPeriod?.month - 1]} {currentBill.billingPeriod?.year}
              </p>
            </div>
          </div>
          <Link to={`/bills/${currentBill._id}`}>
            <Button variant="warning" size="sm">View Bill</Button>
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent bills */}
        <Card>
          <Card.Header>
            <Card.Title>Recent Bills</Card.Title>
            <Link to="/bills" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </Card.Header>
          {recentBills?.length > 0 ? (
            <div className="space-y-2">
              {recentBills.map((bill) => {
                const statusInfo = BILL_STATUS.find((s) => s.value === bill.status);
                return (
                  <Link key={bill._id} to={`/bills/${bill._id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition">
                    <span className="text-sm text-slate-700">
                      {MONTHS[bill.billingPeriod?.month - 1]} {bill.billingPeriod?.year}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">₹{bill.totalAmount?.toLocaleString()}</span>
                      <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No bills yet</p>
          )}
        </Card>

        {/* Recent payments */}
        <Card>
          <Card.Header>
            <Card.Title>Recent Payments</Card.Title>
            <Link to="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </Card.Header>
          {recentPayments?.length > 0 ? (
            <div className="space-y-2">
              {recentPayments.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {payment.paymentMethod?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">+₹{payment.amount?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No payments yet</p>
          )}
        </Card>
      </div>

      {/* Property & landlord info */}
      {(property || owner) && (
        <Card>
          <Card.Header>
            <Card.Title>Property & Landlord</Card.Title>
            <Link to="/tenant/portal">
              <Button variant="ghost" size="sm">
                Full details <ArrowRight size={14} />
              </Button>
            </Link>
          </Card.Header>
          <div className="grid sm:grid-cols-2 gap-6">
            {property && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your Property</p>
                <p className="text-sm font-medium text-slate-900">{property.name}</p>
                {property.address?.street && (
                  <p className="text-sm text-slate-500">{property.address.street}, {property.address.city}</p>
                )}
                <p className="text-sm text-slate-500 capitalize">{property.propertyType}</p>
              </div>
            )}
            {owner && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your Landlord</p>
                <p className="text-sm font-medium text-slate-900">{owner.firstName} {owner.lastName}</p>
                {owner.email && (
                  <a href={`mailto:${owner.email}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
                    <Mail size={13} /> {owner.email}
                  </a>
                )}
                {owner.phone && (
                  <a href={`tel:${owner.phone}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
                    <Phone size={13} /> {owner.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  return user?.role === ROLES.TENANT ? <TenantDashboard /> : <OwnerDashboard />;
}
