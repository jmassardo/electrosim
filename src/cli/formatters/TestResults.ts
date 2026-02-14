/**
 * Test Result Interfaces
 * Common interfaces for test results and reporting
 */

export interface TestResult {
  name: string;
  passed: boolean;
  skipped: boolean;
  duration: number;
  error?: string;
  stack?: string;
  assertions?: AssertionResult[];
}

export interface AssertionResult {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

export interface TestSuiteResult {
  name: string;
  description?: string;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: Date;
  tests: TestResult[];
  failures: TestFailure[];
  coverage?: CoverageReport;
}

export interface TestFailure {
  name: string;
  message: string;
  stack?: string;
  duration: number;
}

export interface CoverageReport {
  statements: { covered: number; total: number };
  branches: { covered: number; total: number };
  functions: { covered: number; total: number };
  lines: { covered: number; total: number };
}

export interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  metrics: BenchmarkMetric[];
  timestamp: Date;
}

export interface BenchmarkMetric {
  name: string;
  value: number;
  unit: string;
  description: string;
}

export interface GradingResult {
  studentId: string;
  assignmentId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  requirements: RequirementResult[];
  feedback: string[];
  timestamp: Date;
}

export interface RequirementResult {
  name: string;
  score: number;
  maxScore: number;
  passed: boolean;
  feedback: string;
  tests: TestResult[];
}