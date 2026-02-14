# Testing Framework Architecture & Implementation Guide
**Version:** 1.0  
**Date:** December 21, 2024  
**Test Architect:** Test Architecture Team  
**Project:** ElectroSim Arduino Circuit Simulator

---

## Testing Architecture Decision Records (ADRs)

### ADR-001: Multi-Layer Testing Strategy
**Status:** Approved  
**Context:** ElectroSim requires comprehensive testing across Electron main process, renderer process, simulation engine, and CLI components.

**Decision:** Implement 4-tier testing architecture:
1. **Unit Tests** - Jest with ts-jest for pure business logic
2. **Component Tests** - React Testing Library for UI components  
3. **Integration Tests** - Custom test harness for simulation workflows
4. **E2E Tests** - Playwright for complete user journeys

**Rationale:** 
- Separation of concerns allows specialized testing approaches
- Each layer can have optimized tooling and mocking strategies
- Clear boundaries prevent test coupling and maintenance issues

### ADR-002: Hardware Simulation Testing Strategy
**Status:** Approved  
**Context:** Arduino hardware emulation requires deterministic testing without physical devices.

**Decision:** Create comprehensive hardware abstraction layer (HAL) mocking system with:
- Virtual Arduino register simulation
- Deterministic timing control  
- Component behavior modeling
- Electrical circuit mathematics validation

**Rationale:**
- Enables reliable testing of hardware-dependent functionality
- Allows controlled testing of edge cases and error conditions
- Provides basis for performance benchmarking and optimization

### ADR-003: Real-time Simulation Testing Approach
**Status:** Approved  
**Context:** Simulation engine operates in real-time with frame-based updates requiring time-dependent testing.

**Decision:** Implement controlled time progression system:
```typescript
class MockTimeManager {
  advance(milliseconds: number): void
  scheduleCallback(delay: number, callback: () => void): void
  getCurrentTime(): number
}
```

**Rationale:**
- Deterministic test execution regardless of system performance
- Ability to test long-running simulations in short time
- Consistent results across different testing environments

---

## Enhanced Testing Framework Implementation

### 1. Advanced Jest Configuration

#### 1.1 Comprehensive Jest Setup
```typescript
// jest.config.enhanced.js
module.exports = {
  // Base configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Enhanced setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/global-setup.ts',
    '<rootDir>/tests/setup/simulation-mocks.ts',
    '<rootDir>/tests/setup/electron-mocks.ts',
    '<rootDir>/tests/setup/canvas-mocks.ts'
  ],
  
  // Test matching patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
    '**/tests/unit/**/*.+(ts|tsx|js)',
    '**/tests/integration/**/*.+(ts|tsx|js)'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  
  // Module mapping for complex dependencies
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/renderer/components/$1',
    '^@simulation/(.*)$': '<rootDir>/src/simulation/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@utils/(.*)$': '<rootDir>/src/shared/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/shared/types/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@testUtils/(.*)$': '<rootDir>/tests/utils/$1'
  },
  
  // Enhanced coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main/index.ts',
    '!src/cli/index.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.config.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  
  // Granular coverage thresholds
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/simulation/': {
      branches: 95,
      functions: 100,
      lines: 98,
      statements: 98
    },
    'src/renderer/components/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/services/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Reporter configuration
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'cobertura' // For CI/CD integration
  ],
  
  // Performance optimization
  maxWorkers: '50%',
  testTimeout: 10000,
  watchman: true,
  
  // Transform ignore patterns for problematic packages
  transformIgnorePatterns: [
    'node_modules/(?!(avr8js|@reduxjs/toolkit|@mui/material)/)'
  ],
  
  // Global test configuration
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false
    }
  }
};
```

