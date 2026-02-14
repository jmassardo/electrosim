/**
 * Test Configuration Types and Parser
 * Supports YAML-based test suite configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// TypeScript interfaces
export interface Assertion {
  type: 'pin_state' | 'serial_output' | 'serial_contains' | 'analog_value' | 'timing';
  pin?: number;
  expected: string | number | boolean;
  after_delay?: number;
  timeout?: number;
  tolerance?: number;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
}

export interface SetupAction {
  set_analog_pin?: {
    pin: string;
    value: number;
  };
  set_digital_pin?: {
    pin: number;
    value: boolean;
  };
  delay?: number;
}

export interface TestCase {
  name: string;
  sketch: string;
  circuit?: string;
  timeout?: number;
  setup?: SetupAction[];
  assertions: Assertion[];
}

export interface TestSuite {
  name: string;
  description?: string;
  timeout: number;
  board: 'uno' | 'nano' | 'mega' | 'leonardo';
  tests: TestCase[];
}

export interface TestConfiguration {
  sketchFile: string;
  circuitFile?: string;
  assertions: Assertion[];
  timeout: number;
  boardType: string;
  setup?: SetupAction[];
}

export interface TestSuiteConfiguration {
  name: string;
  description?: string;
  timeout: number;
  board: string;
  tests: TestConfiguration[];
}

export interface BenchmarkConfiguration {
  sketchFile: string;
  circuitFile?: string;
  iterations: number;
  metrics: string[];
  timeout: number;
  boardType: string;
}

export interface AssignmentConfiguration {
  assignment: {
    name: string;
    description: string;
    max_score: number;
  };
  requirements: AssignmentRequirement[];
}

export interface AssignmentRequirement {
  name: string;
  points: number;
  tests: Record<string, boolean>;
}

/**
 * Configuration parser for test suites
 */
export class TestConfigurationParser {
  /**
   * Load and parse a test suite configuration file
   */
  static async loadTestSuite(configPath: string): Promise<TestSuiteConfiguration> {
    const resolvedPath = path.resolve(configPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Test configuration file not found: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    let config: any;

    try {
      // Determine file type and parse accordingly
      const ext = path.extname(resolvedPath).toLowerCase();
      
      if (ext === '.yml' || ext === '.yaml') {
        config = yaml.parse(content);
      } else if (ext === '.json') {
        config = JSON.parse(content);
      } else {
        throw new Error(`Unsupported configuration file format: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : error}`);
    }

    // Basic validation
    if (!config.name || !config.tests || !Array.isArray(config.tests)) {
      throw new Error('Configuration must have "name" and "tests" array');
    }

    // Convert to TestSuiteConfiguration format
    const baseDir = path.dirname(resolvedPath);
    
    const testSuiteConfig: TestSuiteConfiguration = {
      name: config.name,
      description: config.description,
      timeout: config.timeout || 30000,
      board: config.board || 'uno',
      tests: config.tests.map((test: any) => ({
        sketchFile: path.resolve(baseDir, test.sketch),
        circuitFile: test.circuit ? path.resolve(baseDir, test.circuit) : undefined,
        assertions: test.assertions || [],
        timeout: test.timeout || config.timeout || 30000,
        boardType: config.board || 'uno',
        setup: test.setup
      }))
    };

    // Validate that referenced files exist
    for (const test of testSuiteConfig.tests) {
      if (!fs.existsSync(test.sketchFile)) {
        throw new Error(`Sketch file not found: ${test.sketchFile}`);
      }
      
      if (test.circuitFile && !fs.existsSync(test.circuitFile)) {
        throw new Error(`Circuit file not found: ${test.circuitFile}`);
      }
    }

    return testSuiteConfig;
  }

  /**
   * Load assignment configuration
   */
  static async loadAssignment(configPath: string): Promise<AssignmentConfiguration> {
    const resolvedPath = path.resolve(configPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Assignment configuration file not found: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    
    try {
      const ext = path.extname(resolvedPath).toLowerCase();
      let config: any;
      
      if (ext === '.yml' || ext === '.yaml') {
        config = yaml.parse(content);
      } else if (ext === '.json') {
        config = JSON.parse(content);
      } else {
        throw new Error(`Unsupported configuration file format: ${ext}`);
      }

      // Basic validation
      if (!config.assignment || !config.requirements) {
        throw new Error('Assignment configuration must have "assignment" and "requirements" sections');
      }

      return config as AssignmentConfiguration;
    } catch (error) {
      throw new Error(`Failed to parse assignment configuration: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Create a test configuration from individual parameters
   */
  static createTestConfig(args: {
    sketch: string;
    circuit?: string;
    timeout?: number;
    board?: string;
    assertions?: Assertion[];
  }): TestConfiguration {
    const config: TestConfiguration = {
      sketchFile: path.resolve(args.sketch),
      assertions: args.assertions || [],
      timeout: args.timeout || 30000,
      boardType: args.board || 'uno'
    };
    
    if (args.circuit) {
      config.circuitFile = path.resolve(args.circuit);
    }
    
    return config;
  }

  /**
   * Create benchmark configuration
   */
  static createBenchmarkConfig(args: {
    sketch: string;
    circuit?: string;
    iterations?: number;
    metrics?: string[];
    timeout?: number;
    board?: string;
  }): BenchmarkConfiguration {
    const config: BenchmarkConfiguration = {
      sketchFile: path.resolve(args.sketch),
      iterations: args.iterations || 10,
      metrics: args.metrics || ['execution_time', 'memory_usage'],
      timeout: args.timeout || 30000,
      boardType: args.board || 'uno'
    };
    
    if (args.circuit) {
      config.circuitFile = path.resolve(args.circuit);
    }
    
    return config;
  }
}