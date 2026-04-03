import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser, setLoading, logout as logoutAction } from '../store/slices/authSlice';
import authService from '../services/authService';
import tokenManager from '../services/tokenManager';
import { getErrorMessage } from '../utils/errorMessages';
import toast from 'react-hot-toast';

export default function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useSelector((s) => s.auth);
  const initRef = useRef(false);

  // Check auth on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const data = await authService.getProfile();
        dispatch(setUser(data.user));
      } catch {
        dispatch(setUser(null));
        tokenManager.clearToken();
      }
    };
    init();
  }, [dispatch]);

  // Handle session expiry triggered by apiClient when token refresh fails
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(logoutAction());
      toast.error('Your session has expired. Please sign in again.');
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [dispatch, navigate]);

  const login = useCallback(async (credentials) => {
    dispatch(setLoading(true));
    try {
      const data = await authService.login(credentials);
      dispatch(setUser(data.user));
      toast.success('Welcome back!');
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid email or password. Please try again.'));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const register = useCallback(async (userData) => {
    dispatch(setLoading(true));
    try {
      const data = await authService.register(userData);
      dispatch(setUser(data.user));
      toast.success('Account created!');
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed. Please try again.'));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      dispatch(logoutAction());
      toast.success('Logged out');
    }
  }, [dispatch]);

  const updateProfile = useCallback(async (data) => {
    try {
      const result = await authService.updateProfile(data);
      dispatch(setUser(result.user));
      toast.success('Profile updated');
      return result;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update profile. Please try again.'));
      throw err;
    }
  }, [dispatch]);

  return { user, isAuthenticated, loading, login, register, logout, updateProfile };
}
