import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';
import OAuthCallbackPage from '../../pages/auth/OAuthCallbackPage';

import { initiateOAuthFlow, handleOAuthCallback, getAvailableProviders } from '../../services/oauthService';

// Mock oauthService
vi.mock('../../services/oauthService', () => ({
  initiateOAuthFlow: vi.fn(),
  handleOAuthCallback: vi.fn(),
  getAvailableProviders: vi.fn(() => []),
}));

vi.mock('../../services/tokenManager', () => ({
  default: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    getToken: vi.fn(() => null),
  },
}));

vi.mock('../../services/authService', () => ({
  default: {
    getProfile: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  },
}));

const createStore = (preloadedState = {}) =>
  configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: { user: null, isAuthenticated: false, loading: false, error: null, ...preloadedState.auth },
      ui: { sidebarOpen: true, mobileSidebarOpen: false, ...preloadedState.ui },
    },
  });

const renderWithProviders = (ui, { store = createStore(), initialEntries = ['/'] } = {}) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </Provider>
  );

describe('SocialLoginButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no providers are configured', () => {
    getAvailableProviders.mockReturnValue([]);

    const { container } = renderWithProviders(<SocialLoginButtons mode="login" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders Google button when Google is configured', () => {
    getAvailableProviders.mockReturnValue(['google']);

    renderWithProviders(<SocialLoginButtons mode="login" />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
  });

  it('renders both Google and GitHub buttons', () => {
    getAvailableProviders.mockReturnValue(['google', 'github']);

    renderWithProviders(<SocialLoginButtons mode="login" />);
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in with github/i)).toBeInTheDocument();
  });

  it('shows "Sign up with" text in register mode', () => {
    getAvailableProviders.mockReturnValue(['google']);

    renderWithProviders(<SocialLoginButtons mode="register" />);
    expect(screen.getByText(/sign up with google/i)).toBeInTheDocument();
  });

  it('calls initiateOAuthFlow on button click', async () => {
    const user = userEvent.setup();
    getAvailableProviders.mockReturnValue(['google']);
    initiateOAuthFlow.mockResolvedValue(undefined);

    renderWithProviders(<SocialLoginButtons mode="login" />);
    await user.click(screen.getByText(/sign in with google/i));
    expect(initiateOAuthFlow).toHaveBeenCalledWith('google');
  });

  it('shows "Or continue with" divider', () => {
    getAvailableProviders.mockReturnValue(['google']);

    renderWithProviders(<SocialLoginButtons mode="login" />);
    expect(screen.getByText(/or continue with/i)).toBeInTheDocument();
  });
});

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while processing', () => {
    handleOAuthCallback.mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
      </Routes>,
      { initialEntries: ['/auth/callback/google?code=test-code&state=test-state'] }
    );

    expect(screen.getByText(/completing sign in/i)).toBeInTheDocument();
  });

  it('shows error when provider returns error', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/auth/callback/google?error=access_denied&error_description=User+denied'] }
    );

    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });

  it('shows error when code or state is missing', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/auth/callback/google'] }
    );

    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
  });

  it('dispatches setUser on successful callback', async () => {
    handleOAuthCallback.mockResolvedValue({
      success: true,
      data: {
        token: 'test-access-token',
        user: { _id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com', role: 'owner' },
      },
      message: 'Login successful',
    });

    // Store state in sessionStorage for validation
    sessionStorage.setItem('oauth_google', JSON.stringify({
      codeVerifier: 'test-verifier',
      state: 'valid-state',
      nonce: 'test-nonce',
      redirectUri: 'http://localhost:5173/auth/callback/google',
    }));

    const store = createStore();

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
      { store, initialEntries: ['/auth/callback/google?code=auth-code&state=valid-state'] }
    );

    await waitFor(() => {
      const state = store.getState().auth;
      expect(state.user).toBeDefined();
      expect(state.isAuthenticated).toBe(true);
    });

    sessionStorage.clear();
  });
});
