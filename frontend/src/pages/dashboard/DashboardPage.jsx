import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Receipt, CreditCard, TrendingUp, AlertTriangle, ArrowRight,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import tenantService from '../../services/tenantService';
import StatsCard from '../../components/ui/StatsCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { ROLES, BILL_STATUS } from '../../config/constants';

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

function TenantDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tenantService.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-slate-500">No tenancy data found.</p>;

  const { tenant, property, recentBills, summary } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={Receipt} label="Pending Bills" value={summary?.pendingBills || 0} color="amber" />
        <StatsCard icon={CreditCard} label="Total Paid" value={`₹${(summary?.totalPaid || 0).toLocaleString()}`} color="emerald" />
        <StatsCard icon={Building2} label="Property" value={property?.name || '—'} color="primary" />
      </div>

      {tenant && (
        <Card>
          <Card.Title>My Details</Card.Title>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div><span className="text-slate-500">Unit:</span> <span className="font-medium text-slate-900">{tenant.unitNumber || '—'}</span></div>
            <div><span className="text-slate-500">Rent:</span> <span className="font-medium text-slate-900">₹{tenant.monthlyRent?.toLocaleString()}/mo</span></div>
            <div><span className="text-slate-500">Rent Type:</span> <span className="font-medium text-slate-900 capitalize">{tenant.rentType}</span></div>
            <div><span className="text-slate-500">Status:</span> <Badge color="emerald">{tenant.status}</Badge></div>
          </div>
        </Card>
      )}

      <Card>
        <Card.Header>
          <Card.Title>Recent Bills</Card.Title>
          <Link to="/bills" className="text-sm text-primary-600 font-medium">View all</Link>
        </Card.Header>
        {recentBills?.length > 0 ? (
          <div className="space-y-2">
            {recentBills.map((bill) => (
              <Link key={bill._id} to={`/bills/${bill._id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                <span className="text-sm text-slate-700">{bill.billingPeriod?.month}/{bill.billingPeriod?.year}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">₹{bill.totalAmount?.toLocaleString()}</span>
                  <Badge color={bill.status === 'paid' ? 'emerald' : 'amber'}>{bill.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">No bills yet</p>
        )}
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  return user?.role === ROLES.TENANT ? <TenantDashboard /> : <OwnerDashboard />;
}
