/**
 * JSON Test Report Formatter
 * Generates detailed JSON reports for programmatic analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteResult } from './TestResults';

export interface JSONTestReport {
  name: string;
  description?: string;
  timestamp: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    success: boolean;
  };
  tests: Array<{
    name: string;
    duration: number;
    status: 'passed' | 'failed' | 'skipped';
    error?: string;
    stack?: string;
    assertions?: Array<{
      type: string;
      passed: boolean;
      message: string;
      expected?: any;
      actual?: any;
    }>;
  }>;
  environment: {
    platform: string;
    nodeVersion: string;
    timestamp: string;
  };
  coverage?: {
    statements: { covered: number; total: number; percentage: number };
    branches: { covered: number; total: number; percentage: number };
    functions: { covered: number; total: number; percentage: number };
    lines: { covered: number; total: number; percentage: number };
  };
}

export class JSONFormatter {
  /**
   * Format test suite results as JSON
   */
  static format(result: TestSuiteResult): JSONTestReport {
    const report: JSONTestReport = {
      name: result.name,
      timestamp: result.timestamp.toISOString(),
      duration: result.duration,
      summary: {
        total: result.total,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        success: result.success
      },
      tests: result.tests.map(test => {
        const testResult: any = {
          name: test.name,
          duration: test.duration,
          status: test.skipped ? 'skipped' : (test.passed ? 'passed' : 'failed')
        };
        
        if (test.error !== undefined) {
          testResult.error = test.error;
        }
        
        if (test.stack !== undefined) {
          testResult.stack = test.stack;
        }
        
        if (test.assertions !== undefined) {
          testResult.assertions = test.assertions.map(assertion => {
            const assertionResult: any = {
              type: assertion.type,
              passed: assertion.passed,
              message: assertion.message
            };
            
            if (assertion.expected !== undefined) {
              assertionResult.expected = assertion.expected;
            }
            
            if (assertion.actual !== undefined) {
              assertionResult.actual = assertion.actual;
            }
            
            return assertionResult;
          });
        }
        
        return testResult;
      }),
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    };

    // Add optional description if available
    if (result.description !== undefined) {
      report.description = result.description;
    }

    // Add coverage information if available
    if (result.coverage) {
      report.coverage = {
        statements: {
          ...result.coverage.statements,
          percentage: Math.round((result.coverage.statements.covered / result.coverage.statements.total) * 100)
        },
        branches: {
          ...result.coverage.branches,
          percentage: Math.round((result.coverage.branches.covered / result.coverage.branches.total) * 100)
        },
        functions: {
          ...result.coverage.functions,
          percentage: Math.round((result.coverage.functions.covered / result.coverage.functions.total) * 100)
        },
        lines: {
          ...result.coverage.lines,
          percentage: Math.round((result.coverage.lines.covered / result.coverage.lines.total) * 100)
        }
      };
    }

    return report;
  }

  /**
   * Format as pretty-printed JSON string
   */
  static formatString(result: TestSuiteResult): string {
    return JSON.stringify(this.format(result), null, 2);
  }

  /**
   * Save JSON report to file
   */
  static async save(result: TestSuiteResult, filePath: string): Promise<void> {
    const json = this.formatString(result);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, json, 'utf8');
  }

  /**
   * Load JSON report from file
   */
  static async load(filePath: string): Promise<JSONTestReport> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Report file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as JSONTestReport;
  }
}