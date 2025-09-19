import { Menu, MenuItemConstructorOptions, BrowserWindow, app, shell } from 'electron';

export function createApplicationMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:new-project');
            }
          },
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:open-project');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:save-project');
            }
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:save-project-as');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Simulation',
      submenu: [
        {
          label: 'Start/Resume',
          accelerator: 'F5',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:simulation-start');
            }
          },
        },
        {
          label: 'Pause',
          accelerator: 'F6',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:simulation-pause');
            }
          },
        },
        {
          label: 'Stop',
          accelerator: 'Shift+F5',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:simulation-stop');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Reset Arduino',
          accelerator: 'F7',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:simulation-reset');
            }
          },
        },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Virtual Serial Port',
          submenu: [
            {
              label: 'Enable',
              type: 'checkbox',
              click: () => {
                const focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.webContents.send('menu:virtual-port-toggle');
                }
              },
            },
            {
              label: 'Configure...',
              click: () => {
                const focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.webContents.send('menu:virtual-port-config');
                }
              },
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: (_item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ElectroSim',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:about');
            }
          },
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/jmassardo/electrosim/wiki');
          },
        },
        {
          label: 'GitHub Repository',
          click: () => {
            shell.openExternal('https://github.com/jmassardo/electrosim');
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: 'ElectroSim',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  return Menu.buildFromTemplate(template);
}