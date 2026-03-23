import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import propertyReducer from './slices/propertySlice';
import tenantReducer from './slices/tenantSlice';
import billReducer from './slices/billSlice';
import paymentReducer from './slices/paymentSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    properties: propertyReducer,
    tenants: tenantReducer,
    bills: billReducer,
    payments: paymentReducer,
  },
  devTools: import.meta.env.DEV,
});

export default store;
