import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import propertyService from '../../services/propertyService';

export const fetchProperties = createAsyncThunk('properties/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await propertyService.getAll(params);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch properties');
  }
});

export const fetchPropertyById = createAsyncThunk('properties/fetchById', async (id, { rejectWithValue }) => {
  try {
    return await propertyService.getById(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch property');
  }
});

export const createProperty = createAsyncThunk('properties/create', async (data, { rejectWithValue }) => {
  try {
    return await propertyService.create(data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create property');
  }
});

export const updateProperty = createAsyncThunk('properties/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await propertyService.update(id, data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update property');
  }
});

export const deleteProperty = createAsyncThunk('properties/delete', async (id, { rejectWithValue }) => {
  try {
    await propertyService.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete property');
  }
});

const propertySlice = createSlice({
  name: 'properties',
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
      .addCase(fetchProperties.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.properties;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProperties.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchPropertyById.pending, (state) => { state.loading = true; })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload.property;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createProperty.fulfilled, (state, action) => {
        state.items.unshift(action.payload.property);
      })
      .addCase(updateProperty.fulfilled, (state, action) => {
        const updated = action.payload.property;
        state.current = updated;
        const idx = state.items.findIndex((p) => p._id === updated._id);
        if (idx !== -1) state.items[idx] = updated;
      })
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p._id !== action.payload);
        state.current = null;
      });
  },
});

export const { clearCurrent, clearError } = propertySlice.actions;
export default propertySlice.reducer;
