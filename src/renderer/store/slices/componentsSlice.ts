import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BaseComponent, ComponentType } from '../../../shared/types';

export interface ComponentsState {
  availableComponents: ComponentType[];
  selectedComponent: BaseComponent | null;
  hoveredComponent: string | null;
  clipboardComponent: BaseComponent | null;
}

const initialState: ComponentsState = {
  availableComponents: [
    'Arduino Uno R3',
    'Arduino Nano',
    'Arduino Mega',
    'LED',
    'Resistor',
    'Button',
    'Potentiometer',
    'Servo Motor',
    'Ultrasonic Sensor',
    'Temperature Sensor',
    'Breadboard',
    'Wire',
  ],
  selectedComponent: null,
  hoveredComponent: null,
  clipboardComponent: null,
};

export const componentsSlice = createSlice({
  name: 'components',
  initialState,
  reducers: {
    selectComponent: (state, action: PayloadAction<BaseComponent | null>) => {
      state.selectedComponent = action.payload;
    },
    setHoveredComponent: (state, action: PayloadAction<string | null>) => {
      state.hoveredComponent = action.payload;
    },
    copyComponent: (state, action: PayloadAction<BaseComponent>) => {
      state.clipboardComponent = action.payload;
    },
    clearClipboard: (state) => {
      state.clipboardComponent = null;
    },
    addAvailableComponent: (state, action: PayloadAction<ComponentType>) => {
      if (!state.availableComponents.includes(action.payload)) {
        state.availableComponents.push(action.payload);
      }
    },
    removeAvailableComponent: (state, action: PayloadAction<ComponentType>) => {
      state.availableComponents = state.availableComponents.filter(
        component => component !== action.payload
      );
    },
  },
});

export const {
  selectComponent,
  setHoveredComponent,
  copyComponent,
  clearClipboard,
  addAvailableComponent,
  removeAvailableComponent,
} = componentsSlice.actions;

export default componentsSlice.reducer;