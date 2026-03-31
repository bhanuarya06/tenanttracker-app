import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import authReducer from '../../store/slices/authSlice';
import billReducer from '../../store/slices/billSlice';
import paymentReducer from '../../store/slices/paymentSlice';
import uiReducer from '../../store/slices/uiSlice';
import BillDetailPage from '../../pages/bills/BillDetailPage';

// ─── Store factory ─────────────────────────────────────────────────────────────

const makeOwnerStore = () =>
  configureStore({
    reducer: { auth: authReducer, bills: billReducer, payments: paymentReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        user: { _id: 'owner-1', firstName: 'Rajan', role: 'owner' },
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      bills: { items: [], item: null, pagination: null, loading: false, error: null },
      payments: { items: [], pagination: null, loading: false, error: null },
      ui: { sidebarOpen: true, mobileSidebarOpen: false },
    },
  });

const makeTenantStore = () =>
  configureStore({
    reducer: { auth: authReducer, bills: billReducer, payments: paymentReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        user: { _id: 'tenant-user-1', firstName: 'Priya', role: 'tenant' },
        isAuthenticated: true,
        loading: false,
        error: null,
      },
      bills: { items: [], item: null, pagination: null, loading: false, error: null },
      payments: { items: [], pagination: null, loading: false, error: null },
      ui: { sidebarOpen: true, mobileSidebarOpen: false },
    },
  });

