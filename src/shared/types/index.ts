/**
 * Core type definitions for ElectroLoom Arduino Simulator
 */

// Arduino Board Types
export type ArduinoBoardType = 'uno' | 'nano' | 'mega' | 'leonardo' | 'micro';

// Component Types (for UI)
export type ComponentType = 
  | 'Arduino Uno R3' 
  | 'Arduino Nano' 
  | 'Arduino Mega'
  | 'LED'
  | 'Resistor' 
  | 'Button'
  | 'Potentiometer'
  | 'Servo Motor'
  | 'Ultrasonic Sensor'
  | 'Temperature Sensor'
  | 'Breadboard'
  | 'Wire';

// Simulation Status
export type SimulationStatus = 'stopped' | 'running' | 'paused' | 'error';

export interface ArduinoBoardConfig {
  type: ArduinoBoardType;
  name: string;
  microcontroller: string;
  digitalPins: number;
  analogPins: number;
  flashMemory: number; // bytes
  sramMemory: number;  // bytes
  eepromMemory: number; // bytes
  clockSpeed: number;   // Hz
  serialPorts: number;
}

// Component Types
export interface ComponentPosition {
  x: number;
  y: number;
  rotation?: number;
}

export interface ComponentConnection {
  componentId: string;
  pinName: string;
  pinNumber?: number;
}

export interface BaseComponent {
  id: string;
  type: string;
  name: string;
  position: ComponentPosition;
  properties: Record<string, any>;
  connections: Record<string, ComponentConnection[]>;
  metadata?: Record<string, any>;
}

// Electronic Component Types
export interface LEDComponent extends BaseComponent {
  type: 'led';
  properties: {
    color: string;
    forwardVoltage: number;
    forwardCurrent: number;
    brightness?: number;
  };
}

export interface ResistorComponent extends BaseComponent {
  type: 'resistor';
  properties: {
    resistance: number; // ohms
    tolerance: number;  // percentage
    power: number;      // watts
  };
}

export interface SwitchComponent extends BaseComponent {
  type: 'switch';
  properties: {
    switchType: 'momentary' | 'toggle' | 'dip';
    normally: 'open' | 'closed';
    debounceTime: number; // ms
  };
}

// Circuit Definition
export interface Circuit {
  id: string;
  name: string;
  version: string;
  board: ArduinoBoardConfig;
  components: BaseComponent[];
  wires: Wire[];
  metadata: {
    created: string;
    modified: string;
    author?: string;
    description?: string;
  };
}

export interface Wire {
  id: string;
  from: ComponentConnection;
  to: ComponentConnection;
  properties?: {
    color?: string;
    thickness?: number;
  };
}

// Arduino Sketch
export interface ArduinoSketch {
  id: string;
  name: string;
  code: string;
  libraries: string[];
  boardConfig: ArduinoBoardType;
  metadata: {
    created: string;
    modified: string;
    author?: string;
    description?: string;
  };
}

// Project Structure
export interface ElectroLoomProject {
  id: string;
  name: string;
  version: string;
  circuit: Circuit;
  sketch: ArduinoSketch;
  configuration: ProjectConfiguration;
  metadata: {
    created: string;
    modified: string;
    author?: string;
    description?: string;
    tags?: string[];
  };
}

export interface ProjectConfiguration {
  simulation: {
    timeStep: number;        // ms
    maxRunTime: number;      // ms
    enableDebugging: boolean;
    enableProfiling: boolean;
  };
  virtualPort: {
    enabled: boolean;
    portName?: string;
    baudRate: number;
    dataBits: 7 | 8;
    stopBits: 1 | 2;
    parity: 'none' | 'odd' | 'even';
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    gridEnabled: boolean;
    snapToGrid: boolean;
    showPinLabels: boolean;
  };
}

// Simulation State
export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;     // ms
  cycleCount: number;
  memoryUsage: {
    flash: number;
    sram: number;
    eeprom: number;
  };
  pinStates: Record<number, PinState>;
  serialOutput: string[];
  debugInfo?: DebugInfo;
}

export interface PinState {
  pinNumber: number;
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  digitalValue: 'HIGH' | 'LOW';
  analogValue?: number;  // 0-1023
  pwmValue?: number;     // 0-255
}

export interface DebugInfo {
  currentLine: number;
  variables: Record<string, any>;
  callStack: string[];
  breakpoints: number[];
}

