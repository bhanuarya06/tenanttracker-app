import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import tenantService from '../../services/tenantService';

export const fetchTenants = createAsyncThunk('tenants/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await tenantService.getAll(params);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch tenants');
  }
});

export const fetchTenantById = createAsyncThunk('tenants/fetchById', async (id, { rejectWithValue }) => {
  try {
    return await tenantService.getById(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch tenant');
  }
});

export const createTenant = createAsyncThunk('tenants/create', async (data, { rejectWithValue }) => {
  try {
    return await tenantService.create(data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create tenant');
  }
});

export const updateTenant = createAsyncThunk('tenants/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await tenantService.update(id, data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update tenant');
  }
});

export const deleteTenant = createAsyncThunk('tenants/delete', async (id, { rejectWithValue }) => {
  try {
    await tenantService.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete tenant');
  }
});

const tenantSlice = createSlice({
  name: 'tenants',
  initialState: {
    items: [],
    current: null,
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent(state) { state.current = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenants.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.tenants;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTenants.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchTenantById.pending, (state) => { state.loading = true; })
      .addCase(fetchTenantById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.tenant;
      })
      .addCase(fetchTenantById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createTenant.fulfilled, (state, action) => {
        state.items.unshift(action.payload.tenant);
      })
      .addCase(updateTenant.fulfilled, (state, action) => {
        const updated = action.payload.tenant;
        state.current = updated;
        const idx = state.items.findIndex((t) => t._id === updated._id);
        if (idx !== -1) state.items[idx] = updated;
      })
      .addCase(deleteTenant.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
        state.current = null;
      });
  },
});

export const { clearCurrent, clearError } = tenantSlice.actions;
export default tenantSlice.reducer;
