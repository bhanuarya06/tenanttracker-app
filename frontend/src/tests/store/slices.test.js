import { describe, it, expect } from 'vitest';
import store from '../../store';
import { setUser, logout } from '../../store/slices/authSlice';
import { toggleSidebar, toggleMobileSidebar } from '../../store/slices/uiSlice';

describe('authSlice', () => {
  it('sets user on setUser', () => {
    const user = { _id: '1', firstName: 'John', email: 'john@test.com', role: 'owner' };
    store.dispatch(setUser(user));
    const state = store.getState().auth;
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('clears user on logout', () => {
    store.dispatch(setUser({ _id: '1', firstName: 'John' }));
    store.dispatch(logout());
    const state = store.getState().auth;
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('handles null user (unauthenticated)', () => {
    store.dispatch(setUser(null));
    const state = store.getState().auth;
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('uiSlice', () => {
  it('toggles sidebar', () => {
    const before = store.getState().ui.sidebarOpen;
    store.dispatch(toggleSidebar());
    expect(store.getState().ui.sidebarOpen).toBe(!before);
  });

  it('toggles mobile sidebar', () => {
    const before = store.getState().ui.mobileSidebarOpen;
    store.dispatch(toggleMobileSidebar());
    expect(store.getState().ui.mobileSidebarOpen).toBe(!before);
  });
});