// Test Framework Types (for Headless Mode)
export interface TestAssertion {
  type: 'serial-output' | 'pin-state' | 'timing' | 'memory' | 'custom';
  condition: any;
  expected: any;
  tolerance?: number;
  timeout?: number;
  description?: string;
}

export interface TestConfig {
  name: string;
  sketch: string;
  circuit?: string;
  board: ArduinoBoardType;
  timeout: number;
  assertions: TestAssertion[];
  setup?: string;      // Setup code
  teardown?: string;   // Cleanup code
}

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  assertions?: AssertionResult[];
  metadata?: {
    board: ArduinoBoardType;
    memoryUsage: number;
    cpuCycles: number;
  };
}

export interface AssertionResult {
  type: string;
  passed: boolean;
  message: string;
  actual?: any;
  expected?: any;
  duration?: number;
}

// Virtual Serial Port Types
export interface SerialConfig {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'odd' | 'even';
  flowControl: boolean;
}

export interface VirtualPortInfo {
  portName: string;
  isActive: boolean;
  config: SerialConfig;
  bytesTransmitted: number;
  bytesReceived: number;
  lastActivity: string;
}

// UI State Types
export interface WorkspaceState {
  activeProject?: ElectroLoomProject;
  recentProjects: string[];
  selectedComponent?: string;
  draggedComponent?: BaseComponent;
  canvasView: {
    zoom: number;
    panX: number;
    panY: number;
  };
  panels: {
    componentPalette: boolean;
    properties: boolean;
    codeEditor: boolean;
    serialMonitor: boolean;
    debugger: boolean;
  };
}

export interface EditorState {
  code: string;
  cursor: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  breakpoints: number[];
  fontSize: number;
  theme: 'light' | 'dark' | 'high-contrast';
}

// Event Types
export interface SimulationEvent {
  type: string;
  timestamp: number;
  data?: any;
}

export interface ComponentEvent extends SimulationEvent {
  componentId: string;
  pinNumber?: number;
}

export interface SerialEvent extends SimulationEvent {
  type: 'serial-tx' | 'serial-rx';
  data: string | Uint8Array;
  baudRate: number;
}

// Error Types
export interface ElectroLoomError extends Error {
  code: string;
  category: 'simulation' | 'compilation' | 'hardware' | 'ui' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  context?: Record<string, any>;
  timestamp: string;
}

// Plugin/Extension Types (for future extensibility)
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  permissions: string[];
  dependencies?: Record<string, string>;
}

export interface ComponentPlugin {
  manifest: PluginManifest;
  componentTypes: string[];
  createComponent: (type: string, config: any) => BaseComponent;
  simulateComponent: (component: BaseComponent, deltaTime: number) => void;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// Constants
export const ARDUINO_BOARDS: Record<ArduinoBoardType, ArduinoBoardConfig> = {
  uno: {
    type: 'uno',
    name: 'Arduino Uno R3',
    microcontroller: 'ATmega328P',
    digitalPins: 14,
    analogPins: 6,
    flashMemory: 32768,
    sramMemory: 2048,
    eepromMemory: 1024,
    clockSpeed: 16000000,
    serialPorts: 1
  },
  nano: {
    type: 'nano',
    name: 'Arduino Nano',
    microcontroller: 'ATmega328P',
    digitalPins: 14,
    analogPins: 8,
    flashMemory: 32768,
    sramMemory: 2048,
    eepromMemory: 1024,
    clockSpeed: 16000000,
    serialPorts: 1
  },
  mega: {
    type: 'mega',
    name: 'Arduino Mega 2560',
    microcontroller: 'ATmega2560',
    digitalPins: 54,
    analogPins: 16,
    flashMemory: 262144,
    sramMemory: 8192,
    eepromMemory: 4096,
    clockSpeed: 16000000,
    serialPorts: 4
  },
  leonardo: {
    type: 'leonardo',
    name: 'Arduino Leonardo',
    microcontroller: 'ATmega32u4',
    digitalPins: 14,
    analogPins: 6,
    flashMemory: 32768,
    sramMemory: 2048,
    eepromMemory: 1024,
    clockSpeed: 16000000,
    serialPorts: 1
  },
  micro: {
    type: 'micro',
    name: 'Arduino Micro',
    microcontroller: 'ATmega32u4',
    digitalPins: 14,
    analogPins: 6,
    flashMemory: 32768,
    sramMemory: 2048,
    eepromMemory: 1024,
    clockSpeed: 16000000,
    serialPorts: 1
  }
};

export const DEFAULT_SERIAL_CONFIG: SerialConfig = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: false
};