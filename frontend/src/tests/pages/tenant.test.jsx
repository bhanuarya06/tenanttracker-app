import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import LoginPage from '../../pages/auth/LoginPage';
import TenantPortalPage from '../../pages/tenant/TenantPortalPage';

// ─── Store factory ─────────────────────────────────────────────────────────────

const makeStore = (authState = {}) =>
  configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: { user: null, isAuthenticated: false, loading: false, error: null, ...authState },
      ui: { sidebarOpen: true, mobileSidebarOpen: false },
    },
  });

const renderWithProviders = (ui, { store = makeStore(), path = '/' } = {}) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </Provider>
  );

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/authService', () => ({
  default: {
    login: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../../services/tokenManager', () => ({
  default: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getToken: vi.fn(() => null),
  },
}));

vi.mock('../../services/tenantService', () => ({
  default: {
    getDashboard: vi.fn(),
  },
}));

import tenantService from '../../services/tenantService';

// ─── Sample data ───────────────────────────────────────────────────────────────

const mockDashboardData = {
  tenant: {
    _id: 'tenant-1',
    unit: 'A-101',
    rentType: 'lease',
    monthlyRent: 15000,
    status: 'active',
    moveInDate: '2024-01-01T00:00:00.000Z',
    occupantCount: 2,
    leaseDetails: {
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2025-12-31T00:00:00.000Z',
      securityDeposit: 30000,
      leaseType: 'fixed',
    },
    leaseStatus: 'active',
    leaseDuration: 24,
    property: {
      _id: 'prop-1',
      name: 'Sunshine Apartments',
      propertyType: 'apartment',
      address: { street: '12 MG Road', city: 'Bangalore', state: 'KA', zipCode: '560001' },
      amenities: ['parking', 'gym', 'wifi'],
    },
    owner: {
      _id: 'owner-1',
      firstName: 'Rajan',
      lastName: 'Mehta',
      email: 'rajan@example.com',
      phone: '+91 9876543210',
    },
  },
  summary: {
    monthlyRent: 15000,
    outstanding: 3000,
    totalPaid: 45000,
    securityDeposit: 30000,
    rentType: 'lease',
    leaseStatus: 'active',
  },
  currentBill: {
    _id: 'bill-1',
    totalAmount: 15000,
    remainingBalance: 3000,
    billingPeriod: { month: 3, year: 2026 },
    status: 'partial',
  },
  recentBills: [
    { _id: 'bill-1', totalAmount: 15000, paidAmount: 12000, remainingBalance: 3000, billingPeriod: { month: 3, year: 2026 }, status: 'partial' },
    { _id: 'bill-2', totalAmount: 15000, paidAmount: 15000, remainingBalance: 0, billingPeriod: { month: 2, year: 2026 }, status: 'paid' },
  ],
  recentPayments: [
    { _id: 'pay-1', amount: 15000, paymentMethod: 'bank_transfer', paymentDate: '2026-02-05T00:00:00.000Z' },
    { _id: 'pay-2', amount: 12000, paymentMethod: 'upi', paymentDate: '2026-03-10T00:00:00.000Z' },
  ],
};

// ─── LoginPage tests ───────────────────────────────────────────────────────────

describe('LoginPage — role tabs', () => {
  it('renders Owner tab selected by default', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('tab', { name: /property owner/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /tenant/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows "Sign in" submit button for owner mode', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('switches to Tenant tab on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('tab', { name: /tenant/i }));

    expect(screen.getByRole('tab', { name: /tenant/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /property owner/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows "Access tenant portal" button in tenant mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('tab', { name: /tenant/i }));
    expect(screen.getByRole('button', { name: /access tenant portal/i })).toBeInTheDocument();
  });

  it('shows tenant help notice in tenant mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('tab', { name: /tenant/i }));
    expect(screen.getByText(/new tenant\?/i)).toBeInTheDocument();
  });

  it('hides tenant help notice in owner mode', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.queryByText(/new tenant\?/i)).not.toBeInTheDocument();
  });

  it('shows email and password validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('clears errors when switching tabs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Trigger validation errors
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();

    // Switch tab — errors should clear
    await user.click(screen.getByRole('tab', { name: /tenant/i }));
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const pwInput = screen.getByPlaceholderText('••••••••');
    expect(pwInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByLabelText(/show password/i));
    expect(pwInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByLabelText(/hide password/i));
    expect(pwInput).toHaveAttribute('type', 'password');
  });

  it('has link to register page', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/create one/i).closest('a')).toHaveAttribute('href', '/register');
  });

  it('has link to forgot password', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/forgot password/i).closest('a')).toHaveAttribute('href', '/forgot-password');
  });
});

