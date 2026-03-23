import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { X, LayoutDashboard, Building2, Users, Receipt, CreditCard, Home } from 'lucide-react';
import { closeMobileSidebar } from '../../store/slices/uiSlice';
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

export default function MobileSidebar() {
  const dispatch = useDispatch();
  const { mobileSidebarOpen } = useSelector((s) => s.ui);
  const { user } = useSelector((s) => s.auth);
  const nav = user?.role === ROLES.TENANT ? tenantNav : ownerNav;

  if (!mobileSidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => dispatch(closeMobileSidebar())} />
      <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 shadow-xl animate-slide-right">
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary-600 flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">{APP_NAME}</span>
          </div>
          <button onClick={() => dispatch(closeMobileSidebar())} className="p-2 rounded-lg text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => dispatch(closeMobileSidebar())}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${isActive ? 'bg-primary-600/20 text-primary-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
