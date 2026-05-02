import { app, session, BrowserWindow } from 'electron';
import * as path from 'path';

/**
 * Production Content Security Policy.
 *
 * - 'unsafe-eval' is kept in script-src ONLY because Monaco Editor's language
 *   services use `new Function()` for web workers. This is a known tradeoff.
 * - 'unsafe-inline' is kept in style-src ONLY because MUI injects inline styles.
 * - 'unsafe-inline' is NOT present in script-src or default-src (critical security gain).
 * - worker-src allows blob: for Monaco Editor web workers.
 */
const PRODUCTION_CSP = [
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; " +
  "img-src 'self' data: blob:; " +
  "connect-src 'self' ws://localhost:*; " +
  "worker-src 'self' blob:; " +
  "frame-src 'none'; " +
  "object-src 'none';",
];

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

  // Apply production CSP via response headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': PRODUCTION_CSP,
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

/**
 * Returns the list of directories that file operations are allowed to access.
 * Uses lazy evaluation since `app.getPath()` is not available before app ready.
 */
function getAllowedDirectories(): string[] {
  return [
    app.getPath('userData'),    // App data directory
    app.getPath('documents'),   // User documents
    app.getPath('temp'),        // Temp directory
    app.getPath('home'),        // Home directory (for project files)
  ];
}

/**
 * Validates and resolves a file path, ensuring it is within allowed directories
 * and does not contain path injection attempts.
 *
 * @param filePath - The raw file path to validate
 * @param allowedDirs - Optional override for allowed base directories
 * @returns Object with safety status, resolved path, and optional error message
 */
export function safePath(
  filePath: string,
  allowedDirs?: string[],
): { safe: boolean; resolved: string; error?: string } {
  try {
    const resolved = path.resolve(filePath);

    // Check for null bytes (path injection)
    if (resolved.includes('\0')) {
      return { safe: false, resolved, error: 'Path contains null bytes' };
    }

    // Check for path traversal after resolution
    const normalized = path.normalize(resolved);
    if (normalized !== resolved) {
      return { safe: false, resolved, error: 'Path contains suspicious segments' };
    }

    // Check against allowed directories
    const dirs = allowedDirs || getAllowedDirectories();
    const isAllowed = dirs.some((dir) => resolved.startsWith(dir + path.sep) || resolved === dir);

    if (!isAllowed) {
      return { safe: false, resolved, error: 'Path is outside allowed directories' };
    }

    return { safe: true, resolved };
  } catch {
    return { safe: false, resolved: filePath, error: 'Invalid path' };
  }
}