import '@testing-library/jest-dom';

// Mock Electron APIs for testing
Object.defineProperty(window, 'electronAPI', {
  value: {
    project: {
      create: jest.fn(),
      open: jest.fn(),
      save: jest.fn(),
      saveAs: jest.fn(),
    },
    virtualPort: {
      create: jest.fn(),
      destroy: jest.fn(),
      list: jest.fn(),
    },
    window: {
      minimize: jest.fn(),
      maximize: jest.fn(),
      close: jest.fn(),
    },
  },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = (...args) => {
    if (args[0]?.includes?.('React does not recognize')) return;
    if (args[0]?.includes?.('validateDOMNesting')) return;
    originalWarn(...args);
  };
});

afterEach(() => {
  console.warn = originalWarn;
  jest.clearAllMocks();
});