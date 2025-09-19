import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ElectroLoomProject } from '../../../shared/types';

export interface ProjectState {
  currentProject: ElectroLoomProject | null;
  isModified: boolean;
  lastSaved: string | null;
  autoSave: boolean;
}

const initialState: ProjectState = {
  currentProject: null,
  isModified: false,
  lastSaved: null,
  autoSave: true,
};

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProject: (state, action: PayloadAction<ElectroLoomProject>) => {
      state.currentProject = action.payload;
      state.isModified = false;
      state.lastSaved = new Date().toISOString();
    },
    updateProject: (state, action: PayloadAction<Partial<ElectroLoomProject>>) => {
      if (state.currentProject) {
        state.currentProject = { ...state.currentProject, ...action.payload };
        state.isModified = true;
      }
    },
    markProjectSaved: (state) => {
      state.isModified = false;
      state.lastSaved = new Date().toISOString();
    },
    clearProject: (state) => {
      state.currentProject = null;
      state.isModified = false;
      state.lastSaved = null;
    },
    setAutoSave: (state, action: PayloadAction<boolean>) => {
      state.autoSave = action.payload;
    },
  },
});

export const { 
  setProject, 
  updateProject, 
  markProjectSaved, 
  clearProject, 
  setAutoSave 
} = projectSlice.actions;

export default projectSlice.reducer;