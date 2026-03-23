import { useDispatch, useSelector } from 'react-redux';
import { Menu, Bell, LogOut, User, MessageSquare } from 'lucide-react';
import { toggleSidebar, toggleMobileSidebar } from '../../store/slices/uiSlice';
import useAuth from '../../hooks/useAuth';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleMobileSidebar())}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden lg:block p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition relative">
            <Bell size={20} />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 animate-slide-down">
                <Link to="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <User size={16} /> Profile
                </Link>
                <Link to="/contact" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <MessageSquare size={16} /> Contact
                </Link>
                <hr className="my-1 border-slate-100" />
                <button onClick={logout}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 w-full">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
