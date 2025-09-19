import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { ElectroLoomProject } from '../shared/types';

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

const isDevelopment = process.env.NODE_ENV === 'development';

async function createWindow(): Promise<void> {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  });

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
    const project: ElectroLoomProject = JSON.parse(fileContent);
    return { project, filePath: result.filePaths[0] };
  } catch (error) {
    dialog.showErrorBox('Error', getErrorMessage(error));
    return null;
  }
});

ipcMain.handle('project:save', async (_, project: ElectroLoomProject, filePath?: string) => {
  if (!mainWindow) return null;

  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Simudino Project',
      defaultPath: `${project.name}.simudino`,
      filters: [{ name: 'Simudino Projects', extensions: ['simudino'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    targetPath = result.filePath;
  }

  try {
    const projectJson = JSON.stringify(project, null, 2);
    await writeFile(targetPath, projectJson, 'utf-8');
    return { filePath: targetPath };
  } catch (error) {
    dialog.showErrorBox('Error', getErrorMessage(error));
    return { error: getErrorMessage(error) };
  }
});

// Virtual port handlers (placeholder implementations)
ipcMain.handle('virtualPort:create', async () => ({ success: true, portName: 'COM_VIRTUAL' }));
ipcMain.handle('virtualPort:destroy', async () => ({ success: true }));
ipcMain.handle('virtualPort:list', async () => ({ success: true, ports: [] }));

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