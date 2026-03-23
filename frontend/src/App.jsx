import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import useAuth from './hooks/useAuth';

// Public pages
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Properties
import PropertiesPage from './pages/properties/PropertiesPage';
import AddPropertyPage from './pages/properties/AddPropertyPage';
import EditPropertyPage from './pages/properties/EditPropertyPage';
import PropertyDetailPage from './pages/properties/PropertyDetailPage';

// Tenants
import TenantsPage from './pages/tenants/TenantsPage';
import AddTenantPage from './pages/tenants/AddTenantPage';
import TenantProfilePage from './pages/tenants/TenantProfilePage';
import EditTenantPage from './pages/tenants/EditTenantPage';

// Bills
import BillsPage from './pages/bills/BillsPage';
import AddBillPage from './pages/bills/AddBillPage';
import EditBillPage from './pages/bills/EditBillPage';
import BillDetailPage from './pages/bills/BillDetailPage';

// Payments
import PaymentsPage from './pages/payments/PaymentsPage';
import RecordPaymentPage from './pages/payments/RecordPaymentPage';

// User
import ProfilePage from './pages/user/ProfilePage';
import ContactPage from './pages/user/ContactPage';

console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);

function AuthInitializer({ children }) {
  useAuth();
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthInitializer>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', background: '#1e293b', color: '#fff', fontSize: '14px' },
        }}
      />

      <Routes>
        {/* Public routes — redirect to dashboard if already logged in */}
        <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />

        {/* Protected routes — wrapped in AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Properties — owner/admin */}
          <Route path="/properties" element={<ProtectedRoute roles={['owner', 'admin']}><PropertiesPage /></ProtectedRoute>} />
          <Route path="/properties/add" element={<ProtectedRoute roles={['owner', 'admin']}><AddPropertyPage /></ProtectedRoute>} />
          <Route path="/properties/:id" element={<ProtectedRoute roles={['owner', 'admin']}><PropertyDetailPage /></ProtectedRoute>} />
          <Route path="/properties/:id/edit" element={<ProtectedRoute roles={['owner', 'admin']}><EditPropertyPage /></ProtectedRoute>} />

          {/* Tenants — owner/admin */}
          <Route path="/tenants" element={<ProtectedRoute roles={['owner', 'admin']}><TenantsPage /></ProtectedRoute>} />
          <Route path="/tenants/add" element={<ProtectedRoute roles={['owner', 'admin']}><AddTenantPage /></ProtectedRoute>} />
          <Route path="/tenants/:id" element={<ProtectedRoute roles={['owner', 'admin']}><TenantProfilePage /></ProtectedRoute>} />
          <Route path="/tenants/:id/edit" element={<ProtectedRoute roles={['owner', 'admin']}><EditTenantPage /></ProtectedRoute>} />

          {/* Bills — all roles */}
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/bills/add" element={<ProtectedRoute roles={['owner', 'admin']}><AddBillPage /></ProtectedRoute>} />
          <Route path="/bills/:id" element={<BillDetailPage />} />
          <Route path="/bills/:id/edit" element={<ProtectedRoute roles={['owner', 'admin']}><EditBillPage /></ProtectedRoute>} />

          {/* Payments — all roles */}
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/record" element={<ProtectedRoute roles={['owner', 'admin']}><RecordPaymentPage /></ProtectedRoute>} />

          {/* Profile & Contact — all roles */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthInitializer>
  );
}
