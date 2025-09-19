import { Menu, MenuItemConstructorOptions } from 'electron';

export function createApplicationMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Will be implemented with IPC
          },
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            // Will be implemented with IPC
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            // Will be implemented with IPC
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            // Will be implemented with IPC
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            // Will quit the app
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
            // Will be implemented with IPC
          },
        },
        {
          label: 'Pause',
          accelerator: 'F6',
          click: () => {
            // Will be implemented with IPC
          },
        },
        {
          label: 'Stop',
          accelerator: 'Shift+F5',
          click: () => {
            // Will be implemented with IPC
          },
        },
        { type: 'separator' },
        {
          label: 'Reset Arduino',
          accelerator: 'F7',
          click: () => {
            // Will be implemented with IPC
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
                // Will be implemented with IPC
              },
            },
            {
              label: 'Configure...',
              click: () => {
                // Will be implemented with IPC
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
          label: 'About Simudino',
          click: () => {
            // Will show about dialog
          },
        },
        {
          label: 'Documentation',
          click: () => {
            // Will open documentation
          },
        },
        {
          label: 'GitHub Repository',
          click: () => {
            // Will open GitHub repo
          },
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Simudino',
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