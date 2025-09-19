import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SimulationStatus } from '../../../shared/types';

export interface SimulationSliceState {
  status: SimulationStatus;
  isRunning: boolean;
  speed: number; // Simulation speed multiplier (0.1x to 10x)
  stepMode: boolean;
  currentStep: number;
  breakpoints: number[];
  variables: Record<string, any>;
  serialOutput: string[];
  error: string | null;
}

const initialState: SimulationSliceState = {
  status: 'stopped',
  isRunning: false,
  speed: 1.0,
  stepMode: false,
  currentStep: 0,
  breakpoints: [],
  variables: {},
  serialOutput: [],
  error: null,
};

export const simulationSlice = createSlice({
  name: 'simulation',
  initialState,
  reducers: {
    startSimulation: (state) => {
      state.status = 'running';
      state.isRunning = true;
      state.error = null;
    },
    stopSimulation: (state) => {
      state.status = 'stopped';
      state.isRunning = false;
      state.currentStep = 0;
    },
    pauseSimulation: (state) => {
      state.status = 'paused';
      state.isRunning = false;
    },
    resumeSimulation: (state) => {
      state.status = 'running';
      state.isRunning = true;
    },
    setSimulationSpeed: (state, action: PayloadAction<number>) => {
      state.speed = Math.max(0.1, Math.min(10, action.payload));
    },
    toggleStepMode: (state) => {
      state.stepMode = !state.stepMode;
    },
    stepForward: (state) => {
      if (state.stepMode) {
        state.currentStep += 1;
      }
    },
    addBreakpoint: (state, action: PayloadAction<number>) => {
      if (!state.breakpoints.includes(action.payload)) {
        state.breakpoints.push(action.payload);
      }
    },
    removeBreakpoint: (state, action: PayloadAction<number>) => {
      state.breakpoints = state.breakpoints.filter(bp => bp !== action.payload);
    },
    clearBreakpoints: (state) => {
      state.breakpoints = [];
    },
    updateVariables: (state, action: PayloadAction<Record<string, any>>) => {
      state.variables = { ...state.variables, ...action.payload };
    },
    addSerialOutput: (state, action: PayloadAction<string>) => {
      state.serialOutput.push(action.payload);
      // Keep only last 1000 lines
      if (state.serialOutput.length > 1000) {
        state.serialOutput = state.serialOutput.slice(-1000);
      }
    },
    clearSerialOutput: (state) => {
      state.serialOutput = [];
    },
    setSimulationError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'error';
        state.isRunning = false;
      }
    },
  },
});

export const {
  startSimulation,
  stopSimulation,
  pauseSimulation,
  resumeSimulation,
  setSimulationSpeed,
  toggleStepMode,
  stepForward,
  addBreakpoint,
  removeBreakpoint,
  clearBreakpoints,
  updateVariables,
  addSerialOutput,
  clearSerialOutput,
  setSimulationError,
} = simulationSlice.actions;

export default simulationSlice.reducer;