import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import paymentService from '../../services/paymentService';

export const fetchPayments = createAsyncThunk('payments/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await paymentService.getAll(params);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payments');
  }
});

export const createPayment = createAsyncThunk('payments/create', async (data, { rejectWithValue }) => {
  try {
    return await paymentService.create(data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to record payment');
  }
});

const paymentSlice = createSlice({
  name: 'payments',
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
      .addCase(fetchPayments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.payments;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { clearCurrent, clearError } = paymentSlice.actions;
export default paymentSlice.reducer;
