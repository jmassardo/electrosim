import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './slices/projectSlice';
import simulationReducer from './slices/simulationSlice';
import componentsReducer from './slices/componentsSlice';

export const store = configureStore({
  reducer: {
    project: projectReducer,
    simulation: simulationReducer,
    components: componentsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;