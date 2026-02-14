// Force React into development mode
process.env.NODE_ENV = 'test';

// Mock environment variables that might affect React builds
delete process.env.NODE_ENV;
process.env.NODE_ENV = 'test';