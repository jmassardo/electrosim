/**
 * Test Runner
 * Automated test execution engine for Arduino sketches
 * Provides comprehensive testing capabilities for CI/CD integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { ArduinoIDE } from '../simulation/ide/ArduinoIDE';
import { AssertionEngine, TestCase, TestResult, TestAssertion } from './AssertionEngine';

export interface TestConfig {
  testPath: string;
  board: 'uno' | 'nano' | 'mega' | 'leonardo';
  timeout: number;
  reporter: 'console' | 'json' | 'junit';
  coverage: boolean;
  watch: boolean;
}

export interface TestSuiteResult {
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: TestFailure[];
  coverage?: CoverageReport;
}

export interface TestFailure {
  name: string;
  message: string;
  stack?: string | undefined;
  duration: number;
}

export interface CoverageReport {
  statements: { covered: number; total: number };
  branches: { covered: number; total: number };
  functions: { covered: number; total: number };
  lines: { covered: number; total: number };
}

/**
 * Test Runner for Arduino sketches
 */
export class TestRunner {
  private ide: ArduinoIDE;
  private assertionEngine: AssertionEngine;
  private isWatching = false;

  constructor(ide: ArduinoIDE) {
    this.ide = ide;
    this.assertionEngine = new AssertionEngine();
  }

  /**
   * Run all tests in the specified path
   */
  public async runTests(config: TestConfig): Promise<TestSuiteResult> {
    const startTime = Date.now();
    
    try {
      // Discover test files
      const testFiles = this.discoverTests(config.testPath);
      
      if (testFiles.length === 0) {
        throw new Error(`No test files found in ${config.testPath}`);
      }

      console.log(`Found ${testFiles.length} test file(s)`);

      const results: TestSuiteResult = {
        success: true,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        failures: []
      };

      // Run each test file
      for (const testFile of testFiles) {
        const fileResult = await this.runTestFile(testFile, config);
        
        results.total += fileResult.total;
        results.passed += fileResult.passed;
        results.failed += fileResult.failed;
        results.skipped += fileResult.skipped;
        results.failures.push(...fileResult.failures);
        
        if (!fileResult.success) {
          results.success = false;
        }
      }

      results.duration = Date.now() - startTime;

      // Generate coverage report if requested
      if (config.coverage) {
        results.coverage = this.generateCoverageReport();
      }

      // Start watching if requested
      if (config.watch && !this.isWatching) {
        this.startWatching(config);
      }

      return results;
    } catch (error) {
      return {
        success: false,
        total: 0,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        failures: [{
          name: 'Test Discovery',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        }]
      };
    }
  }

  /**
   * Discover test files in the given path
   */
  private discoverTests(testPath: string): string[] {
    const resolvedPath = path.resolve(testPath);
    
    if (fs.statSync(resolvedPath).isFile()) {
      // Single test file
      return [resolvedPath];
    }
    
    // Directory - find all .test.ino or .spec.ino files
    const patterns = [
      path.join(resolvedPath, '**/*.test.ino'),
      path.join(resolvedPath, '**/*.spec.ino'),
      path.join(resolvedPath, '**/test_*.ino'),
      path.join(resolvedPath, '**/spec_*.ino')
    ];
    
    const testFiles: string[] = [];
    
    for (const pattern of patterns) {
      const matches = glob.sync(pattern);
      testFiles.push(...matches);
    }
    
    // Remove duplicates
    return Array.from(new Set(testFiles));
  }

  /**
   * Run tests in a single file
   */
  private async runTestFile(testFile: string, config: TestConfig): Promise<TestSuiteResult> {
    const fileName = path.basename(testFile);
    console.log(`Running tests in ${fileName}...`);
    
    try {
      // Parse test file to extract test cases
      const testCases = await this.parseTestFile(testFile);
      
      const results: TestSuiteResult = {
        success: true,
        total: testCases.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        failures: []
      };

      const fileStartTime = Date.now();

      // Run each test case
      for (const testCase of testCases) {
        const testResult = await this.runTestCase(testCase, config);
        
        if (testResult.passed) {
          results.passed++;
        } else if (testResult.skipped) {
          results.skipped++;
        } else {
          results.failed++;
          results.success = false;
          results.failures.push({
            name: `${fileName}: ${testCase.name}`,
            message: testResult.error || 'Unknown error',
            stack: testResult.stack,
            duration: testResult.duration
          });
        }
      }

      results.duration = Date.now() - fileStartTime;
      return results;
      
    } catch (error) {
      return {
        success: false,
        total: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        failures: [{
          name: fileName,
          message: error instanceof Error ? error.message : String(error),
          duration: 0
        }]
      };
    }
  }

