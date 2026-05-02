import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { ElectroSimProject } from '../shared/types';
import { createApplicationMenu } from './menu';
import { safePath } from './security';
import {
  validate,
  projectSaveSchema,
  filePathSchema,
  fileContentSchema,
  serialConfigSchema,
  portNameSchema,
  exportFormatSchema,
} from './ipc-validators';

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

const isDevelopment = process.env.NODE_ENV === 'development';

async function createWindow(): Promise<void> {
  // Create the browser window with enhanced configuration
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    center: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    titleBarOverlay: {
      color: '#2f3349',
      symbolColor: '#ffffff'
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: join(__dirname, '../preload/index.js'),
      spellcheck: false,
      devTools: isDevelopment,
    },
    backgroundColor: '#2f3349', // Match app theme
  };

  // Add icon only on Linux to avoid type issues
  if (process.platform === 'linux') {
    windowOptions.icon = join(__dirname, '../../assets/icon.png');
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Development-only CSP: Permissive policy for hot-reload, DevTools, and
  // Monaco Editor web workers during development. Production uses the strict
  // CSP defined in src/main/security.ts.
  if (isDevelopment) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 ws://localhost:3000; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000; " +
            "style-src 'self' 'unsafe-inline' http://localhost:3000; " +
            "img-src 'self' data: http://localhost:3000; " +
            "font-src 'self' data: http://localhost:3000;"
          ]
        }
      });
    });
  }

  // Load the app
  if (isDevelopment) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App ready
app.whenReady().then(async () => {
  // Set up application menu
  Menu.setApplicationMenu(createApplicationMenu());
  
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// IPC Handlers
ipcMain.handle('project:open', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Simudino Project',
    filters: [{ name: 'Simudino Projects', extensions: ['simudino'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    const fileContent = await readFile(result.filePaths[0], 'utf-8');
    const project: ElectroSimProject = JSON.parse(fileContent);
    return { project, filePath: result.filePaths[0] };
  } catch (error) {
    dialog.showErrorBox('Error', getErrorMessage(error));
    return null;
  }
});

ipcMain.handle('project:save', async (_, project: unknown, filePath?: unknown) => {
  if (!mainWindow) return null;

  // Validate project data
  const projectResult = validate<ElectroSimProject>(projectSaveSchema, project);
  if (projectResult.error) {
    return { error: `Invalid project data: ${projectResult.error}` };
  }

  // Validate file path if provided
  let targetPath: string | undefined;
  if (filePath !== undefined && filePath !== null) {
    const pathResult = validate<string>(filePathSchema, filePath);
    if (pathResult.error) {
      return { error: `Invalid file path: ${pathResult.error}` };
    }
    // Check path safety
    const pathCheck = safePath(pathResult.value);
    if (!pathCheck.safe) {
      return { error: `Unsafe file path: ${pathCheck.error}` };
    }
    targetPath = pathCheck.resolved;
  }

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Simudino Project',
      defaultPath: `${projectResult.value.name}.simudino`,
      filters: [{ name: 'Simudino Projects', extensions: ['simudino'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    targetPath = result.filePath;
  }

  try {
    const projectJson = JSON.stringify(projectResult.value, null, 2);
    await writeFile(targetPath, projectJson, 'utf-8');
    return { filePath: targetPath };
  } catch (error) {
    dialog.showErrorBox('Error', getErrorMessage(error));
    return { error: getErrorMessage(error) };
  }
});

ipcMain.handle('project:export', async (_, project: unknown, format: unknown) => {
  if (!mainWindow) return null;

  const projectResult = validate<ElectroSimProject>(projectSaveSchema, project);
  if (projectResult.error) {
    return { success: false, error: `Invalid project data: ${projectResult.error}` };
  }

  const formatResult = validate<string>(exportFormatSchema, format);
  if (formatResult.error) {
    return { success: false, error: `Invalid export format: ${formatResult.error}` };
  }

  // Placeholder export implementation
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Export as ${formatResult.value}`,
    defaultPath: `${projectResult.value.name}.${formatResult.value === 'arduino' ? 'ino' : formatResult.value}`,
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return { success: true, filePath: result.filePath, format: formatResult.value };
});

// Virtual port handlers (kebab-case to match preload channel names)
ipcMain.handle('virtual-port:create', async (_, config: unknown) => {
  const configResult = validate<Record<string, unknown>>(serialConfigSchema, config);
  if (configResult.error) {
    return { success: false, error: `Invalid serial config: ${configResult.error}` };
  }
  return { success: true, portName: 'COM_VIRTUAL', config: configResult.value };
});

ipcMain.handle('virtual-port:destroy', async (_, portName: unknown) => {
  const nameResult = validate<string>(portNameSchema, portName);
  if (nameResult.error) {
    return { success: false, error: `Invalid port name: ${nameResult.error}` };
  }
  return { success: true, portName: nameResult.value };
});

ipcMain.handle('virtual-port:list', async () => {
  return { success: true, ports: [] };
});

// File system handlers
ipcMain.handle('fs:select-folder', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('fs:read-file', async (_, filePath: unknown) => {
  const pathResult = validate<string>(filePathSchema, filePath);
  if (pathResult.error) {
    return null;
  }

  const pathCheck = safePath(pathResult.value);
  if (!pathCheck.safe) {
    console.warn(`Blocked file read outside allowed directories: ${pathCheck.error}`);
    return null;
  }

  try {
    const content = await readFile(pathCheck.resolved, 'utf-8');
    return content;
  } catch {
    return null;
  }
});

ipcMain.handle('fs:write-file', async (_, filePath: unknown, content: unknown) => {
  const pathResult = validate<string>(filePathSchema, filePath);
  if (pathResult.error) {
    return false;
  }

  const contentResult = validate<string>(fileContentSchema, content);
  if (contentResult.error) {
    return false;
  }

  const pathCheck = safePath(pathResult.value);
  if (!pathCheck.safe) {
    console.warn(`Blocked file write outside allowed directories: ${pathCheck.error}`);
    return false;
  }

  try {
    await writeFile(pathCheck.resolved, contentResult.value, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

// Application info handlers
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-platform', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
  };
});

// Window handlers
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);