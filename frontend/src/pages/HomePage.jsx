import { Link } from 'react-router-dom';
import { Home, ArrowRight, Building2, Users, Receipt, Shield } from 'lucide-react';

const features = [
  { icon: Building2, title: 'Property Management', desc: 'Track all your properties, units, and occupancy rates in one place.' },
  { icon: Users, title: 'Tenant Tracking', desc: 'Manage tenant details, leases, rent types, and move-in/out dates.' },
  { icon: Receipt, title: 'Bill Generation', desc: 'Create and send utility bills with automatic charge calculations.' },
  { icon: Shield, title: 'Secure Payments', desc: 'Accept online payments via Razorpay or record manual transactions.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-12 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary-600 flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">TenantTracker By Bhanu Vodinepally</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2">Sign in</Link>
          <Link to="/register" className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-12 py-20 sm:py-32 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          Property management, simplified
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto">
          The smarter way to manage <span className="text-primary-600">rental properties</span>
        </h1>
        <p className="text-lg text-slate-500 mt-6 max-w-xl mx-auto">
          Track tenants, generate bills, collect payments, and stay on top of your rental business — all from one clean dashboard.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link to="/register" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg transition">
            Start free <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium px-6 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-12 py-20 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">Everything you need</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-slate-50 rounded-xl p-6 hover:shadow-md transition">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-8 text-center">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} TenantTracker. Built with care.</p>
      </footer>
    </div>
  );
}
