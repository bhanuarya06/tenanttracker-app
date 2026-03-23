import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-500 mb-8">Sorry, we couldn&apos;t find what you&apos;re looking for.</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition">
          <Home size={18} /> Go home
        </Link>
      </div>
    </div>
  );
}
