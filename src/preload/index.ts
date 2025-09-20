import { contextBridge, ipcRenderer } from 'electron';
import { ElectroSimProject, SerialConfig } from '@shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project management
  project: {
    open: () => ipcRenderer.invoke('project:open'),
    save: (project: ElectroSimProject, filePath?: string) => 
      ipcRenderer.invoke('project:save', project, filePath),
    export: (project: ElectroSimProject, format: 'arduino' | 'pdf' | 'image') =>
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

  // Menu event listeners
  menu: {
    onNewProject: (callback: () => void) => ipcRenderer.on('menu:new-project', callback),
    onOpenProject: (callback: () => void) => ipcRenderer.on('menu:open-project', callback),
    onSaveProject: (callback: () => void) => ipcRenderer.on('menu:save-project', callback),
    onSaveProjectAs: (callback: () => void) => ipcRenderer.on('menu:save-project-as', callback),
    onSimulationStart: (callback: () => void) => ipcRenderer.on('menu:simulation-start', callback),
    onSimulationPause: (callback: () => void) => ipcRenderer.on('menu:simulation-pause', callback),
    onSimulationStop: (callback: () => void) => ipcRenderer.on('menu:simulation-stop', callback),
    onSimulationReset: (callback: () => void) => ipcRenderer.on('menu:simulation-reset', callback),
    onAbout: (callback: () => void) => ipcRenderer.on('menu:about', callback),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('menu:new-project');
      ipcRenderer.removeAllListeners('menu:open-project');
      ipcRenderer.removeAllListeners('menu:save-project');
      ipcRenderer.removeAllListeners('menu:save-project-as');
      ipcRenderer.removeAllListeners('menu:simulation-start');
      ipcRenderer.removeAllListeners('menu:simulation-pause');
      ipcRenderer.removeAllListeners('menu:simulation-stop');
      ipcRenderer.removeAllListeners('menu:simulation-reset');
      ipcRenderer.removeAllListeners('menu:about');
    },
  },
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      project: {
        open: () => Promise<{ project: ElectroSimProject; filePath: string } | null>;
        save: (project: ElectroSimProject, filePath?: string) => Promise<{
          success: boolean;
          filePath?: string;
          error?: string;
        } | null>;
        export: (project: ElectroSimProject, format: 'arduino' | 'pdf' | 'image') => Promise<{
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
      menu: {
        onNewProject: (callback: () => void) => void;
        onOpenProject: (callback: () => void) => void;
        onSaveProject: (callback: () => void) => void;
        onSaveProjectAs: (callback: () => void) => void;
        onSimulationStart: (callback: () => void) => void;
        onSimulationPause: (callback: () => void) => void;
        onSimulationStop: (callback: () => void) => void;
        onSimulationReset: (callback: () => void) => void;
        onAbout: (callback: () => void) => void;
        removeAllListeners: () => void;
      };
    };
  }
}