#### 1.2 Enhanced Global Setup
```typescript
// tests/setup/global-setup.ts
import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Global test environment configuration
global.TEST_ENV = {
  ARDUINO_SIMULATION: true,
  MOCK_HARDWARE: true,
  DETERMINISTIC_TIMING: true,
  PERFORMANCE_MONITORING: true
};

// Enhanced console suppression for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render')) return;
    if (args[0]?.includes?.('Warning: React does not recognize')) return;
    if (args[0]?.includes?.('Warning: validateDOMNesting')) return;
    originalError(...args);
  };
  
  console.warn = (...args) => {
    if (args[0]?.includes?.('componentWillReceiveProps')) return;
    if (args[0]?.includes?.('componentWillMount')) return;
    originalWarn(...args);
  };
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  jest.clearAllMocks();
  
  // Clean up any simulation state
  if (global.mockSimulationEngine) {
    global.mockSimulationEngine.reset();
  }
});

// Global performance monitoring for tests
let testStartTime: number;
beforeEach(() => {
  testStartTime = performance.now();
});

afterEach(() => {
  const testDuration = performance.now() - testStartTime;
  if (testDuration > 5000) { // Tests taking over 5 seconds
    console.warn(`Slow test detected: ${expect.getState().currentTestName} (${testDuration.toFixed(2)}ms)`);
  }
});
```

### 2. Simulation Testing Framework

