# ElectroSim API Documentation

This document provides comprehensive API documentation for ElectroSim's component system, simulation engine, and extensibility framework.

## Table of Contents

1. [Component API](#component-api)
2. [Simulation Engine API](#simulation-engine-api)
3. [Arduino Board API](#arduino-board-api)
4. [Canvas System API](#canvas-system-api)
5. [Project Management API](#project-management-api)
6. [Plugin Development](#plugin-development)
7. [Type Definitions](#type-definitions)

## Component API

### Base Component Class

All components in ElectroSim extend from the base `Component` class:

```typescript
abstract class Component {
  constructor(id: string, type: ComponentType, position: Point)
  
  // Core properties
  readonly id: string
  readonly type: ComponentType
  position: Point
  rotation: number
  selected: boolean
  
  // Pin management
  abstract getPins(): Pin[]
  getPin(name: string): Pin | undefined
  getPinPosition(pinName: string): Point
  
  // Electrical simulation
  abstract update(deltaTime: number): void
  abstract getElectricalModel(): ElectricalModel
  
  // Rendering
  abstract getRenderData(): ComponentRenderData
  abstract getBoundingBox(): BoundingBox
  
  // Validation
  abstract validate(): ValidationResult
  
  // Serialization
  toJSON(): ComponentData
  fromJSON(data: ComponentData): void
}
```

### Digital Component Class

Digital components extend `DigitalComponent` for simplified digital I/O:

```typescript
abstract class DigitalComponent extends Component {
  constructor(id: string, type: ComponentType, position: Point)
  
  // Digital I/O helpers
  setDigitalPin(pinName: string, state: boolean): void
  getDigitalPin(pinName: string): boolean
  
  // PWM support
  setPWMPin(pinName: string, value: number): void  // 0-255
  getPWMPin(pinName: string): number
  
  // Voltage calculations
  getVoltage(pinName: string): number
  getCurrent(pinName: string): number
  getPower(): number
}
```

### LED Component API

```typescript
class LEDComponent extends DigitalComponent {
  constructor(id: string, position: Point, properties?: LEDProperties)
  
  // Properties
  color: LEDColor
  forwardVoltage: number    // Typical: 1.8V-3.3V depending on color
  maxCurrent: number        // Typical: 20mA
  brightness: number        // 0.0-1.0 calculated from voltage
  
  // Pin configuration
  getPins(): Pin[] {
    return [
      { name: 'Anode', type: 'input', position: /* calculated */ },
      { name: 'Cathode', type: 'output', position: /* calculated */ }
    ]
  }
  
  // Electrical behavior
  update(deltaTime: number): void
  getElectricalModel(): ElectricalModel {
    return {
      type: 'diode',
      forwardVoltage: this.forwardVoltage,
      resistance: this.getResistance(),
      powerConsumption: this.getPower()
    }
  }
  
  // Rendering
  getRenderData(): ComponentRenderData {
    return {
      type: 'led',
      position: this.position,
      rotation: this.rotation,
      color: this.color,
      brightness: this.brightness,
      isOn: this.isOn(),
      pins: this.getPinRenderData()
    }
  }
}
```

### Resistor Component API

```typescript
class ResistorComponent extends DigitalComponent {
  constructor(id: string, position: Point, properties?: ResistorProperties)
  
  // Properties
  resistance: number        // In ohms
  tolerance: number         // Percentage (e.g., 5 for 5%)
  powerRating: number       // In watts (e.g., 0.25W)
  temperature: number       // Current temperature (affects resistance)
  
  // Pin configuration
  getPins(): Pin[] {
    return [
      { name: 'Pin1', type: 'bidirectional', position: /* calculated */ },
      { name: 'Pin2', type: 'bidirectional', position: /* calculated */ }
    ]
  }
  
  // Resistance calculation with temperature compensation
  getActualResistance(): number {
    const tempCoeff = 0.003 // Typical temperature coefficient
    return this.resistance * (1 + tempCoeff * (this.temperature - 20))
  }
  
  // Power calculations
  getPowerDissipation(): number {
    const voltage = this.getVoltageDrop()
    return (voltage * voltage) / this.getActualResistance()
  }
  
  // Color band calculation for visualization
  getColorBands(): ColorBand[] {
    return calculateResistorColorBands(this.resistance, this.tolerance)
  }
}
```

### Arduino Uno Board API

```typescript
class ArduinoUnoBoard extends Component {
  constructor(id: string, position: Point)
  
  // Pin management
  digitalPins: DigitalPin[]     // Pins 0-13
  analogPins: AnalogPin[]       // Pins A0-A5 (14-19)
  powerPins: PowerPin[]         // 5V, 3.3V, GND, VIN
  
  // Digital I/O
  pinMode(pin: number, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'): void
  digitalWrite(pin: number, value: 'HIGH' | 'LOW'): void
  digitalRead(pin: number): 'HIGH' | 'LOW'
  
  // Analog I/O
  analogRead(pin: number): number      // Returns 0-1023
  analogWrite(pin: number, value: number): void  // PWM: 0-255
  
  // PWM pins (3, 5, 6, 9, 10, 11)
  isPWMPin(pin: number): boolean
  getPWMFrequency(pin: number): number
  setPWMFrequency(pin: number, frequency: number): void
  
  // Serial communication
  serialBegin(baudRate: number): void
  serialPrint(data: string | number): void
  serialPrintln(data: string | number): void
  serialAvailable(): number
  serialRead(): number
  
  // Timing
  getCurrentTime(): number      // Returns millis() equivalent
  delay(ms: number): void       // Non-blocking simulation delay
  
  // Code execution
  loadSketch(code: string): boolean
  executeStep(): void
  reset(): void
  
  // Pin state monitoring
  getPinState(pin: number): PinState {
    return {
      pin: pin,
      mode: this.getPinMode(pin),
      value: this.getPinValue(pin),
      voltage: this.getPinVoltage(pin),
      current: this.getPinCurrent(pin)
    }
  }
  
  // Render data includes only I/O pins for connections
  getRenderData(): ComponentRenderData {
    return {
      type: 'arduino-uno',
      position: this.position,
      rotation: this.rotation,
      pins: this.getIOPinRenderData(), // Only pins 0-13, A0-A5
      powerIndicator: this.isPowered(),
      serialActivity: this.getSerialActivity()
    }
  }
}
```

## Simulation Engine API

### Circuit Solver

The simulation engine uses a circuit solver to calculate electrical behavior:

```typescript
interface CircuitSolver {
  // Add components to the circuit
  addComponent(component: Component): void
  removeComponent(componentId: string): void
  
  // Add connections between component pins
  addConnection(fromPin: PinReference, toPin: PinReference): void
  removeConnection(connectionId: string): void
  
  // Solve circuit equations
  solve(): CircuitSolution
  
  // Update simulation state
  update(deltaTime: number): void
  
  // Reset to initial state
  reset(): void
}

interface CircuitSolution {
  converged: boolean
  iterations: number
  nodeVoltages: Map<string, number>
  branchCurrents: Map<string, number>
  powerConsumption: number
  errors: string[]
}
```

### Simulation Manager

```typescript
class SimulationManager {
  constructor(circuit: Circuit, arduino: ArduinoUnoBoard)
  
  // Simulation control
  start(): void
  stop(): void
  pause(): void
  resume(): void
  step(): void               // Execute one simulation step
  reset(): void
  
  // State management
  isRunning(): boolean
  isPaused(): boolean
  getCurrentTime(): number    // Simulation time in milliseconds
  getStepCount(): number
  
  // Performance monitoring
  getPerformanceStats(): PerformanceStats {
    return {
      fps: number,
      stepTime: number,
      solverTime: number,
      renderTime: number,
      memoryUsage: number
    }
  }
  
  // Event handling
  on(event: 'stateChanged' | 'error' | 'step', callback: Function): void
  off(event: string, callback: Function): void
  
  // Advanced features
  setSimulationSpeed(multiplier: number): void  // 0.1x to 10x speed
  enableRealTime(enabled: boolean): void        // Sync to wall clock
}
```

## Canvas System API

### Circuit Canvas

```typescript
class CircuitCanvas {
  constructor(canvasElement: HTMLCanvasElement)
  
  // Viewport management
  setZoom(zoom: number): void          // 0.1x to 10x
  getZoom(): number
  pan(deltaX: number, deltaY: number): void
  resetView(): void
  fitToContent(): void
  
  // Coordinate transformation
  screenToWorld(screenPoint: Point): Point
  worldToScreen(worldPoint: Point): Point
  
  // Component management
  addComponent(component: Component): void
  removeComponent(componentId: string): void
  getComponentAt(worldPoint: Point): Component | undefined
  
  // Selection management
  selectComponent(componentId: string): void
  deselectAll(): void
  getSelectedComponents(): Component[]
  
  // Connection management
  startConnection(fromPin: PinReference): void
  completeConnection(toPin: PinReference): boolean
  deleteConnection(connectionId: string): void
  
  // Rendering
  render(): void
  setRenderMode(mode: 'normal' | 'electrical' | 'thermal'): void
  
  // Grid and guides
  setGridSize(size: number): void
  setSnapToGrid(enabled: boolean): void
  showGrid(visible: boolean): void
  
  // Event handling
  on(event: CanvasEvent, callback: Function): void
  
  // Export
  exportAsImage(format: 'png' | 'svg'): Blob
  exportAsPDF(): Blob
}

type CanvasEvent = 
  | 'componentAdded'
  | 'componentRemoved' 
  | 'componentSelected'
  | 'connectionCreated'
  | 'connectionDeleted'
  | 'viewChanged'
```

### Drawing Utilities

```typescript
namespace DrawingUtils {
  // Basic shapes
  function drawRect(ctx: CanvasRenderingContext2D, rect: Rectangle, style: DrawStyle): void
  function drawCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number, style: DrawStyle): void
  function drawLine(ctx: CanvasRenderingContext2D, from: Point, to: Point, style: LineStyle): void
  
  // Component-specific drawing
  function drawLED(ctx: CanvasRenderingContext2D, led: LEDComponent): void
  function drawResistor(ctx: CanvasRenderingContext2D, resistor: ResistorComponent): void
  function drawArduinoBoard(ctx: CanvasRenderingContext2D, arduino: ArduinoUnoBoard): void
  
  // Electrical visualization
  function drawCurrentFlow(ctx: CanvasRenderingContext2D, connection: Connection, current: number): void
  function drawVoltageLabel(ctx: CanvasRenderingContext2D, point: Point, voltage: number): void
  
  // Grid and guides
  function drawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport, gridSize: number): void
  function drawRulers(ctx: CanvasRenderingContext2D, viewport: Viewport): void
}
```

## Project Management API

### Project File Format

```typescript
interface ProjectData {
  version: string
  metadata: ProjectMetadata
  circuit: CircuitData
  code: CodeData
  simulation: SimulationSettings
}

interface ProjectMetadata {
  name: string
  description: string
  author: string
  created: Date
  modified: Date
  tags: string[]
  thumbnail?: string
}

interface CircuitData {
  components: ComponentData[]
  connections: ConnectionData[]
  canvas: CanvasSettings
}

interface CodeData {
  sketch: string
  libraries: LibraryReference[]
  compilerSettings: CompilerSettings
}
```

### Project Manager

```typescript
class ProjectManager {
  // File operations
  createNew(): Project
  open(filePath: string): Promise<Project>
  save(project: Project, filePath?: string): Promise<void>
  saveAs(project: Project, filePath: string): Promise<void>
  
  // Recent files
  getRecentProjects(): ProjectReference[]
  addToRecent(projectPath: string): void
  
  // Templates
  getTemplates(): Template[]
  createFromTemplate(templateId: string): Project
  
  // Export/Import
  exportToArduinoIDE(project: Project): ArduinoProject
  importFromArduinoIDE(projectPath: string): Project
  exportCircuitImage(project: Project, format: 'png' | 'svg' | 'pdf'): Blob
  
  // Validation
  validateProject(project: Project): ValidationResult[]
  
  // Auto-save
  enableAutoSave(interval: number): void
  disableAutoSave(): void
}
```

## Plugin Development

ElectroSim supports plugins to extend functionality:

### Plugin Interface

```typescript
interface Plugin {
  name: string
  version: string
  author: string
  description: string
  
  // Lifecycle hooks
  onLoad(context: PluginContext): void
  onUnload(): void
  
  // Component extensions
  registerComponents?(): ComponentDefinition[]
  
  // Menu extensions
  registerMenuItems?(): MenuItem[]
  
  // Tool extensions
  registerTools?(): Tool[]
  
  // File format extensions
  registerFileFormats?(): FileFormat[]
}

interface PluginContext {
  // Core APIs
  componentManager: ComponentManager
  simulationEngine: SimulationEngine
  canvasManager: CanvasManager
  projectManager: ProjectManager
  
  // UI APIs
  menuManager: MenuManager
  toolbarManager: ToolbarManager
  panelManager: PanelManager
  
  // Utility APIs
  mathUtils: MathUtils
  drawingUtils: DrawingUtils
  validationUtils: ValidationUtils
}
```

### Custom Component Development

```typescript
// Example: Creating a custom LCD display component
class LCDComponent extends DigitalComponent {
  constructor(id: string, position: Point) {
    super(id, 'lcd-display', position)
    this.rows = 2
    this.cols = 16
    this.displayText = Array(this.rows).fill('').map(() => ' '.repeat(this.cols))
  }
  
  // Define pins
  getPins(): Pin[] {
    return [
      { name: 'VSS', type: 'power' },      // Ground
      { name: 'VDD', type: 'power' },      // +5V
      { name: 'V0', type: 'input' },       // Contrast
      { name: 'RS', type: 'input' },       // Register Select
      { name: 'Enable', type: 'input' },   // Enable
      { name: 'D4', type: 'input' },       // Data bit 4
      { name: 'D5', type: 'input' },       // Data bit 5
      { name: 'D6', type: 'input' },       // Data bit 6
      { name: 'D7', type: 'input' },       // Data bit 7
      { name: 'A', type: 'power' },        // Backlight +
      { name: 'K', type: 'power' }         // Backlight -
    ]
  }
  
  // Implement LCD protocol
  update(deltaTime: number): void {
    if (this.getDigitalPin('Enable') && this.lastEnableState === false) {
      // Rising edge on Enable pin - latch data
      this.processCommand()
    }
    this.lastEnableState = this.getDigitalPin('Enable')
  }
  
  // Custom rendering
  getRenderData(): ComponentRenderData {
    return {
      type: 'lcd-display',
      position: this.position,
      rotation: this.rotation,
      displayText: this.displayText,
      backlight: this.getDigitalPin('A'),
      pins: this.getPinRenderData()
    }
  }
}

// Register the component
function registerLCDComponent(context: PluginContext) {
  context.componentManager.registerComponent({
    type: 'lcd-display',
    name: 'LCD Display',
    category: 'displays',
    constructor: LCDComponent,
    icon: 'lcd-icon.svg',
    defaultProperties: {
      rows: 2,
      cols: 16
    }
  })
}
```

## Type Definitions

### Core Types

```typescript
// Geometric types
interface Point {
  x: number
  y: number
}

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

interface BoundingBox extends Rectangle {}

// Component types
type ComponentType = 
  | 'led' 
  | 'resistor' 
  | 'capacitor' 
  | 'button' 
  | 'servo-motor' 
  | 'arduino-uno'

// Pin types
interface Pin {
  name: string
  type: 'input' | 'output' | 'bidirectional' | 'power'
  position: Point
  connected: boolean
  voltage?: number
  current?: number
}

interface PinReference {
  componentId: string
  pinName: string
}

// Connection types
interface Connection {
  id: string
  from: PinReference
  to: PinReference
  resistance: number
  current: number
}

// Electrical model types
interface ElectricalModel {
  type: 'resistor' | 'diode' | 'capacitor' | 'inductor' | 'voltage_source' | 'current_source'
  resistance?: number
  capacitance?: number
  inductance?: number
  voltage?: number
  current?: number
  forwardVoltage?: number
  powerConsumption: number
}

// Validation types
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

interface ValidationError {
  message: string
  severity: 'error' | 'warning' | 'info'
  component?: string
  pin?: string
}

// Rendering types
interface ComponentRenderData {
  type: string
  position: Point
  rotation: number
  selected?: boolean
  pins: PinRenderData[]
  [key: string]: any  // Component-specific data
}

interface PinRenderData {
  name: string
  position: Point
  connected: boolean
  voltage?: number
  current?: number
}

// Canvas types
interface CanvasSettings {
  zoom: number
  pan: Point
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  renderMode: 'normal' | 'electrical' | 'thermal'
}

interface Viewport {
  x: number
  y: number
  width: number
  height: number
  zoom: number
}

// Simulation types
interface SimulationSettings {
  timeStep: number      // In milliseconds
  realTime: boolean
  speedMultiplier: number
  maxIterations: number
  convergenceThreshold: number
}

interface PerformanceStats {
  fps: number
  stepTime: number      // Average time per simulation step (ms)
  solverTime: number    // Time spent in circuit solver (ms)
  renderTime: number    // Time spent rendering (ms)
  memoryUsage: number   // Memory usage in MB
  componentCount: number
  connectionCount: number
}
```

### Event Types

```typescript
// Component events
interface ComponentEvent {
  type: 'added' | 'removed' | 'updated' | 'selected' | 'deselected'
  component: Component
  timestamp: number
}

// Simulation events
interface SimulationEvent {
  type: 'started' | 'stopped' | 'paused' | 'resumed' | 'step' | 'reset'
  timestamp: number
  simulationTime: number
}

// Canvas events
interface CanvasEvent {
  type: 'click' | 'drag' | 'zoom' | 'pan'
  position: Point
  worldPosition: Point
  button?: number
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
  }
}

// Project events
interface ProjectEvent {
  type: 'created' | 'opened' | 'saved' | 'closed' | 'modified'
  project: Project
  filePath?: string
  timestamp: number
}
```

## Error Handling

ElectroSim uses a comprehensive error handling system:

```typescript
// Custom error types
class ComponentError extends Error {
  constructor(
    public component: Component,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ComponentError'
  }
}

class SimulationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public recoverable: boolean = true
  ) {
    super(message)
    this.name = 'SimulationError'
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public severity: 'error' | 'warning' | 'info' = 'error',
    public component?: string,
    public pin?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Error handling utilities
interface ErrorHandler {
  handleError(error: Error): void
  handleWarning(warning: string): void
  handleInfo(info: string): void
  
  // Error recovery
  canRecover(error: Error): boolean
  recover(error: Error): boolean
}
```

## Testing APIs

ElectroSim includes comprehensive testing utilities:

```typescript
// Test utilities for component development
namespace TestUtils {
  function createMockArduino(): ArduinoUnoBoard
  function createMockCircuit(): Circuit
  function simulateTimeStep(circuit: Circuit, deltaTime: number): void
  
  // Component testing
  function testComponentElectrical(component: Component, testCases: ElectricalTestCase[]): TestResult[]
  function testComponentRendering(component: Component): RenderTestResult
  function testComponentSerialization(component: Component): SerializationTestResult
  
  // Circuit testing
  function testCircuitSolution(circuit: Circuit, expectedValues: CircuitExpectation[]): TestResult[]
  function testSimulationStability(circuit: Circuit, duration: number): StabilityTestResult
}
```

---

This API documentation provides a comprehensive reference for developing with and extending ElectroSim. For implementation examples and tutorials, see the [Development Guide](DEVELOPMENT_GUIDE.md).