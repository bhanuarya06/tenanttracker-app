import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import LoginPage from '../../pages/auth/LoginPage';

const createStore = (preloadedState = {}) =>
  configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: { user: null, isAuthenticated: false, loading: false, ...preloadedState.auth },
      ui: { sidebarOpen: true, mobileSidebarOpen: false, ...preloadedState.ui },
    },
  });

const renderWithProviders = (ui, { store = createStore() } = {}) =>
  render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );

// Mock the auth service  
vi.mock('../../services/authService', () => ({
  default: {
    login: vi.fn(),
    getProfile: vi.fn(),
  },
}));

vi.mock('../../services/tokenManager', () => ({
  default: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getToken: vi.fn(() => null),
  },
}));

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
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