#### 2.1 Arduino Hardware Abstraction Mock
```typescript
// tests/mocks/arduino-hardware-mock.ts
export interface ArduinoRegister {
  address: number;
  name: string;
  bits: number;
  resetValue: number;
  currentValue: number;
}

export interface PinState {
  pin: number;
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  digitalValue: boolean;
  analogValue: number;
  pwmValue?: number;
  pwmFrequency?: number;
}

export class ArduinoHardwareMock {
  private registers: Map<string, ArduinoRegister> = new Map();
  private pins: Map<number, PinState> = new Map();
  private serialBuffers: Map<number, Buffer[]> = new Map(); // Multiple UART support
  private interrupts: Map<number, () => void> = new Map();
  private timers: ArduinoTimer[] = [];
  private flashMemory: Uint8Array = new Uint8Array(32768); // 32KB for ATmega328P
  private sram: Uint8Array = new Uint8Array(2048); // 2KB SRAM
  private eeprom: Uint8Array = new Uint8Array(1024); // 1KB EEPROM
  
  constructor(boardType: 'UNO' | 'MEGA' | 'LEONARDO' | 'NANO' = 'UNO') {
    this.initializeRegisters(boardType);
    this.initializePins(boardType);
    this.initializeSerialPorts(boardType);
  }
  
  // Register operations
  setRegister(name: string, value: number): void {
    const register = this.registers.get(name);
    if (!register) {
      throw new Error(`Unknown register: ${name}`);
    }
    
    const maxValue = (1 << register.bits) - 1;
    register.currentValue = value & maxValue;
    
    // Handle special register side effects
    this.handleRegisterSideEffects(name, value);
  }
  
  getRegister(name: string): number {
    const register = this.registers.get(name);
    if (!register) {
      throw new Error(`Unknown register: ${name}`);
    }
    return register.currentValue;
  }
  
  // Pin operations with accurate timing
  digitalWrite(pin: number, value: boolean, timestamp?: number): void {
    const pinState = this.pins.get(pin);
    if (!pinState) {
      throw new Error(`Invalid pin: ${pin}`);
    }
    
    if (pinState.mode !== 'OUTPUT') {
      throw new Error(`Pin ${pin} not configured as OUTPUT`);
    }
    
    pinState.digitalValue = value;
    
    // Emit pin change event for connected components
    this.emitPinChangeEvent(pin, value, timestamp);
  }
  
  digitalRead(pin: number): boolean {
    const pinState = this.pins.get(pin);
    if (!pinState) {
      throw new Error(`Invalid pin: ${pin}`);
    }
    
    return pinState.digitalValue;
  }
  
  // PWM generation with accurate timing
  analogWrite(pin: number, value: number): void {
    const pwmPins = [3, 5, 6, 9, 10, 11]; // Arduino Uno PWM pins
    if (!pwmPins.includes(pin)) {
      throw new Error(`Pin ${pin} does not support PWM`);
    }
    
    const pinState = this.pins.get(pin);
    if (pinState) {
      pinState.pwmValue = Math.max(0, Math.min(255, value));
      pinState.pwmFrequency = this.calculatePWMFrequency(pin);
    }
    
    // Generate PWM signal events
    this.generatePWMSignal(pin, value);
  }
  
  // ADC simulation
  analogRead(pin: number): number {
    const analogPins = [14, 15, 16, 17, 18, 19]; // A0-A5 mapped to pins 14-19
    if (!analogPins.includes(pin)) {
      throw new Error(`Pin ${pin} does not support analog read`);
    }
    
    const pinState = this.pins.get(pin);
    if (!pinState) return 0;
    
    // Convert voltage to ADC value (0-1023 for 10-bit ADC)
    const voltage = pinState.analogValue;
    const referenceVoltage = this.getADCReferenceVoltage();
    return Math.round((voltage / referenceVoltage) * 1023);
  }
  
  // Serial communication simulation
  serialWrite(port: number, data: Buffer): void {
    if (!this.serialBuffers.has(port)) {
      this.serialBuffers.set(port, []);
    }
    
    const buffer = this.serialBuffers.get(port)!;
    buffer.push(data);
    
    // Emit serial data event
    this.emitSerialDataEvent(port, data);
  }
  
  serialRead(port: number, length: number): Buffer {
    const buffer = this.serialBuffers.get(port) || [];
    if (buffer.length === 0) return Buffer.alloc(0);
    
    const data = buffer.shift()!;
    return data.slice(0, Math.min(length, data.length));
  }
  
  serialAvailable(port: number): number {
    const buffer = this.serialBuffers.get(port) || [];
    return buffer.reduce((total, buf) => total + buf.length, 0);
  }
  
  // Memory operations
  readFlash(address: number): number {
    if (address >= this.flashMemory.length) {
      throw new Error(`Flash address out of range: ${address}`);
    }
    return this.flashMemory[address];
  }
  
  writeFlash(address: number, value: number): void {
    if (address >= this.flashMemory.length) {
      throw new Error(`Flash address out of range: ${address}`);
    }
    this.flashMemory[address] = value & 0xFF;
  }
  
  readSRAM(address: number): number {
    if (address >= this.sram.length) {
      throw new Error(`SRAM address out of range: ${address}`);
    }
    return this.sram[address];
  }
  
  writeSRAM(address: number, value: number): void {
    if (address >= this.sram.length) {
      throw new Error(`SRAM address out of range: ${address}`);
    }
    this.sram[address] = value & 0xFF;
  }
  
  // Interrupt system
  attachInterrupt(interrupt: number, handler: () => void, mode: string): void {
    this.interrupts.set(interrupt, handler);
  }
  
  detachInterrupt(interrupt: number): void {
    this.interrupts.delete(interrupt);
  }
  
  triggerInterrupt(interrupt: number): void {
    const handler = this.interrupts.get(interrupt);
    if (handler) {
      handler();
    }
  }
  
  // Private helper methods
  private initializeRegisters(boardType: string): void {
    // Initialize all Arduino registers with proper reset values
    const commonRegisters: Record<string, Partial<ArduinoRegister>> = {
      'DDRB': { address: 0x24, bits: 8, resetValue: 0x00 },
      'PORTB': { address: 0x25, bits: 8, resetValue: 0x00 },
      'PINB': { address: 0x23, bits: 8, resetValue: 0x00 },
      'DDRC': { address: 0x27, bits: 8, resetValue: 0x00 },
      'PORTC': { address: 0x28, bits: 8, resetValue: 0x00 },
      'PINC': { address: 0x26, bits: 8, resetValue: 0x00 },
      'DDRD': { address: 0x2A, bits: 8, resetValue: 0x00 },
      'PORTD': { address: 0x2B, bits: 8, resetValue: 0x00 },
      'PIND': { address: 0x29, bits: 8, resetValue: 0x00 },
      'TIMSK0': { address: 0x6E, bits: 8, resetValue: 0x00 },
      'TCCR0A': { address: 0x44, bits: 8, resetValue: 0x00 },
      'TCCR0B': { address: 0x45, bits: 8, resetValue: 0x00 },
      'ADMUX': { address: 0x7C, bits: 8, resetValue: 0x00 },
      'ADCSRA': { address: 0x7A, bits: 8, resetValue: 0x00 }
    };
    
    Object.entries(commonRegisters).forEach(([name, config]) => {
      this.registers.set(name, {
        name,
        address: config.address!,
        bits: config.bits!,
        resetValue: config.resetValue!,
        currentValue: config.resetValue!
      });
    });
  }
  
  private initializePins(boardType: string): void {
    const pinCount = boardType === 'MEGA' ? 54 : 20;
    
    for (let i = 0; i < pinCount; i++) {
      this.pins.set(i, {
        pin: i,
        mode: 'INPUT',
        digitalValue: false,
        analogValue: 0
      });
    }
  }
  
  private initializeSerialPorts(boardType: string): void {
    const serialPorts = boardType === 'MEGA' ? 4 : 1;
    
    for (let i = 0; i < serialPorts; i++) {
      this.serialBuffers.set(i, []);
    }
  }
  
  private handleRegisterSideEffects(name: string, value: number): void {
    // Implement register side effects (pin mode changes, timer configurations, etc.)
    switch (name) {
      case 'DDRB':
        this.updatePinModes('B', value);
        break;
      case 'DDRC':
        this.updatePinModes('C', value);
        break;
      case 'DDRD':
        this.updatePinModes('D', value);
        break;
      // Add more register side effects as needed
    }
  }
  
  private updatePinModes(port: string, ddrValue: number): void {
    const portOffset = port === 'B' ? 8 : port === 'C' ? 14 : 0;
    
    for (let i = 0; i < 8; i++) {
      const pin = portOffset + i;
      const pinState = this.pins.get(pin);
      
      if (pinState) {
        pinState.mode = (ddrValue & (1 << i)) ? 'OUTPUT' : 'INPUT';
      }
    }
  }
  
  private calculatePWMFrequency(pin: number): number {
    // Arduino Uno PWM frequencies based on timers
    const timer0Pins = [5, 6]; // ~976 Hz
    const timer1Pins = [9, 10]; // ~490 Hz  
    const timer2Pins = [3, 11]; // ~490 Hz
    
    if (timer0Pins.includes(pin)) return 976.56;
    if (timer1Pins.includes(pin)) return 490.20;
    if (timer2Pins.includes(pin)) return 490.20;
    
    return 490.20; // Default
  }
  
  private generatePWMSignal(pin: number, dutyCycle: number): void {
    const frequency = this.calculatePWMFrequency(pin);
    const period = 1000 / frequency; // Period in milliseconds
    const onTime = period * (dutyCycle / 255);
    
    // Emit PWM signal events for connected components
    this.emitPWMSignalEvent(pin, frequency, dutyCycle, onTime);
  }
  
  private getADCReferenceVoltage(): number {
    const admuxValue = this.getRegister('ADMUX');
    const refs = (admuxValue >> 6) & 0x03;
    
    switch (refs) {
      case 0: return 5.0; // AREF
      case 1: return 5.0; // AVCC
      case 2: return 1.1; // Internal 1.1V
      case 3: return 2.56; // Internal 2.56V (Mega only)
      default: return 5.0;
    }
  }
  
  // Event emission for component communication
  private emitPinChangeEvent(pin: number, value: boolean, timestamp?: number): void {
    // Integration point for simulation engine
    if (global.mockSimulationEngine) {
      global.mockSimulationEngine.handlePinChange(pin, value, timestamp);
    }
  }
  
  private emitSerialDataEvent(port: number, data: Buffer): void {
    if (global.mockSimulationEngine) {
      global.mockSimulationEngine.handleSerialData(port, data);
    }
  }
  
  private emitPWMSignalEvent(pin: number, frequency: number, dutyCycle: number, onTime: number): void {
    if (global.mockSimulationEngine) {
      global.mockSimulationEngine.handlePWMSignal(pin, frequency, dutyCycle, onTime);
    }
  }
}
```

