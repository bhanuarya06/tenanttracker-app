import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard, Building2, Users, Receipt, CreditCard, Home,
} from 'lucide-react';
import { APP_NAME, ROLES } from '../../config/constants';

const ownerNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/tenants', icon: Users, label: 'Tenants' },
  { to: '/bills', icon: Receipt, label: 'Bills' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
];

const tenantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/bills', icon: Receipt, label: 'My Bills' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
];

export default function Sidebar() {
  const { sidebarOpen } = useSelector((s) => s.ui);
  const { user } = useSelector((s) => s.auth);
  const nav = user?.role === ROLES.TENANT ? tenantNav : ownerNav;

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-slate-900 transition-all duration-300
      ${sidebarOpen ? 'w-64' : 'w-20'}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Home className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-white tracking-tight">{APP_NAME}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200
              ${isActive
                ? 'bg-primary-600/20 text-primary-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } ${!sidebarOpen ? 'justify-center' : ''}`
            }
          >
            <Icon size={20} className="flex-shrink-0" />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="px-4 py-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      )}
    </aside>
  );
}
