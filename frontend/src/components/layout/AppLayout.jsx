import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';

export default function AppLayout() {
  const { sidebarOpen } = useSelector((s) => s.ui);

  return (
    <div className="min-h-screen bg-slate-50">
      <MobileSidebar />
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