#### 2.2 Deterministic Time Management
```typescript
// tests/mocks/time-manager-mock.ts
export interface ScheduledTask {
  id: number;
  executeTime: number;
  callback: () => void;
  recurring?: boolean;
  interval?: number;
}

export class MockTimeManager {
  private currentTime = 0;
  private scheduledTasks: ScheduledTask[] = [];
  private nextTaskId = 1;
  private isRunning = false;
  
  constructor(startTime: number = 0) {
    this.currentTime = startTime;
  }
  
  // Core time control
  now(): number {
    return this.currentTime;
  }
  
  advance(milliseconds: number): number {
    if (milliseconds < 0) {
      throw new Error('Cannot advance time backwards');
    }
    
    const targetTime = this.currentTime + milliseconds;
    const executedTasks: number[] = [];
    
    // Execute all scheduled tasks up to target time
    while (this.scheduledTasks.length > 0) {
      const nextTask = this.scheduledTasks[0];
      
      if (nextTask.executeTime > targetTime) {
        break; // No more tasks to execute
      }
      
      // Move time to task execution time
      this.currentTime = nextTask.executeTime;
      
      // Remove task from queue
      this.scheduledTasks.shift();
      
      // Execute the task
      try {
        nextTask.callback();
        executedTasks.push(nextTask.id);
        
        // Handle recurring tasks
        if (nextTask.recurring && nextTask.interval) {
          this.scheduleTask(
            nextTask.callback,
            nextTask.interval,
            true,
            nextTask.interval
          );
        }
      } catch (error) {
        console.error(`Error executing scheduled task ${nextTask.id}:`, error);
      }
    }
    
    // Move to final target time
    this.currentTime = targetTime;
    
    return executedTasks.length;
  }
  
  // Task scheduling
  setTimeout(callback: () => void, delay: number): number {
    return this.scheduleTask(callback, delay, false);
  }
  
  setInterval(callback: () => void, interval: number): number {
    return this.scheduleTask(callback, interval, true, interval);
  }
  
  clearTimeout(taskId: number): boolean {
    return this.clearTask(taskId);
  }
  
  clearInterval(taskId: number): boolean {
    return this.clearTask(taskId);
  }
  
  // Animation frame simulation
  requestAnimationFrame(callback: (timestamp: number) => void): number {
    return this.scheduleTask(
      () => callback(this.currentTime),
      16.67 // 60 FPS
    );
  }
  
  cancelAnimationFrame(taskId: number): boolean {
    return this.clearTask(taskId);
  }
  
  // Utility methods
  reset(newTime: number = 0): void {
    this.currentTime = newTime;
    this.scheduledTasks = [];
    this.nextTaskId = 1;
    this.isRunning = false;
  }
  
  getScheduledTaskCount(): number {
    return this.scheduledTasks.length;
  }
  
  getNextScheduledTime(): number | null {
    if (this.scheduledTasks.length === 0) return null;
    return this.scheduledTasks[0].executeTime;
  }
  
  // Advanced time manipulation
  jumpTo(targetTime: number): number {
    if (targetTime < this.currentTime) {
      throw new Error('Cannot jump backwards in time');
    }
    
    return this.advance(targetTime - this.currentTime);
  }
  
  runUntilComplete(maxTime: number = 10000): number {
    const startTime = this.currentTime;
    const maxTargetTime = startTime + maxTime;
    let tasksExecuted = 0;
    
    while (this.scheduledTasks.length > 0 && this.currentTime < maxTargetTime) {
      const nextTask = this.scheduledTasks[0];
      
      if (nextTask.executeTime > maxTargetTime) {
        break;
      }
      
      tasksExecuted += this.advance(nextTask.executeTime - this.currentTime);
    }
    
    return tasksExecuted;
  }
  
  // Private helper methods
  private scheduleTask(
    callback: () => void,
    delay: number,
    recurring: boolean = false,
    interval?: number
  ): number {
    const taskId = this.nextTaskId++;
    const executeTime = this.currentTime + delay;
    
    const task: ScheduledTask = {
      id: taskId,
      executeTime,
      callback,
      recurring,
      interval
    };
    
    // Insert task in chronological order
    this.insertTaskChronologically(task);
    
    return taskId;
  }
  
  private insertTaskChronologically(newTask: ScheduledTask): void {
    let insertIndex = 0;
    
    // Find correct position to maintain chronological order
    while (
      insertIndex < this.scheduledTasks.length &&
      this.scheduledTasks[insertIndex].executeTime <= newTask.executeTime
    ) {
      insertIndex++;
    }
    
    this.scheduledTasks.splice(insertIndex, 0, newTask);
  }
  
  private clearTask(taskId: number): boolean {
    const taskIndex = this.scheduledTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return false;
    }
    
    this.scheduledTasks.splice(taskIndex, 1);
    return true;
  }
}

// Global time manager instance for tests
export const mockTimeManager = new MockTimeManager();

// Jest integration
export const setupMockTime = (): void => {
  // Override global time functions
  global.setTimeout = mockTimeManager.setTimeout.bind(mockTimeManager) as any;
  global.clearTimeout = mockTimeManager.clearTimeout.bind(mockTimeManager);
  global.setInterval = mockTimeManager.setInterval.bind(mockTimeManager) as any;
  global.clearInterval = mockTimeManager.clearInterval.bind(mockTimeManager);
  global.requestAnimationFrame = mockTimeManager.requestAnimationFrame.bind(mockTimeManager) as any;
  global.cancelAnimationFrame = mockTimeManager.cancelAnimationFrame.bind(mockTimeManager);
  
  // Override Date methods
  const originalDateNow = Date.now;
  Date.now = mockTimeManager.now.bind(mockTimeManager);
  
  // Override performance methods
  const originalPerformanceNow = performance.now;
  performance.now = mockTimeManager.now.bind(mockTimeManager);
  
  // Cleanup function
  return () => {
    Date.now = originalDateNow;
    performance.now = originalPerformanceNow;
    mockTimeManager.reset();
  };
};
```

