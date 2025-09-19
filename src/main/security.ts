import { session, BrowserWindow } from 'electron';
import * as path from 'path';

export function setupSecurity(): void {
  // Set up permission handler
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Only allow specific permissions
    const allowedPermissions = [
      'media',
      'geolocation', // For potential future features
    ];

    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Block insecure content
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "font-src 'self' data:; " +
          "img-src 'self' data: blob:; " +
          "connect-src 'self' ws://localhost:*; " +
          "frame-src 'none'; " +
          "object-src 'none';"
        ],
      },
    });
  });

  // Prevent navigation to external websites
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    
    // Allow localhost for development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      callback({});
      return;
    }

    // Allow file:// protocol for local files
    if (url.protocol === 'file:') {
      callback({});
      return;
    }

    // Block everything else
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      console.warn('Blocked external request:', details.url);
      callback({ cancel: true });
      return;
    }

    callback({});
  });
}

export function setupWindowSecurity(window: BrowserWindow): void {
  // Prevent new window creation
  window.webContents.setWindowOpenHandler(({ url }) => {
    console.warn('Blocked window open request:', url);
    return { action: 'deny' };
  });

  // Handle navigation attempts
  window.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    
    // Only allow navigation to localhost in development
    if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      console.warn('Blocked navigation to:', url);
      event.preventDefault();
    }
  });

  // Prevent external resource loading
  window.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    
    // Allow local resources
    if (url.protocol === 'file:' || 
        url.hostname === 'localhost' || 
        url.hostname === '127.0.0.1') {
      callback({});
      return;
    }

    // Block external resources
    console.warn('Blocked external resource:', details.url);
    callback({ cancel: true });
  });
}

export function validateFilePath(filePath: string): boolean {
  try {
    const normalizedPath = path.normalize(filePath);
    
    // Prevent path traversal attacks
    if (normalizedPath.includes('..')) {
      return false;
    }

    // Only allow specific file extensions
    const allowedExtensions = ['.simudino', '.ino', '.cpp', '.h', '.json', '.txt'];
    const extension = path.extname(normalizedPath).toLowerCase();
    
    return allowedExtensions.includes(extension);
  } catch {
    return false;
  }
}

export function sanitizeProjectName(name: string): string {
  // Remove potentially dangerous characters
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 100); // Limit length
}

export function validateSerialPortName(portName: string): boolean {
  // Basic validation for serial port names
  const validPortPatterns = [
    /^COM\d+$/i,           // Windows: COM1, COM2, etc.
    /^\/dev\/tty[A-Za-z0-9]+$/, // Unix/Linux: /dev/ttyUSB0, /dev/ttyACM0, etc.
    /^\/dev\/cu\.[A-Za-z0-9.-]+$/, // macOS: /dev/cu.usbmodem, etc.
  ];

  return validPortPatterns.some(pattern => pattern.test(portName));
}