const renderBillDetail = (billId = 'bill-123', store = makeOwnerStore()) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/bills/${billId}`]}>
        <Routes>
          <Route path="/bills/:id" element={<BillDetailPage />} />
          <Route path="/bills" element={<div>Bills List</div>} />
          <Route path="/payments/record" element={<div>Record Payment Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../services/billService', () => ({
  default: {
    getById: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock('../../services/paymentService', () => ({
  default: {
    createOrder: vi.fn(),
    verifyPayment: vi.fn(),
  },
}));

vi.mock('../../services/tokenManager', () => ({
  default: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getToken: vi.fn(() => 'mock-token'),
  },
}));

import billService from '../../services/billService';

// ─── Sample data ───────────────────────────────────────────────────────────────

const mockIssuedBill = {
  bill: {
    _id: 'bill-123',
    status: 'issued',
    totalAmount: 15000,
    paidAmount: 0,
    remainingBalance: 15000,
    billingPeriod: { month: 3, year: 2026 },
    dueDate: '2026-03-05T00:00:00.000Z',
    tenant: {
      _id: 'tenant-1',
      user: { firstName: 'Priya', lastName: 'Kumar', email: 'priya@test.com', phone: '9876543210' },
    },
    property: { _id: 'prop-1', name: 'Sunshine Apartments', address: { street: '12 MG Road', city: 'Bangalore' } },
    charges: {
      rent: 14000,
      utilities: { water: 500, electricity: 500, gas: 0, internet: 0, trash: 0 },
      maintenance: 0, parking: 0, petFee: 0, lateFee: 0, additionalCharges: [],
    },
    previousBalance: 0,
    notes: null,
  },
  payments: [],
};

const mockPartialBill = {
  bill: {
    ...mockIssuedBill.bill,
    _id: 'bill-456',
    status: 'partial',
    paidAmount: 8000,
    remainingBalance: 7000,
  },
  payments: [
    {
      _id: 'pay-1',
      amount: 8000,
      paymentMethod: 'upi',
      paymentDate: '2026-03-10T00:00:00.000Z',
      status: 'completed',
    },
  ],
};

const mockPaidBill = {
  bill: {
    ...mockIssuedBill.bill,
    _id: 'bill-789',
    status: 'paid',
    paidAmount: 15000,
    remainingBalance: 0,
  },
  payments: [
    {
      _id: 'pay-2',
      amount: 15000,
      paymentMethod: 'bank_transfer',
      paymentDate: '2026-03-05T00:00:00.000Z',
      status: 'completed',
    },
  ],
};

// ─── BillDetailPage tests ──────────────────────────────────────────────────────

describe('BillDetailPage — owner view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loader while fetching', () => {
    billService.getById.mockReturnValue(new Promise(() => {}));
    renderBillDetail();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders bill header with period and tenant name', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    await waitFor(() => expect(screen.getByText(/bill — march 2026/i)).toBeInTheDocument());
    expect(screen.getByText(/priya kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/sunshine apartments/i)).toBeInTheDocument();
  });

  it('shows issued status badge', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    await waitFor(() => expect(screen.getByText('Issued')).toBeInTheDocument());
  });

  it('shows charges breakdown with nested utilities flattened', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    await waitFor(() => expect(screen.getByText('Charges Breakdown')).toBeInTheDocument());
    // Utilities nested under charges.utilities are flattened for display
    expect(screen.getByText('Rent')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    // Zero-value fields are hidden
    expect(screen.queryByText('Gas')).not.toBeInTheDocument();
    expect(screen.queryByText('Parking')).not.toBeInTheDocument();
  });

  it('shows "Record Payment" button(s) for issued bill with remaining balance', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    // Two "Record Payment" buttons: one in action bar, one in payments card header
    await waitFor(() => expect(screen.getAllByText('Record Payment').length).toBeGreaterThanOrEqual(1));
    expect(screen.queryByText('Mark Paid')).not.toBeInTheDocument();
  });

  it('"Record Payment" links to /payments/record with bill id', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    await waitFor(() => expect(screen.getAllByText('Record Payment').length).toBeGreaterThanOrEqual(1));
    const links = screen.getAllByText('Record Payment').map((el) => el.closest('a'));
    expect(links.some((a) => a?.getAttribute('href')?.includes('/payments/record?bill=bill-123'))).toBe(true);
  });

  it('does NOT show "Mark Paid" button', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    await waitFor(() => expect(screen.getAllByText('Record Payment').length).toBeGreaterThanOrEqual(1));
    expect(screen.queryByText('Mark Paid')).not.toBeInTheDocument();
  });

  it('shows "Mark Overdue" button for issued bill', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail();

    await waitFor(() => expect(screen.getByText('Mark Overdue')).toBeInTheDocument());
  });

  it('shows partial payment history with paymentMethod field', async () => {
    billService.getById.mockResolvedValue(mockPartialBill);
    renderBillDetail('bill-456');

    await waitFor(() => expect(screen.getByText('Payments (1)')).toBeInTheDocument());
    expect(screen.getByText(/upi/i)).toBeInTheDocument();
    // ₹8,000 appears in paid stat card and payment history
    expect(screen.getAllByText('₹8,000').length).toBeGreaterThan(0);
  });

  it('shows remaining balance correctly for partial bill', async () => {
    billService.getById.mockResolvedValue(mockPartialBill);
    renderBillDetail('bill-456');

    await waitFor(() => expect(screen.getByText('Partial')).toBeInTheDocument());
    expect(screen.getAllByText('₹8,000').length).toBeGreaterThan(0); // paid stat + payment history
    expect(screen.getByText('₹7,000')).toBeInTheDocument(); // remaining
  });

  it('hides Record Payment and Mark Overdue for paid bill', async () => {
    billService.getById.mockResolvedValue(mockPaidBill);
    renderBillDetail('bill-789');

    // "Paid" badge appears in status card; wait for it
    await waitFor(() => expect(screen.getAllByText('Paid').length).toBeGreaterThan(0));
    expect(screen.queryByText('Record Payment')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark Overdue')).not.toBeInTheDocument();
  });

  it('shows payment history with bank_transfer method for paid bill', async () => {
    billService.getById.mockResolvedValue(mockPaidBill);
    renderBillDetail('bill-789');

    await waitFor(() => expect(screen.getByText('Payments (1)')).toBeInTheDocument());
    expect(screen.getByText(/bank transfer/i)).toBeInTheDocument();
  });

  it('hides cancel/edit buttons for paid bill', async () => {
    billService.getById.mockResolvedValue(mockPaidBill);
    renderBillDetail('bill-789');

    await waitFor(() => expect(screen.getAllByText('Paid').length).toBeGreaterThan(0));
    expect(screen.queryByText(/cancel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
  });

  it('shows "Send to Tenant" for draft bill', async () => {
    const draftData = { ...mockIssuedBill, bill: { ...mockIssuedBill.bill, status: 'draft' } };
    billService.getById.mockResolvedValue(draftData);
    renderBillDetail();

    await waitFor(() => expect(screen.getByText('Send to Tenant')).toBeInTheDocument());
    expect(screen.queryByText('Mark Overdue')).not.toBeInTheDocument();
  });
});

describe('BillDetailPage — tenant view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows disabled Pay button for tenant with outstanding balance', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail('bill-123', makeTenantStore());

    await waitFor(() => expect(screen.getByText(/pay ₹15,000/i)).toBeInTheDocument());
    expect(screen.getByText(/pay ₹15,000/i).closest('button')).toBeDisabled();
  });

  it('does NOT show pay button for tenant when bill is fully paid', async () => {
    billService.getById.mockResolvedValue(mockPaidBill);
    renderBillDetail('bill-789', makeTenantStore());

    await waitFor(() => expect(screen.getAllByText('Paid').length).toBeGreaterThan(0));
    expect(screen.queryByText(/pay ₹/i)).not.toBeInTheDocument();
  });

  it('shows "Bill not found" for tenant viewing a draft bill', async () => {
    const draftData = { ...mockIssuedBill, bill: { ...mockIssuedBill.bill, status: 'draft' } };
    billService.getById.mockResolvedValue(draftData);
    renderBillDetail('bill-123', makeTenantStore());

    await waitFor(() => expect(screen.getByText('Bill not found.')).toBeInTheDocument());
  });

  it('does NOT show owner action buttons for tenant user', async () => {
    billService.getById.mockResolvedValue(mockIssuedBill);
    renderBillDetail('bill-123', makeTenantStore());

    await waitFor(() => expect(screen.getByText(/bill — march 2026/i)).toBeInTheDocument());
    expect(screen.queryByText('Send to Tenant')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark Overdue')).not.toBeInTheDocument();
    expect(screen.queryByText('Record Payment')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark Paid')).not.toBeInTheDocument();
  });
});

// ─── BILL_STATUS constants alignment ──────────────────────────────────────────

describe('BILL_STATUS constants', () => {
  it('has issued (not sent) as the post-draft status', async () => {
    const { BILL_STATUS } = await import('../../config/constants');
    expect(BILL_STATUS.find((s) => s.value === 'issued')).toBeTruthy();
    expect(BILL_STATUS.find((s) => s.value === 'sent')).toBeUndefined();
  });

  it('has all expected statuses', async () => {
    const { BILL_STATUS } = await import('../../config/constants');
    const values = BILL_STATUS.map((s) => s.value);
    expect(values).toContain('draft');
    expect(values).toContain('issued');
    expect(values).toContain('partial');
    expect(values).toContain('paid');
    expect(values).toContain('overdue');
    expect(values).toContain('cancelled');
  });
});

// ─── PAYMENT_METHODS constants alignment ──────────────────────────────────────

describe('PAYMENT_METHODS constants', () => {
  it('includes upi matching backend enum', async () => {
    const { PAYMENT_METHODS } = await import('../../config/constants');
    expect(PAYMENT_METHODS.find((m) => m.value === 'upi')).toBeTruthy();
  });

  it('includes all backend payment method enums', async () => {
    const { PAYMENT_METHODS } = await import('../../config/constants');
    const values = PAYMENT_METHODS.map((m) => m.value);
    const backendEnums = ['cash', 'check', 'bank_transfer', 'upi', 'credit_card', 'debit_card', 'online', 'razorpay', 'other'];
    backendEnums.forEach((e) => expect(values).toContain(e));
  });
});
