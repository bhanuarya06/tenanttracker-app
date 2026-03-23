import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PageLoader } from '../ui/LoadingSpinner';

export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((s) => s.auth);

  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return children;
}