### 3. Component Testing Utilities

#### 3.1 Simulation Component Test Factory
```typescript
// tests/utils/simulation-test-factory.ts
export interface ComponentTestOptions {
  mockTime?: boolean;
  mockHardware?: boolean;
  enableProfiling?: boolean;
  simulationSpeed?: number;
}

export class SimulationTestFactory {
  private mockTime?: MockTimeManager;
  private mockHardware?: ArduinoHardwareMock;
  
  constructor(private options: ComponentTestOptions = {}) {
    if (options.mockTime) {
      this.mockTime = new MockTimeManager();
      setupMockTime();
    }
    
    if (options.mockHardware) {
      this.mockHardware = new ArduinoHardwareMock();
    }
  }
  
  createComponent<T extends Component>(
    ComponentClass: new (...args: any[]) => T,
    id: string,
    ...args: any[]
  ): T {
    const component = new ComponentClass(id, ...args);
    
    // Inject mocks if needed
    if (this.mockHardware && 'setHardwareInterface' in component) {
      (component as any).setHardwareInterface(this.mockHardware);
    }
    
    return component;
  }
  
  createCircuit(): TestCircuitBuilder {
    return new TestCircuitBuilder(this.mockTime, this.mockHardware);
  }
  
  advanceTime(milliseconds: number): number {
    if (!this.mockTime) {
      throw new Error('Mock time not enabled');
    }
    return this.mockTime.advance(milliseconds);
  }
  
  getCurrentTime(): number {
    return this.mockTime?.now() || Date.now();
  }
  
  cleanup(): void {
    this.mockTime?.reset();
    // Additional cleanup as needed
  }
}

export class TestCircuitBuilder {
  private components: Map<string, Component> = new Map();
  private connections: Array<{ from: string, to: string }> = [];
  private engine?: SimulationEngine;
  
  constructor(
    private mockTime?: MockTimeManager,
    private mockHardware?: ArduinoHardwareMock
  ) {}
  
  addArduino(id: string, type: 'UNO' | 'MEGA' | 'LEONARDO' = 'UNO', options: any = {}): this {
    let arduino: ArduinoBoard;
    
    switch (type) {
      case 'UNO':
        arduino = new ArduinoUno(id, options);
        break;
      case 'MEGA':
        arduino = new ArduinoMega(id, options);
        break;
      case 'LEONARDO':
        arduino = new ArduinoLeonardo(id, options);
        break;
      default:
        throw new Error(`Unknown Arduino type: ${type}`);
    }
    
    if (this.mockHardware && 'setHardwareInterface' in arduino) {
      (arduino as any).setHardwareInterface(this.mockHardware);
    }
    
    this.components.set(id, arduino);
    return this;
  }
  
  addLED(id: string, options: { color?: string, forwardVoltage?: number } = {}): this {
    const led = new LEDComponent(id, options);
    this.components.set(id, led);
    return this;
  }
  
  addResistor(id: string, resistance: number, options: any = {}): this {
    const resistor = new ResistorComponent(id, resistance, options);
    this.components.set(id, resistor);
    return this;
  }
  
  addServo(id: string, options: { minAngle?: number, maxAngle?: number } = {}): this {
    const servo = new ServoMotorComponent(id, options.minAngle, options.maxAngle);
    this.components.set(id, servo);
    return this;
  }
  
  connect(from: string, to: string): this {
    this.connections.push({ from, to });
    return this;
  }
  
  build(): TestCircuit {
    this.engine = new SimulationEngine({
      targetFPS: 60,
      enableProfiling: true,
      enableDebugging: true
    });
    
    // Add all components to engine
    this.components.forEach((component) => {
      this.engine!.addComponent(component);
    });
    
    // Create all connections
    this.connections.forEach(({ from, to }) => {
      const [fromComponent, fromPin] = from.split('.');
      const [toComponent, toPin] = to.split('.');
      
      const fromComp = this.components.get(fromComponent);
      const toComp = this.components.get(toComponent);
      
      if (!fromComp || !toComp) {
        throw new Error(`Invalid connection: ${from} -> ${to}`);
      }
      
      const fromPinObj = fromComp.getPin(fromPin);
      const toPinObj = toComp.getPin(toPin);
      
      if (!fromPinObj || !toPinObj) {
        throw new Error(`Invalid pin in connection: ${from} -> ${to}`);
      }
      
      this.engine!.connect(fromComp.getId(), fromPin, toComp.getId(), toPin);
    });
    
    return new TestCircuit(
      this.engine,
      this.components,
      this.mockTime,
      this.mockHardware
    );
  }
}

export class TestCircuit {
  constructor(
    private engine: SimulationEngine,
    private components: Map<string, Component>,
    private mockTime?: MockTimeManager,
    private mockHardware?: ArduinoHardwareMock
  ) {}
  
  getComponent<T extends Component>(id: string): T {
    const component = this.components.get(id);
    if (!component) {
      throw new Error(`Component not found: ${id}`);
    }
    return component as T;
  }
  
  loadSketch(code: string, boardId?: string): void {
    const arduino = boardId 
      ? this.getComponent<ArduinoBoard>(boardId)
      : Array.from(this.components.values()).find(c => c instanceof ArduinoBoard) as ArduinoBoard;
    
    if (!arduino) {
      throw new Error('No Arduino board found in circuit');
    }
    
    arduino.loadSketch(code);
  }
  
  async compile(): Promise<{ success: boolean, errors: string[] }> {
    // Implement compilation logic
    return { success: true, errors: [] };
  }
  
  start(): void {
    this.engine.start();
  }
  
  stop(): void {
    this.engine.stop();
  }
  
  pause(): void {
    this.engine.pause();
  }
  
  resume(): void {
    this.engine.resume();
  }
  
  async runFor(milliseconds: number): Promise<void> {
    if (this.mockTime) {
      this.mockTime.advance(milliseconds);
    } else {
      await new Promise(resolve => setTimeout(resolve, milliseconds));
    }
  }
  
  getStats(): SimulationStats {
    return this.engine.getStats();
  }
  
  isRunning(): boolean {
    return this.engine.isRunning();
  }
}
```

This comprehensive testing framework provides the foundation for achieving 100% test coverage with reliable, maintainable, and performant tests across all layers of the ElectroSim application.