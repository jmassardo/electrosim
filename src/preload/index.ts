import { contextBridge, ipcRenderer } from 'electron';
import { ElectroLoomProject, SerialConfig } from '@shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project management
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    save: (project: ElectroLoomProject, filePath?: string) => 
      ipcRenderer.invoke('project:save', project, filePath),
    export: (project: ElectroLoomProject, format: 'arduino' | 'pdf' | 'image') =>
      ipcRenderer.invoke('project:export', project, format),
  },

  // Virtual serial port
  virtualPort: {
    create: (config: SerialConfig) => 
      ipcRenderer.invoke('virtual-port:create', config),
    destroy: (portName: string) => 
      ipcRenderer.invoke('virtual-port:destroy', portName),
  },

  // Application info
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  },

  // File system operations
  fs: {
    selectFolder: () => ipcRenderer.invoke('fs:select-folder'),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) => 
      ipcRenderer.invoke('fs:write-file', filePath, content),
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      project: {
        open: () => Promise<{ project: ElectroLoomProject; filePath: string } | null>;
        save: (project: ElectroLoomProject, filePath?: string) => Promise<{
          success: boolean;
          filePath?: string;
          error?: string;
        } | null>;
        export: (project: ElectroLoomProject, format: 'arduino' | 'pdf' | 'image') => Promise<{
          success: boolean;
          filePath?: string;
          format?: string;
          error?: string;
        } | null>;
      };
      virtualPort: {
        create: (config: SerialConfig) => Promise<{
          success: boolean;
          portName?: string;
          config?: SerialConfig;
          error?: string;
        }>;
        destroy: (portName: string) => Promise<{
          success: boolean;
          portName?: string;
          error?: string;
        }>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<{
          platform: string;
          arch: string;
          nodeVersion: string;
        }>;
      };
      fs: {
        selectFolder: () => Promise<string | null>;
        readFile: (filePath: string) => Promise<string | null>;
        writeFile: (filePath: string, content: string) => Promise<boolean>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
      };
    };
  }
}