import { TestRunner, TestConfig, TestSuiteResult } from '../../../src/cli/TestRunner';
import { AssertionEngine } from '../../../src/cli/AssertionEngine';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('glob');
jest.mock('../../../src/simulation/ide/ArduinoIDE');
jest.mock('../../../src/cli/AssertionEngine');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('TestRunner', () => {
  let testRunner: TestRunner;
  let mockConfig: TestConfig;

  beforeEach(() => {
    testRunner = new TestRunner();
    mockConfig = {
      testPath: '/test/path',
      board: 'uno',
      timeout: 5000,
      reporter: 'console',
      coverage: false,
      watch: false
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create TestRunner instance', () => {
      expect(testRunner).toBeInstanceOf(TestRunner);
    });

    test('should initialize with default configuration', () => {
      expect(testRunner.getDefaultConfig()).toMatchObject({
        testPath: './tests',
        board: 'uno',
        timeout: 30000,
        reporter: 'console',
        coverage: false,
        watch: false
      });
    });
  });

  describe('Configuration Management', () => {
    test('should validate valid configuration', () => {
      const validConfig = {
        testPath: './tests',
        board: 'uno' as const,
        timeout: 5000,
        reporter: 'json' as const,
        coverage: true,
        watch: false
      };

      expect(testRunner.validateConfig(validConfig)).toBe(true);
    });

    test('should reject invalid board types', () => {
      const invalidConfig = {
        ...mockConfig,
        board: 'invalid-board' as any
      };

      expect(() => testRunner.validateConfig(invalidConfig)).toThrow('Invalid board type');
    });

    test('should reject negative timeout values', () => {
      const invalidConfig = {
        ...mockConfig,
        timeout: -1000
      };

      expect(() => testRunner.validateConfig(invalidConfig)).toThrow('Timeout must be positive');
    });

    test('should reject non-existent test paths', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const invalidConfig = {
        ...mockConfig,
        testPath: '/non/existent/path'
      };

      expect(() => testRunner.validateConfig(invalidConfig)).toThrow('Test path does not exist');
    });
  });

  describe('Test Discovery', () => {
    test('should discover test files in directory', async () => {
      const mockTestFiles = [
        '/test/path/blink.test.ino',
        '/test/path/sensor.test.ino',
        '/test/path/subfolder/motor.test.ino'
      ];

      // Mock glob to return test files
      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue(mockTestFiles);

      const discoveredTests = await testRunner.discoverTests(mockConfig.testPath);

      expect(discoveredTests).toHaveLength(3);
      expect(discoveredTests).toContain('/test/path/blink.test.ino');
      expect(discoveredTests).toContain('/test/path/sensor.test.ino');
      expect(discoveredTests).toContain('/test/path/subfolder/motor.test.ino');
    });

    test('should handle empty test directories', async () => {
      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue([]);

      const discoveredTests = await testRunner.discoverTests(mockConfig.testPath);

      expect(discoveredTests).toHaveLength(0);
    });

    test('should filter test files by pattern', async () => {
      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue([
        '/test/path/blink.test.ino',
        '/test/path/main.ino', // Not a test file
        '/test/path/sensor.spec.ino'
      ]);

      const discoveredTests = await testRunner.discoverTests(mockConfig.testPath, '*.test.ino');

      expect(glob.glob).toHaveBeenCalledWith('*.test.ino', expect.objectContaining({
        cwd: mockConfig.testPath
      }));
    });
  });

  describe('Test Execution', () => {
    test('should run single test successfully', async () => {
      const mockTestFile = '/test/path/blink.test.ino';
      const mockTestContent = `
        void setup() {
          pinMode(LED_BUILTIN, OUTPUT);
        }
        void loop() {
          digitalWrite(LED_BUILTIN, HIGH);
          assert(digitalRead(LED_BUILTIN) == HIGH);
        }
      `;

      mockedFs.readFileSync.mockReturnValue(mockTestContent);

      const result = await testRunner.runSingleTest(mockTestFile, mockConfig);

      expect(result.success).toBe(true);
      expect(result.name).toBe('blink.test.ino');
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle test failures', async () => {
      const mockTestFile = '/test/path/failing.test.ino';
      const mockTestContent = `
        void setup() {}
        void loop() {
          assert(1 == 2, "This should fail");
        }
      `;

      mockedFs.readFileSync.mockReturnValue(mockTestContent);

      const result = await testRunner.runSingleTest(mockTestFile, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('This should fail');
    });

    test('should handle test timeouts', async () => {
      const mockTestFile = '/test/path/timeout.test.ino';
      const mockTestContent = `
        void setup() {}
        void loop() {
          delay(10000); // Longer than timeout
        }
      `;

      const shortTimeoutConfig = { ...mockConfig, timeout: 1000 };
      mockedFs.readFileSync.mockReturnValue(mockTestContent);

      const result = await testRunner.runSingleTest(mockTestFile, shortTimeoutConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Test Suite Execution', () => {
    test('should run complete test suite', async () => {
      const mockTestFiles = [
        '/test/path/test1.test.ino',
        '/test/path/test2.test.ino'
      ];

      // Mock test discovery
      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue(mockTestFiles);

      // Mock individual test results
      mockedFs.readFileSync.mockReturnValue('void setup() {} void loop() { assert(true); }');

      const suiteResult = await testRunner.runTestSuite(mockConfig);

      expect(suiteResult.total).toBe(2);
      expect(suiteResult.passed).toBe(2);
      expect(suiteResult.failed).toBe(0);
      expect(suiteResult.success).toBe(true);
    });

    test('should report mixed test results correctly', async () => {
      const mockTestFiles = [
        '/test/path/passing.test.ino',
        '/test/path/failing.test.ino',
        '/test/path/another-passing.test.ino'
      ];

      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue(mockTestFiles);

      // Mock different test outcomes
      mockedFs.readFileSync
        .mockReturnValueOnce('void setup() {} void loop() { assert(true); }') // passing
        .mockReturnValueOnce('void setup() {} void loop() { assert(false); }') // failing  
        .mockReturnValueOnce('void setup() {} void loop() { assert(true); }'); // passing

      const suiteResult = await testRunner.runTestSuite(mockConfig);

      expect(suiteResult.total).toBe(3);
      expect(suiteResult.passed).toBe(2);
      expect(suiteResult.failed).toBe(1);
      expect(suiteResult.success).toBe(false);
      expect(suiteResult.failures).toHaveLength(1);
    });
  });

  describe('Coverage Reporting', () => {
    test('should generate coverage report when enabled', async () => {
      const coverageConfig = { ...mockConfig, coverage: true };

      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue(['/test/path/test.ino']);
      mockedFs.readFileSync.mockReturnValue('void setup() {} void loop() { assert(true); }');

      const result = await testRunner.runTestSuite(coverageConfig);

      expect(result.coverage).toBeDefined();
      expect(result.coverage?.statements).toBeDefined();
      expect(result.coverage?.branches).toBeDefined();
      expect(result.coverage?.functions).toBeDefined();
      expect(result.coverage?.lines).toBeDefined();
    });

    test('should not generate coverage when disabled', async () => {
      const noCoverageConfig = { ...mockConfig, coverage: false };

      const glob = require('glob');
      glob.glob = jest.fn().mockResolvedValue(['/test/path/test.ino']);
      mockedFs.readFileSync.mockReturnValue('void setup() {} void loop() { assert(true); }');

      const result = await testRunner.runTestSuite(noCoverageConfig);

      expect(result.coverage).toBeUndefined();
    });
  });

  describe('Watch Mode', () => {
    test('should setup file watchers in watch mode', async () => {
      const watchConfig = { ...mockConfig, watch: true };

      const mockWatcher = {
        on: jest.fn(),
        close: jest.fn()
      };

      // Mock fs.watch
      const fsWatch = jest.fn().mockReturnValue(mockWatcher);
      (fs as any).watch = fsWatch;

      await testRunner.startWatchMode(watchConfig);

      expect(fsWatch).toHaveBeenCalledWith(watchConfig.testPath, expect.any(Object));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should re-run tests on file changes', async () => {
      const watchConfig = { ...mockConfig, watch: true };
      
      let changeCallback: (eventType: string, filename: string) => void;
      const mockWatcher = {
        on: jest.fn((event, callback) => {
          if (event === 'change') changeCallback = callback;
        }),
        close: jest.fn()
      };

      (fs as any).watch = jest.fn().mockReturnValue(mockWatcher);
      const runTestSuiteSpy = jest.spyOn(testRunner, 'runTestSuite').mockResolvedValue({
        success: true,
        total: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        duration: 100,
        failures: []
      });

      await testRunner.startWatchMode(watchConfig);

      // Simulate file change
      changeCallback!('change', 'test.ino');

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(runTestSuiteSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle compilation errors gracefully', async () => {
      const mockTestFile = '/test/path/syntax-error.test.ino';
      const mockTestContent = `
        void setup() {
          // Missing semicolon
          pinMode(LED_BUILTIN, OUTPUT)
        }
      `;

      mockedFs.readFileSync.mockReturnValue(mockTestContent);

      const result = await testRunner.runSingleTest(mockTestFile, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('compilation');
    });

    test('should handle missing test files', async () => {
      const nonExistentFile = '/test/path/missing.test.ino';
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = await testRunner.runSingleTest(nonExistentFile, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    test('should handle assertion engine failures', async () => {
      const MockedAssertionEngine = AssertionEngine as jest.MockedClass<typeof AssertionEngine>;
      MockedAssertionEngine.prototype.executeTest = jest.fn().mockRejectedValue(
        new Error('Assertion engine internal error')
      );

      const result = await testRunner.runSingleTest('/test/path/test.ino', mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Assertion engine internal error');
    });
  });
});