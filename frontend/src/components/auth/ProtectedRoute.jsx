import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PageLoader } from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useSelector((s) => s.auth);

  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
