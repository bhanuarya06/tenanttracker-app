import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import billService from '../../services/billService';

export const fetchBills = createAsyncThunk('bills/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await billService.getAll(params);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch bills');
  }
});

export const fetchBillById = createAsyncThunk('bills/fetchById', async (id, { rejectWithValue }) => {
  try {
    return await billService.getById(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch bill');
  }
});

export const createBill = createAsyncThunk('bills/create', async (data, { rejectWithValue }) => {
  try {
    return await billService.create(data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create bill');
  }
});

export const updateBill = createAsyncThunk('bills/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await billService.update(id, data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update bill');
  }
});

export const deleteBill = createAsyncThunk('bills/delete', async (id, { rejectWithValue }) => {
  try {
    await billService.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete bill');
  }
});

const billSlice = createSlice({
  name: 'bills',
  initialState: {
    items: [],
    current: null,
    payments: [],
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent(state) { state.current = null; state.payments = []; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBills.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.bills;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBills.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchBillById.pending, (state) => { state.loading = true; })
      .addCase(fetchBillById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.bill;
        state.payments = action.payload.payments || [];
      })
      .addCase(fetchBillById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createBill.fulfilled, (state, action) => {
        state.items.unshift(action.payload.bill);
      })
      .addCase(updateBill.fulfilled, (state, action) => {
        const updated = action.payload.bill;
        state.current = updated;
        const idx = state.items.findIndex((b) => b._id === updated._id);
        if (idx !== -1) state.items[idx] = updated;
      })
      .addCase(deleteBill.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b._id !== action.payload);
        state.current = null;
      });
  },
});

export const { clearCurrent, clearError } = billSlice.actions;
export default billSlice.reducer;
