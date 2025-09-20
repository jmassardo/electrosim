# ElectroSim Development Guide

This guide provides comprehensive information for developers who want to contribute to ElectroSim, extend its functionality, or understand its architecture.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Environment Setup](#development-environment-setup)
4. [Building and Running](#building-and-running)
5. [Component Development](#component-development)
6. [Testing Guide](#testing-guide)
7. [Code Style and Standards](#code-style-and-standards)
8. [Contributing Guidelines](#contributing-guidelines)
9. [Release Process](#release-process)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Jest Runner (for testing)

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/jmassardo/electrosim.git
cd electrosim

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## Architecture Overview

ElectroSim follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Renderer      │  │   Main Process  │  │   Preload       │
│   (React UI)    │  │   (Electron)    │  │   (Bridge)      │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Canvas System │  │ • File System   │  │ • IPC Bridge    │
│ • Component Lib │  │ • Menu System   │  │ • Security      │
│ • Code Editor   │  │ • Auto Updater  │  │ • API Exposure  │
│ • UI Components │  │ • Window Mgmt   │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
        ┌─────────────────────────────────────────────────┐
        │            Simulation Engine                    │
        │ ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
        │ │ Components  │  │ Circuit     │  │ Arduino  │ │
        │ │ System      │  │ Solver      │  │ VM       │ │
        │ └─────────────┘  └─────────────┘  └──────────┘ │
        └─────────────────────────────────────────────────┘
```

### Key Modules

#### 1. Renderer Process (`src/renderer/`)
- **React Application**: Main UI built with React and Material-UI
- **Canvas System**: HTML5 Canvas-based circuit design interface
- **Component Library**: Drag-and-drop component palette
- **Code Editor**: Monaco-based Arduino IDE experience
- **State Management**: Redux store for application state

#### 2. Main Process (`src/main/`)
- **Electron Main**: Application lifecycle and window management
- **File System**: Project file operations and auto-save
- **Menu System**: Application menus and keyboard shortcuts
- **Auto Updater**: Automatic application updates

#### 3. Simulation Engine (`src/simulation/`)
- **Component System**: Base classes and component implementations
- **Circuit Solver**: Electrical circuit analysis engine
- **Arduino VM**: Virtual Arduino microcontroller
- **Board Implementations**: Arduino Uno and other board models

#### 4. Shared Types (`src/shared/`)
- **Type Definitions**: TypeScript interfaces and types
- **Utilities**: Common functions used across modules
- **Constants**: Application-wide constants and enums

## Development Environment Setup

### 1. IDE Configuration

#### VS Code Settings (`.vscode/settings.json`)
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.ts": "typescript",
    "*.tsx": "typescriptreact"
  },
  "jest.jestCommandLine": "npm test"
}
```

#### Recommended Extensions
- **ms-vscode.vscode-typescript-next**: Advanced TypeScript support
- **dbaeumer.vscode-eslint**: ESLint integration
- **esbenp.prettier-vscode**: Code formatting
- **orta.vscode-jest**: Jest test integration
- **ms-vscode.vscode-json**: JSON file support

### 2. Git Configuration

```bash
# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-push "npm test"

# Configure Git
git config --local core.autocrlf false  # Prevent line ending issues
git config --local pull.rebase true     # Use rebase for cleaner history
```

### 3. Environment Variables

Create a `.env` file in the project root:
```bash
NODE_ENV=development
ELECTRON_ENABLE_LOGGING=true
WEBPACK_DEV_SERVER_PORT=3000
```

## Building and Running

### Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Build all targets
npm run build

# Build specific targets
npm run build:main        # Main process
npm run build:renderer    # Renderer process
npm run build:preload     # Preload script
npm run build:cli         # CLI tools

# Clean build artifacts
npm run build:clean

# Start application (production build)
npm start
```

### Build System Architecture

ElectroSim uses Webpack 5 with separate configurations:

#### Main Process (`webpack.main.config.js`)
```javascript
module.exports = {
  target: 'electron-main',
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  // TypeScript compilation, source maps, etc.
}
```

#### Renderer Process (`webpack.renderer.config.js`)
```javascript
module.exports = {
  target: 'web',  // Simplified for compatibility
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'js/[name].[contenthash].js'
  },
  // React, Material-UI, Canvas API support
}
```

### Performance Optimization

#### Bundle Analysis
```bash
# Analyze bundle size
npx webpack-bundle-analyzer dist/renderer/js/main.*.js

# Check for duplicate dependencies
npx webpack --config webpack.renderer.config.js --json > stats.json
npx webpack-bundle-analyzer stats.json
```

#### Memory Profiling
```bash
# Enable memory profiling in development
NODE_OPTIONS="--max-old-space-size=4096 --inspect" npm run dev

# Use Chrome DevTools to profile memory usage
```

## Component Development

### Creating a New Component

#### 1. Component Class Implementation

```typescript
// src/simulation/components/NewComponent.ts
import { DigitalComponent } from './base/DigitalComponent'
import { Pin, ComponentRenderData, ValidationResult } from '@shared/types'

export class NewComponent extends DigitalComponent {
  // Component properties
  private customProperty: number = 100

  constructor(id: string, position: Point, properties?: Partial<NewComponentProperties>) {
    super(id, 'new-component', position)
    
    // Initialize properties
    if (properties?.customProperty) {
      this.customProperty = properties.customProperty
    }
    
    // Validate initial state
    const validation = this.validate()
    if (!validation.valid) {
      throw new ComponentError(this, `Invalid component configuration: ${validation.errors[0].message}`)
    }
  }

  // Define component pins
  getPins(): Pin[] {
    return [
      {
        name: 'Input',
        type: 'input',
        position: this.getRelativePinPosition('Input'),
        connected: false
      },
      {
        name: 'Output',
        type: 'output', 
        position: this.getRelativePinPosition('Output'),
        connected: false
      }
    ]
  }

  // Update component state each simulation step
  update(deltaTime: number): void {
    super.update(deltaTime)
    
    // Custom simulation logic
    const inputValue = this.getDigitalPin('Input')
    const outputValue = this.calculateOutput(inputValue)
    
    this.setDigitalPin('Output', outputValue)
    
    // Update internal state
    this.updateInternalState(deltaTime)
  }

  // Electrical model for circuit solver
  getElectricalModel(): ElectricalModel {
    return {
      type: 'resistor',  // or custom type
      resistance: this.customProperty,
      powerConsumption: this.getPower()
    }
  }

  // Rendering data for canvas
  getRenderData(): ComponentRenderData {
    return {
      type: 'new-component',
      position: this.position,
      rotation: this.rotation,
      selected: this.selected,
      customProperty: this.customProperty,
      pins: this.getPinRenderData(),
      // Add visual state
      active: this.getDigitalPin('Output'),
      color: this.getComponentColor()
    }
  }

  // Validation logic
  validate(): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate properties
    if (this.customProperty < 0) {
      errors.push({
        message: 'Custom property must be positive',
        severity: 'error',
        component: this.id
      })
    }

    // Validate connections
    if (!this.getPin('Input')?.connected) {
      warnings.push({
        message: 'Input pin is not connected',
        severity: 'warning',
        component: this.id,
        pin: 'Input'
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Serialization support
  toJSON(): ComponentData {
    return {
      ...super.toJSON(),
      properties: {
        customProperty: this.customProperty
      }
    }
  }

  fromJSON(data: ComponentData): void {
    super.fromJSON(data)
    if (data.properties?.customProperty) {
      this.customProperty = data.properties.customProperty
    }
  }

  // Private helper methods
  private calculateOutput(input: boolean): boolean {
    // Custom logic here
    return !input  // Example: NOT gate
  }

  private updateInternalState(deltaTime: number): void {
    // Update any time-dependent internal state
  }

  private getComponentColor(): string {
    return this.getDigitalPin('Output') ? '#00ff00' : '#cccccc'
  }
}
```

#### 2. Component Registration

```typescript
// src/simulation/components/index.ts
export { NewComponent } from './NewComponent'

// Add to component factory
export const createComponent = (type: ComponentType, id: string, position: Point, properties?: any): Component => {
  switch (type) {
    case 'new-component':
      return new NewComponent(id, position, properties)
    // ... other cases
    default:
      throw new Error(`Unknown component type: ${type}`)
  }
}
```

#### 3. Canvas Rendering

```typescript
// src/renderer/components/canvas/renderers/NewComponentRenderer.ts
export class NewComponentRenderer {
  static render(ctx: CanvasRenderingContext2D, renderData: ComponentRenderData): void {
    const { position, rotation, customProperty, active, color, pins } = renderData
    
    ctx.save()
    ctx.translate(position.x, position.y)
    ctx.rotate(rotation * Math.PI / 180)
    
    // Draw component body
    ctx.fillStyle = color
    ctx.fillRect(-20, -10, 40, 20)
    
    // Draw component label
    ctx.fillStyle = '#000'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${customProperty}`, 0, 0)
    
    // Draw activity indicator
    if (active) {
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(15, -5, 3, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    ctx.restore()
    
    // Draw pins
    pins.forEach(pin => {
      PinRenderer.render(ctx, pin)
    })
  }
}
```

#### 4. Component Library Integration

```typescript
// src/renderer/components/ComponentLibrary.tsx
const componentDefinitions: ComponentDefinition[] = [
  {
    type: 'new-component',
    name: 'New Component',
    category: 'Custom',
    icon: NewComponentIcon,
    description: 'A custom component example',
    defaultProperties: {
      customProperty: 100
    },
    createComponent: (id: string, position: Point) => new NewComponent(id, position)
  },
  // ... other components
]
```

### Testing Components

#### Unit Tests

```typescript
// src/renderer/tests/unit/NewComponent.test.ts
import { NewComponent } from '@simulation/components/NewComponent'
import { Point } from '@shared/types'

describe('NewComponent', () => {
  let component: NewComponent

  beforeEach(() => {
    component = new NewComponent('test-new-component', { x: 0, y: 0 })
  })

  afterEach(() => {
    component = null as any
  })

  describe('Constructor', () => {
    it('should create component with default properties', () => {
      expect(component.id).toBe('test-new-component')
      expect(component.type).toBe('new-component')
      expect(component.position).toEqual({ x: 0, y: 0 })
    })

    it('should create component with custom properties', () => {
      const customComponent = new NewComponent('test', { x: 0, y: 0 }, { 
        customProperty: 200 
      })
      expect(customComponent.customProperty).toBe(200)
    })
  })

  describe('Pin Management', () => {
    it('should have correct pins', () => {
      const pins = component.getPins()
      expect(pins).toHaveLength(2)
      expect(pins[0].name).toBe('Input')
      expect(pins[1].name).toBe('Output')
    })

    it('should get pin by name', () => {
      const inputPin = component.getPin('Input')
      expect(inputPin).toBeDefined()
      expect(inputPin!.name).toBe('Input')
    })
  })

  describe('Electrical Behavior', () => {
    it('should update output based on input', () => {
      // Set input HIGH
      component.setDigitalPin('Input', true)
      component.update(16.67) // ~60fps
      
      // Output should be LOW (NOT gate behavior)
      expect(component.getDigitalPin('Output')).toBe(false)
    })

    it('should provide electrical model', () => {
      const model = component.getElectricalModel()
      expect(model.type).toBe('resistor')
      expect(model.resistance).toBeGreaterThan(0)
    })
  })

  describe('Validation', () => {
    it('should validate successfully with default properties', () => {
      const result = component.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should warn about unconnected pins', () => {
      const result = component.validate()
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0].message).toContain('not connected')
    })
  })

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const json = component.toJSON()
      expect(json.type).toBe('new-component')
      expect(json.properties.customProperty).toBe(100)
    })

    it('should deserialize from JSON', () => {
      const json = {
        id: 'test',
        type: 'new-component',
        position: { x: 10, y: 20 },
        rotation: 90,
        properties: { customProperty: 300 }
      }
      
      component.fromJSON(json)
      expect(component.position).toEqual({ x: 10, y: 20 })
      expect(component.rotation).toBe(90)
      expect(component.customProperty).toBe(300)
    })
  })

  describe('Rendering', () => {
    it('should provide render data', () => {
      const renderData = component.getRenderData()
      expect(renderData.type).toBe('new-component')
      expect(renderData.position).toEqual({ x: 0, y: 0 })
      expect(renderData.pins).toHaveLength(2)
    })
  })
})
```

#### Integration Tests

```typescript
// src/renderer/tests/integration/NewComponentIntegration.test.ts
import { ArduinoUnoBoard } from '@simulation/boards/ArduinoUno'
import { NewComponent } from '@simulation/components/NewComponent'
import { CircuitSolver } from '@simulation/core/CircuitSolver'

describe('NewComponent Integration', () => {
  let arduino: ArduinoUnoBoard
  let component: NewComponent
  let circuit: CircuitSolver

  beforeEach(() => {
    arduino = new ArduinoUnoBoard('arduino', { x: 0, y: 0 })
    component = new NewComponent('component', { x: 100, y: 0 })
    circuit = new CircuitSolver()
    
    circuit.addComponent(arduino)
    circuit.addComponent(component)
  })

  it('should integrate with Arduino board', () => {
    // Connect Arduino pin 2 to component input
    circuit.addConnection(
      { componentId: 'arduino', pinName: '2' },
      { componentId: 'component', pinName: 'Input' }
    )

    // Set Arduino pin 2 HIGH
    arduino.digitalWrite(2, 'HIGH')
    
    // Update simulation
    circuit.update(16.67)
    
    // Component should respond
    expect(component.getDigitalPin('Input')).toBe(true)
    expect(component.getDigitalPin('Output')).toBe(false)
  })

  it('should work in complete circuit', () => {
    // Create a feedback loop: Arduino -> Component -> Arduino
    circuit.addConnection(
      { componentId: 'arduino', pinName: '2' },
      { componentId: 'component', pinName: 'Input' }
    )
    circuit.addConnection(
      { componentId: 'component', pinName: 'Output' },
      { componentId: 'arduino', pinName: '3' }
    )

    // Load test sketch
    const sketch = `
      void setup() {
        pinMode(2, OUTPUT);
        pinMode(3, INPUT);
      }
      void loop() {
        digitalWrite(2, HIGH);
        delay(100);
        bool feedback = digitalRead(3);
        // Component inverts signal, so feedback should be LOW
      }
    `
    arduino.loadSketch(sketch)

    // Run simulation steps
    for (let i = 0; i < 100; i++) {
      arduino.executeStep()
      circuit.update(16.67)
    }

    // Verify circuit behavior
    expect(arduino.digitalRead(3)).toBe('LOW')
  })
})
```

## Testing Guide

### Test Structure

ElectroSim uses Jest for testing with the following structure:

```
tests/
├── setup.ts                    # Test configuration
├── App.test.tsx               # Main app tests
└── src/renderer/tests/
    ├── unit/                  # Component unit tests
    │   ├── LEDComponent.test.ts
    │   ├── ArduinoUno.test.ts
    │   └── NewComponent.test.ts
    ├── integration/           # Integration tests
    │   └── SimulationIntegration.test.ts
    └── e2e/                   # End-to-end tests
        └── UserWorkflows.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern="LEDComponent"

# Run tests with coverage
npm run test:coverage

# Run tests with verbose output
npm test -- --verbose
```

### Test Categories

#### 1. Unit Tests
Test individual components in isolation:

```typescript
describe('Component Unit Tests', () => {
  it('should test component constructor')
  it('should test pin management')
  it('should test electrical behavior')
  it('should test validation')
  it('should test serialization')
  it('should test rendering data')
})
```

#### 2. Integration Tests
Test component interactions and circuit behavior:

```typescript
describe('Integration Tests', () => {
  it('should test component-to-component communication')
  it('should test Arduino-component integration')
  it('should test complete circuit simulation')
  it('should test PWM and analog behaviors')
})
```

#### 3. Performance Tests
Test simulation performance and memory usage:

```typescript
describe('Performance Tests', () => {
  it('should complete simulation step within time limit')
  it('should handle large circuits efficiently')
  it('should not leak memory during long simulations')
})
```

### Mock Objects and Utilities

```typescript
// tests/mocks/MockArduino.ts
export class MockArduino extends ArduinoUnoBoard {
  private mockTime = 0
  
  getCurrentTime(): number {
    return this.mockTime
  }
  
  setMockTime(time: number): void {
    this.mockTime = time
  }
  
  simulateTimeStep(deltaTime: number): void {
    this.mockTime += deltaTime
    this.executeStep()
  }
}

// tests/utils/TestUtils.ts
export namespace TestUtils {
  export function createTestCircuit(): CircuitSolver {
    const circuit = new CircuitSolver()
    // Add common test setup
    return circuit
  }
  
  export function simulateFor(circuit: CircuitSolver, duration: number, stepSize = 16.67): void {
    const steps = Math.ceil(duration / stepSize)
    for (let i = 0; i < steps; i++) {
      circuit.update(stepSize)
    }
  }
  
  export function expectElectricalValues(
    component: Component, 
    pin: string, 
    expectedVoltage: number, 
    tolerance = 0.1
  ): void {
    const actualVoltage = component.getPin(pin)?.voltage || 0
    expect(actualVoltage).toBeCloseTo(expectedVoltage, tolerance)
  }
}
```

## Code Style and Standards

### TypeScript Standards

#### Type Safety
- Use strict TypeScript configuration
- Avoid `any` type; use proper type annotations
- Use union types and type guards for type safety
- Define interfaces for all data structures

```typescript
// Good
interface ComponentProperties {
  resistance?: number
  tolerance?: number
  powerRating?: number
}

function createResistor(props: ComponentProperties): ResistorComponent {
  return new ResistorComponent('id', { x: 0, y: 0 }, props)
}

// Bad
function createResistor(props: any): any {
  return new ResistorComponent('id', { x: 0, y: 0 }, props)
}
```

#### Error Handling
```typescript
// Use custom error types
class ComponentValidationError extends Error {
  constructor(
    public component: Component,
    message: string,
    public validationErrors: ValidationError[]
  ) {
    super(message)
    this.name = 'ComponentValidationError'
  }
}

// Handle errors gracefully
try {
  const component = createComponent(type, id, position, properties)
  circuit.addComponent(component)
} catch (error) {
  if (error instanceof ComponentValidationError) {
    showValidationErrors(error.validationErrors)
  } else {
    logger.error('Unexpected error creating component:', error)
    showGenericError('Failed to create component')
  }
}
```

### ESLint Configuration

Key ESLint rules enforced in the project:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    
    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    
    // General
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    
    // Imports
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always'
    }]
  }
}
```

### Code Formatting

Prettier configuration (`.prettierrc`):

```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Documentation Standards

#### JSDoc Comments
```typescript
/**
 * Calculates the resistance of a resistor based on temperature
 * @param baseResistance - The resistance at 20°C in ohms
 * @param temperature - The current temperature in Celsius
 * @param tempCoeff - Temperature coefficient (default: 0.003)
 * @returns The adjusted resistance in ohms
 * @throws {Error} When temperature is below absolute zero
 */
function calculateTemperatureResistance(
  baseResistance: number,
  temperature: number,
  tempCoeff: number = 0.003
): number {
  if (temperature < -273.15) {
    throw new Error('Temperature cannot be below absolute zero')
  }
  return baseResistance * (1 + tempCoeff * (temperature - 20))
}
```

#### README Documentation
- Clear installation instructions
- Usage examples with code snippets
- API documentation links
- Contribution guidelines
- License information

## Contributing Guidelines

### Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/electrosim.git
   cd electrosim
   git remote add upstream https://github.com/jmassardo/electrosim.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-component-name
   ```

3. **Make Changes**
   - Follow code style guidelines
   - Add comprehensive tests
   - Update documentation
   - Ensure all tests pass

4. **Submit Pull Request**
   - Write clear commit messages
   - Include detailed PR description
   - Reference related issues
   - Request appropriate reviewers

### Commit Message Format

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```bash
feat(components): add LCD display component with I2C support

- Implement 16x2 and 20x4 LCD variants
- Add I2C communication protocol
- Include character set mapping
- Add comprehensive unit tests

Closes #123
```

### Pull Request Process

1. **Pre-submission Checklist**
   - [ ] All tests pass (`npm test`)
   - [ ] Code follows style guidelines (`npm run lint`)
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated
   - [ ] No console.log statements in production code

2. **Review Process**
   - Automatic CI checks must pass
   - At least one maintainer approval required
   - All feedback addressed
   - Conflicts resolved

3. **Merge Requirements**
   - Squash commits for clean history
   - Update version numbers if needed
   - Tag releases appropriately

### Issue Templates

#### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10, macOS 11.6, Ubuntu 20.04]
- ElectroSim Version: [e.g. 1.2.3]
- Node.js Version: [e.g. 18.15.0]

**Additional context**
Any other context about the problem.
```

#### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots about the feature request.
```

## Release Process

### Version Management

ElectroSim follows semantic versioning (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Workflow

1. **Prepare Release**
   ```bash
   # Update version number
   npm version minor  # or major/patch
   
   # Update CHANGELOG.md
   # Update documentation
   # Run full test suite
   npm test
   ```

2. **Build and Package**
   ```bash
   # Clean build
   npm run build:clean
   npm run build
   
   # Package for all platforms
   npm run package
   ```

3. **Create Release**
   ```bash
   # Tag and push
   git push origin main --tags
   
   # Create GitHub release with artifacts
   # Update documentation website
   ```

### Continuous Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run lint
    - run: npm run type-check
    - run: npm test -- --coverage
    - run: npm run build
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18.x
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm run package
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: electrosim-${{ matrix.os }}
        path: release/
```

## Troubleshooting

### Common Development Issues

#### Build Failures

**Webpack compilation errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear webpack cache
rm -rf .webpack_cache
npm run build:clean
npm run build
```

**TypeScript errors:**
```bash
# Check TypeScript configuration
npx tsc --noEmit --listFiles

# Verify all dependencies have types
npm install @types/node @types/react @types/jest --save-dev
```

#### Test Failures

**Jest configuration issues:**
```bash
# Clear Jest cache
npx jest --clearCache

# Run with verbose logging
npm test -- --verbose --no-cache
```

**Electron testing issues:**
```bash
# Install electron in devDependencies
npm install electron --save-dev

# Use proper test environment
export NODE_ENV=test
npm test
```

#### Performance Issues

**Slow compilation:**
```bash
# Enable webpack cache
export WEBPACK_CACHE=filesystem

# Use TypeScript incremental compilation
# Add to tsconfig.json: "incremental": true
```

**Memory issues during development:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

### Debugging Techniques

#### VS Code Debugging

Launch configuration (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": ["dist/main/index.js", "--debug"],
      "outputCapture": "std"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Electron DevTools

```typescript
// Enable DevTools in development
if (process.env.NODE_ENV === 'development') {
  // Install React DevTools
  app.whenReady().then(() => {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension: ${name}`))
      .catch((err) => console.log('An error occurred: ', err))
  })
  
  // Open DevTools automatically
  mainWindow.webContents.openDevTools()
}
```

#### Logging and Monitoring

```typescript
// Use structured logging
import { createLogger } from '@shared/utils/logger'

const logger = createLogger('ComponentSystem')

logger.info('Component created', { 
  componentId: component.id, 
  componentType: component.type 
})

logger.error('Validation failed', { 
  componentId: component.id, 
  errors: validationResult.errors 
})
```

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Discord Community**: Real-time chat and support
- **Documentation**: Comprehensive guides and API reference
- **Stack Overflow**: Tag questions with `electrosim`

---

This development guide provides everything you need to contribute to ElectroSim successfully. For additional help, don't hesitate to reach out to the community!

Happy Coding! 🚀