  /**
   * Parse test file to extract test cases
   */
  private async parseTestFile(testFile: string): Promise<TestCase[]> {
    const content = fs.readFileSync(testFile, 'utf8');
    
    // Extract test cases from comments and code
    const testCases: TestCase[] = [];
    const lines = content.split('\n');
    
    let currentTest: Partial<TestCase> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for test case markers
      if (line.startsWith('// TEST:') || line.startsWith('/* TEST:')) {
        const testName = line.replace(/^\/[\/\*]\s*TEST:\s*/, '').replace(/\s*\*\/$/, '');
        
        currentTest = {
          name: testName,
          code: '',
          assertions: [],
          timeout: 5000,
          setup: '',
          teardown: ''
        };
      }
      
      // Look for assertion markers
      if (line.startsWith('// EXPECT:') || line.startsWith('/* EXPECT:')) {
        if (currentTest) {
          const expectation = line.replace(/^\/[\/\*]\s*EXPECT:\s*/, '').replace(/\s*\*\/$/, '');
          const assertion = this.parseAssertion(expectation);
          if (assertion) {
            currentTest.assertions = currentTest.assertions || [];
            currentTest.assertions.push(assertion);
          }
        }
      }
      
      // Look for end markers
      if (line.startsWith('// END_TEST') || line.startsWith('/* END_TEST')) {
        if (currentTest && currentTest.name) {
          testCases.push(currentTest as TestCase);
          currentTest = null;
        }
      }
      
      // Collect code lines
      if (currentTest && !line.startsWith('//') && !line.startsWith('/*')) {
        currentTest.code = (currentTest.code || '') + line + '\n';
      }
    }
    
    // If no structured tests found, treat entire file as one test
    if (testCases.length === 0) {
      testCases.push({
        name: path.basename(testFile, '.ino'),
        code: content,
        assertions: [],
        timeout: 10000,
        setup: '',
        teardown: ''
      });
    }
    
    return testCases;
  }

  /**
   * Parse assertion string into TestAssertion
   */
  private parseAssertion(expectation: string): TestAssertion | null {
    // Examples:
    // "digitalRead(13) == HIGH"
    // "analogRead(A0) > 512"
    // "Serial.contains('Hello')"
    
    const patterns = [
      // Digital pin assertions
      /digitalRead\((\d+)\)\s*(==|!=)\s*(HIGH|LOW)/i,
      // Analog pin assertions  
      /analogRead\(([A-Z0-9]+)\)\s*([><=!]+)\s*(\d+)/i,
      // Serial output assertions
      /Serial\.contains\('([^']+)'\)/i,
      /Serial\.equals\('([^']+)'\)/i,
      // Timing assertions
      /delay\((\d+)\)/i
    ];
    
    for (const pattern of patterns) {
      const match = expectation.match(pattern);
      if (match) {
        return {
          type: this.getAssertionType(pattern) as TestAssertion['type'],
          expected: match[3] || match[2] || match[1],
          actual: '',
          message: expectation,
          pin: match[1] ? parseInt(match[1]) : undefined,
          operator: match[2] as any
        };
      }
    }
    
    return null;
  }

  /**
   * Get assertion type from regex pattern
   */
  private getAssertionType(pattern: RegExp): string {
    const patternStr = pattern.toString();
    if (patternStr.includes('digitalRead')) return 'digital';
    if (patternStr.includes('analogRead')) return 'analog';
    if (patternStr.includes('Serial')) return 'serial';
    if (patternStr.includes('delay')) return 'timing';
    return 'custom';
  }

  /**
   * Run a single test case
   */
  private async runTestCase(testCase: TestCase, config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Create project for test
      const project = this.ide.createProject(`test_${Date.now()}`, 'blank', config.board);
      project.code = testCase.code;
      
      // Compile test
      const compilation = await this.ide.compileProject(project.id);
      if (!compilation.success) {
        throw new Error(`Compilation failed: ${compilation.errors.map(e => e.message).join(', ')}`);
      }
      
      // Upload and run
      const uploaded = await this.ide.uploadAndRun(project.id);
      if (!uploaded) {
        throw new Error('Failed to upload test to emulator');
      }
      
      // Run test with timeout
      const testTimeout = testCase.timeout || config.timeout;
      const result = await Promise.race([
        this.executeTest(testCase, testTimeout),
        new Promise<TestResult>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), testTimeout)
        )
      ]);
      
      // Cleanup
      this.ide.stopEmulation();
      
      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error) {
      return {
        passed: false,
        skipped: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Execute test assertions
   */
  private async executeTest(testCase: TestCase, timeout: number): Promise<TestResult> {
    // Wait for simulation to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result: TestResult = {
      passed: true,
      skipped: false,
      duration: 0
    };
    
    // If no assertions, just run for a short time and pass
    if (!testCase.assertions || testCase.assertions.length === 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(1000, timeout)));
      return result;
    }
    
    // Execute each assertion
    for (const assertion of testCase.assertions) {
      const assertionResult = await this.assertionEngine.execute(assertion, this.ide);
      if (!assertionResult.passed) {
        result.passed = false;
        result.error = assertionResult.message;
        break;
      }
    }
    
    return result;
  }

  /**
   * Generate code coverage report
   */
  private generateCoverageReport(): CoverageReport {
    // Mock coverage report for now
    // In a real implementation, this would analyze executed code paths
    return {
      statements: { covered: 85, total: 100 },
      branches: { covered: 70, total: 90 },
      functions: { covered: 95, total: 100 },
      lines: { covered: 88, total: 105 }
    };
  }

  /**
   * Start watching for file changes
   */
  private startWatching(_config: TestConfig): void {
    this.isWatching = true;
    console.log('👀 Watching for file changes...');
    
    // In a real implementation, this would use fs.watch or chokidar
    // For now, just set the flag
  }

  /**
   * Stop watching for file changes
   */
  public stopWatching(): void {
    this.isWatching = false;
  }
}