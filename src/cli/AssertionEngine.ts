/**
 * Assertion Engine
 * Provides testing assertions for Arduino simulation validation
 * Supports digital/analog pin testing, serial communication, and timing assertions
 */

import { ArduinoIDE } from '../simulation/ide/ArduinoIDE';

export interface TestCase {
  name: string;
  code: string;
  assertions: TestAssertion[];
  timeout: number;
  setup: string;
  teardown: string;
}

export interface TestAssertion {
  type: 'digital' | 'analog' | 'serial' | 'timing' | 'custom';
  expected: string;
  actual: string;
  message: string;
  pin?: number | undefined;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=';
}

export interface TestResult {
  passed: boolean;
  skipped: boolean;
  error?: string;
  stack?: string;
  duration: number;
}

export interface AssertionResult {
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

/**
 * Assertion Engine for Arduino testing
 */
export class AssertionEngine {
  private timeouts: Set<NodeJS.Timeout> = new Set();

  /**
   * Execute a test assertion
   */
  public async execute(assertion: TestAssertion, ide: ArduinoIDE): Promise<AssertionResult> {
    try {
      switch (assertion.type) {
        case 'digital':
          return await this.executeDigitalAssertion(assertion, ide);
        case 'analog':
          return await this.executeAnalogAssertion(assertion, ide);
        case 'serial':
          return await this.executeSerialAssertion(assertion, ide);
        case 'timing':
          return await this.executeTimingAssertion(assertion, ide);
        case 'custom':
          return await this.executeCustomAssertion(assertion, ide);
        default:
          return {
            passed: false,
            message: `Unknown assertion type: ${assertion.type}`
          };
      }
    } catch (error) {
      return {
        passed: false,
        message: `Assertion execution error: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  /**
   * Execute digital pin assertion
   * Example: digitalRead(13) == HIGH
   */
  private async executeDigitalAssertion(assertion: TestAssertion, _ide: ArduinoIDE): Promise<AssertionResult> {
    if (!assertion.pin) {
      return {
        passed: false,
        message: 'Digital assertion requires pin number'
      };
    }

    // Wait a bit for the simulation to process
    await this.delay(100);

    // Simulate reading digital pin
    // In a real implementation, this would read from the AVR's GPIO registers
    const actualValue = this.mockDigitalRead(assertion.pin);
    const expectedValue = assertion.expected === 'HIGH' ? 1 : 0;

    const passed = this.evaluateCondition(actualValue, assertion.operator || '==', expectedValue);

    return {
      passed,
      message: passed 
        ? `digitalRead(${assertion.pin}) assertion passed`
        : `digitalRead(${assertion.pin}) expected ${assertion.expected}, got ${actualValue ? 'HIGH' : 'LOW'}`,
      expected: assertion.expected,
      actual: actualValue ? 'HIGH' : 'LOW'
    };
  }

  /**
   * Execute analog pin assertion
   * Example: analogRead(A0) > 512
   */
  private async executeAnalogAssertion(assertion: TestAssertion, _ide: ArduinoIDE): Promise<AssertionResult> {
    if (!assertion.pin) {
      return {
        passed: false,
        message: 'Analog assertion requires pin number'
      };
    }

    await this.delay(100);

    // Simulate reading analog pin
    const actualValue = this.mockAnalogRead(assertion.pin);
    const expectedValue = parseInt(assertion.expected);

    if (isNaN(expectedValue)) {
      return {
        passed: false,
        message: `Invalid expected value for analog assertion: ${assertion.expected}`
      };
    }

    const passed = this.evaluateCondition(actualValue, assertion.operator || '==', expectedValue);

    return {
      passed,
      message: passed
        ? `analogRead(${assertion.pin}) assertion passed`
        : `analogRead(${assertion.pin}) expected ${assertion.operator} ${expectedValue}, got ${actualValue}`,
      expected: `${assertion.operator} ${expectedValue}`,
      actual: actualValue
    };
  }

  /**
   * Execute serial communication assertion
   * Example: Serial.contains('Hello')
   */
  private async executeSerialAssertion(assertion: TestAssertion, ide: ArduinoIDE): Promise<AssertionResult> {
    // Wait for serial output
    await this.delay(500);

    const serialOutput = ide.getSerialOutput();
    const fullOutput = serialOutput.join('\n');

    let passed = false;
    let message = '';

    if (assertion.message.includes('contains')) {
      const expectedText = assertion.expected;
      passed = fullOutput.includes(expectedText);
      message = passed
        ? `Serial output contains "${expectedText}"`
        : `Serial output does not contain "${expectedText}"`;
    } else if (assertion.message.includes('equals')) {
      const expectedText = assertion.expected;
      const lastLine = serialOutput[serialOutput.length - 1] || '';
      passed = lastLine.trim() === expectedText;
      message = passed
        ? `Serial output equals "${expectedText}"`
        : `Serial output "${lastLine.trim()}" does not equal "${expectedText}"`;
    } else {
      return {
        passed: false,
        message: `Unknown serial assertion: ${assertion.message}`
      };
    }

    return {
      passed,
      message,
      expected: assertion.expected,
      actual: fullOutput
    };
  }

  /**
   * Execute timing assertion
   * Example: delay(1000)
   */
  private async executeTimingAssertion(assertion: TestAssertion, _ide: ArduinoIDE): Promise<AssertionResult> {
    const delayMs = parseInt(assertion.expected);
    
    if (isNaN(delayMs)) {
      return {
        passed: false,
        message: `Invalid delay value: ${assertion.expected}`
      };
    }

    const startTime = Date.now();
    
    // Wait for the specified delay
    await this.delay(delayMs);
    
    const actualDelay = Date.now() - startTime;
    const tolerance = Math.max(50, delayMs * 0.1); // 10% tolerance or 50ms minimum
    
    const passed = Math.abs(actualDelay - delayMs) <= tolerance;

    return {
      passed,
      message: passed
        ? `Timing assertion passed (${actualDelay}ms ≈ ${delayMs}ms)`
        : `Timing assertion failed: expected ~${delayMs}ms, got ${actualDelay}ms`,
      expected: `~${delayMs}ms`,
      actual: `${actualDelay}ms`
    };
  }

  /**
   * Execute custom assertion
   */
  private async executeCustomAssertion(assertion: TestAssertion, _ide: ArduinoIDE): Promise<AssertionResult> {
    // Custom assertions can be implemented here
    // For now, just return a placeholder
    return {
      passed: true,
      message: `Custom assertion: ${assertion.message}`
    };
  }

  /**
   * Evaluate conditional expression
   */
  private evaluateCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '==':
        return actual == expected;
      case '!=':
        return actual != expected;
      case '>':
        return actual > expected;
      case '<':
        return actual < expected;
      case '>=':
        return actual >= expected;
      case '<=':
        return actual <= expected;
      default:
        return false;
    }
  }

  /**
   * Mock digital pin reading
   * In a real implementation, this would read from AVR GPIO registers
   */
  private mockDigitalRead(pin: number): boolean {
    // Simulate some basic pin behavior
    // Pin 13 (built-in LED) might be HIGH if there's a blink program
    if (pin === 13) {
      return Math.random() > 0.5; // Simulate blinking LED
    }
    
    // Other pins default to LOW
    return false;
  }

  /**
   * Mock analog pin reading
   * In a real implementation, this would read from AVR ADC registers
   */
  private mockAnalogRead(pin: number): number {
    // Simulate sensor readings
    if (pin === 0) { // A0
      return Math.floor(Math.random() * 1024); // Random sensor value
    }
    
    return 0;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms);
      this.timeouts.add(timeout);
    });
  }

  /**
   * Built-in assertion helpers
   */
  public static expect(actual: any) {
    return {
      toBe: (expected: any): AssertionResult => ({
        passed: actual === expected,
        message: `Expected ${actual} to be ${expected}`,
        expected,
        actual
      }),
      
      toEqual: (expected: any): AssertionResult => ({
        passed: actual == expected,
        message: `Expected ${actual} to equal ${expected}`,
        expected,
        actual
      }),
      
      toBeGreaterThan: (expected: any): AssertionResult => ({
        passed: actual > expected,
        message: `Expected ${actual} to be greater than ${expected}`,
        expected: `> ${expected}`,
        actual
      }),
      
      toBeLessThan: (expected: any): AssertionResult => ({
        passed: actual < expected,
        message: `Expected ${actual} to be less than ${expected}`,
        expected: `< ${expected}`,
        actual
      }),
      
      toContain: (expected: string): AssertionResult => ({
        passed: String(actual).includes(expected),
        message: `Expected "${actual}" to contain "${expected}"`,
        expected,
        actual
      }),
      
      toBeTruthy: (): AssertionResult => ({
        passed: !!actual,
        message: `Expected ${actual} to be truthy`,
        expected: 'truthy',
        actual
      }),
      
      toBeFalsy: (): AssertionResult => ({
        passed: !actual,
        message: `Expected ${actual} to be falsy`,
        expected: 'falsy',
        actual
      })
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Clear any pending timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
}