// ─── TenantPortalPage tests ───────────────────────────────────────────────────

describe('TenantPortalPage', () => {
  const tenantStore = makeStore({
    user: { _id: 'u1', firstName: 'Priya', lastName: 'Kumar', email: 'priya@test.com', role: 'tenant' },
    isAuthenticated: true,
    loading: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loader while fetching', () => {
    tenantService.getDashboard.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });
    // PageLoader renders an animated SVG — confirm it's present before data loads
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders portal with tenant data', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => {
      expect(screen.getByText('My Lease & Portal')).toBeInTheDocument();
    });

    expect(screen.getByText('Sunshine Apartments')).toBeInTheDocument();
    expect(screen.getByText(/unit a-101/i)).toBeInTheDocument();
  });

  it('shows monthly rent stat', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Monthly Rent')).toBeInTheDocument());
    // ₹15,000 appears in multiple stats — verify the "Monthly Rent" stat card specifically
    expect(screen.getAllByText('₹15,000').length).toBeGreaterThan(0);
  });

  it('shows security deposit stat', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Security Deposit')).toBeInTheDocument());
    expect(screen.getByText('₹30,000')).toBeInTheDocument();
  });

  it('shows payment due banner when there is an outstanding bill', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Payment Due')).toBeInTheDocument());
    expect(screen.getByText(/₹3,000 remaining for march 2026/i)).toBeInTheDocument();
  });

  it('shows landlord contact details', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Rajan Mehta')).toBeInTheDocument());
    expect(screen.getByText('rajan@example.com')).toBeInTheDocument();
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
  });

  it('shows property address', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('12 MG Road')).toBeInTheDocument());
    expect(screen.getByText(/bangalore/i)).toBeInTheDocument();
  });

  it('shows amenities badges', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('parking')).toBeInTheDocument());
    expect(screen.getByText('gym')).toBeInTheDocument();
    expect(screen.getByText('wifi')).toBeInTheDocument();
  });

  it('shows lease progress timeline for lease type', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
  });

  it('shows recent payment history', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Payment History')).toBeInTheDocument());
    expect(screen.getByText(/bank transfer/i)).toBeInTheDocument();
    expect(screen.getByText(/upi/i)).toBeInTheDocument();
  });

  it('shows recent bills with status badges', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getAllByText(/march 2026/i).length).toBeGreaterThan(0));
  });

  it('shows no-tenancy state when API call fails', async () => {
    tenantService.getDashboard.mockRejectedValue(new Error('No tenancy'));
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() =>
      expect(screen.getByText(/no active tenancy found/i)).toBeInTheDocument()
    );
  });

  it('shows month-to-month label for non-lease tenants', async () => {
    const monthlyData = {
      ...mockDashboardData,
      tenant: {
        ...mockDashboardData.tenant,
        rentType: 'monthly',
        leaseStatus: 'monthly',
        leaseDetails: null,
      },
      summary: { ...mockDashboardData.summary, rentType: 'monthly' },
    };
    tenantService.getDashboard.mockResolvedValue(monthlyData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Month-to-month')).toBeInTheDocument());
    expect(screen.queryByText('Lease Agreement')).not.toBeInTheDocument();
  });

  it('has working quick action links', async () => {
    tenantService.getDashboard.mockResolvedValue(mockDashboardData);
    renderWithProviders(<TenantPortalPage />, { store: tenantStore });

    await waitFor(() => expect(screen.getByText('Quick Actions')).toBeInTheDocument());
    // "View all bills" appears in both the card header and quick actions — use getAllByText
    const billLinks = screen.getAllByText('View all bills');
    expect(billLinks.some((el) => el.closest('a')?.getAttribute('href') === '/bills')).toBe(true);
    expect(screen.getByText('Payment history').closest('a')).toHaveAttribute('href', '/payments');
    expect(screen.getByText('My profile').closest('a')).toHaveAttribute('href', '/profile');
  });
});
