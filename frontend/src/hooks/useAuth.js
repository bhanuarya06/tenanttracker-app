import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setLoading, logout as logoutAction } from '../store/slices/authSlice';
import authService from '../services/authService';
import tokenManager from '../services/tokenManager';
import toast from 'react-hot-toast';

export default function useAuth() {
  const dispatch = useDispatch();
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

  const login = useCallback(async (credentials) => {
    dispatch(setLoading(true));
    try {
      const data = await authService.login(credentials);
      dispatch(setUser(data.user));
      toast.success('Welcome back!');
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      toast.error(msg);
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
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
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
    const result = await authService.updateProfile(data);
    dispatch(setUser(result.user));
    toast.success('Profile updated');
    return result;
  }, [dispatch]);

  return { user, isAuthenticated, loading, login, register, logout, updateProfile };
}
