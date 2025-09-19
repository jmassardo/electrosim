# Simudino Project Structure

## Root Directory Structure

```
simudino/
├── README.md                     # Project overview and setup instructions
├── LICENSE                       # MIT license
├── package.json                  # Node.js dependencies and scripts
├── package-lock.json            # Dependency lock file
├── tsconfig.json                # TypeScript configuration
├── webpack.config.js            # Webpack build configuration
├── electron-builder.config.js   # Application packaging config
├── jest.config.js               # Testing framework configuration
├── .eslintrc.js                 # ESLint code quality rules
├── .prettierrc                  # Code formatting rules
├── .gitignore                   # Version control ignore patterns
├── .github/                     # GitHub workflows and templates
│   ├── workflows/
│   │   ├── ci.yml              # Continuous integration
│   │   ├── release.yml         # Release automation
│   │   └── test.yml            # Automated testing
│   └── ISSUE_TEMPLATE/         # Issue templates
├── docs/                       # Project documentation
│   ├── API.md                  # API documentation
│   ├── ARCHITECTURE.md         # Technical architecture
│   ├── CONTRIBUTING.md         # Contributor guidelines
│   └── USER_GUIDE.md          # User manual
├── src/                        # Source code
├── assets/                     # Static assets
├── dist/                       # Built application (gitignored)
├── build/                      # Build artifacts (gitignored)
├── tests/                      # Test files
├── scripts/                    # Build and deployment scripts
└── examples/                   # Example projects and tutorials
```

## Source Code Structure (`src/`)

```
src/
├── main/                       # Electron main process
│   ├── index.ts               # Main entry point
│   ├── menu.ts                # Application menus
│   ├── window.ts              # Window management
│   ├── file-system.ts         # File operations
│   ├── auto-updater.ts        # Update management
│   └── security.ts            # Security policies
├── cli/                        # Headless/CLI mode
│   ├── index.ts               # CLI entry point
│   ├── commands/              # CLI command implementations
│   ├── test-runner.ts         # Test execution engine
│   ├── config-loader.ts       # Configuration management
│   └── reporters/             # Test result reporters
├── renderer/                   # Electron renderer process
│   ├── index.html             # Main HTML template
│   ├── index.ts               # Renderer entry point
│   ├── App.tsx                # Root React component
│   ├── components/            # React UI components
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # State management
│   ├── utils/                 # Utility functions
│   └── styles/                # CSS/SCSS styles
├── simulation/                 # Simulation engine
│   ├── core/                  # Core simulation logic
│   ├── components/            # Electronic component models
│   ├── boards/                # Arduino board definitions
│   ├── emulator/              # AVR processor emulation
│   ├── compiler/              # Arduino code compilation
│   └── protocols/             # Communication protocols
├── shared/                     # Shared code between processes
│   ├── types/                 # TypeScript type definitions
│   ├── constants/             # Application constants
│   ├── interfaces/            # Interface definitions
│   └── utils/                 # Shared utility functions
└── preload/                    # Electron preload scripts
    └── index.ts               # Main preload script
```

## Detailed Component Structure

### Renderer Components (`src/renderer/components/`)

```
components/
├── App.tsx                     # Root application component
├── Layout/                     # Application layout components
│   ├── Header.tsx             # Top navigation bar
│   ├── Sidebar.tsx            # Side panel container
│   ├── Footer.tsx             # Status bar
│   └── MainContent.tsx        # Central workspace area
├── Workspace/                  # Main workspace components
│   ├── WorkspaceManager.tsx   # Workspace orchestrator
│   ├── CircuitCanvas.tsx      # Circuit design canvas
│   ├── ComponentPalette.tsx   # Draggable component library
│   ├── PropertiesPanel.tsx    # Component configuration
│   └── ZoomControls.tsx       # Canvas zoom/pan controls
├── CodeEditor/                 # Code editing components
│   ├── EditorContainer.tsx    # Editor wrapper
│   ├── SyntaxHighlighter.tsx  # Arduino syntax highlighting
│   ├── AutoComplete.tsx       # Code completion
│   ├── ErrorDisplay.tsx       # Compilation errors
│   └── SerialMonitor.tsx      # Serial communication
├── Simulation/                 # Simulation control components
│   ├── SimulationControls.tsx # Play/pause/stop controls
│   ├── SimulationStatus.tsx   # Current simulation state
│   ├── DebugPanel.tsx         # Debugging interface
│   ├── VariableInspector.tsx  # Variable monitoring
│   └── VirtualPortPanel.tsx   # Virtual COM port management
├── Projects/                   # Project management components
│   ├── ProjectExplorer.tsx    # File tree navigation
│   ├── ProjectSettings.tsx    # Project configuration
│   ├── SaveDialog.tsx         # Save project dialog
│   └── LoadDialog.tsx         # Load project dialog
├── Components/                 # Electronic component UI
│   ├── BaseComponent.tsx      # Base component wrapper
│   ├── ArduinoBoard.tsx       # Arduino board rendering
│   ├── LED.tsx                # LED component
│   ├── Resistor.tsx           # Resistor component
│   ├── Switch.tsx             # Switch component
│   └── Sensor.tsx             # Sensor component base
├── Tools/                      # Tool components
│   ├── Oscilloscope.tsx       # Signal visualization
│   ├── Multimeter.tsx         # Virtual multimeter
│   ├── LogicAnalyzer.tsx      # Digital signal analysis
│   └── FunctionGenerator.tsx  # Signal generation
├── Dialogs/                    # Modal dialogs
│   ├── AboutDialog.tsx        # About application
│   ├── SettingsDialog.tsx     # Application settings
│   ├── ComponentDialog.tsx    # Component configuration
│   └── HelpDialog.tsx         # Help and tutorials
└── Common/                     # Reusable UI components
    ├── Button.tsx             # Custom button component
    ├── Input.tsx              # Form input component
    ├── Modal.tsx              # Modal wrapper
    ├── Tooltip.tsx            # Tooltip component
    └── LoadingSpinner.tsx     # Loading indicator
```

### Simulation Engine (`src/simulation/`)

```
simulation/
├── core/                       # Core simulation engine
│   ├── SimulationEngine.ts    # Main simulation orchestrator
│   ├── Clock.ts               # Simulation timing controller
│   ├── EventQueue.ts          # Event scheduling system
│   ├── StateManager.ts        # Simulation state management
│   └── PhysicsEngine.ts       # Basic physics calculations
├── components/                 # Electronic component models
│   ├── base/                  # Base component classes
│   │   ├── Component.ts       # Abstract component class
│   │   ├── DigitalComponent.ts # Digital I/O base
│   │   ├── AnalogComponent.ts  # Analog I/O base
│   │   └── SensorComponent.ts  # Sensor base class
│   ├── passive/               # Passive components
│   │   ├── Resistor.ts        # Resistor implementation
│   │   ├── Capacitor.ts       # Capacitor implementation
│   │   ├── Inductor.ts        # Inductor implementation
│   │   └── Potentiometer.ts   # Variable resistor
│   ├── active/                # Active components
│   │   ├── LED.ts             # Light emitting diode
│   │   ├── Transistor.ts      # BJT and MOSFET
│   │   ├── Diode.ts           # Standard diode
│   │   └── OpAmp.ts           # Operational amplifier
│   ├── sensors/               # Sensor components
│   │   ├── TemperatureSensor.ts # DHT22, DS18B20
│   │   ├── LightSensor.ts     # LDR, photodiode
│   │   ├── MotionSensor.ts    # PIR sensor
│   │   └── DistanceSensor.ts  # Ultrasonic sensor
│   ├── actuators/             # Actuator components
│   │   ├── ServoMotor.ts      # Servo motor control
│   │   ├── StepperMotor.ts    # Stepper motor
│   │   ├── DCMotor.ts         # DC motor with H-bridge
│   │   └── Relay.ts           # Electrical relay
│   ├── displays/              # Display components
│   │   ├── SevenSegment.ts    # 7-segment display
│   │   ├── LCDDisplay.ts      # Character LCD
│   │   ├── LEDMatrix.ts       # LED matrix display
│   │   └── OLEDDisplay.ts     # OLED display
│   └── interfaces/            # Input/output interfaces
│       ├── Switch.ts          # Push button, toggle
│       ├── Keypad.ts          # Matrix keypad
│       └── Encoder.ts         # Rotary encoder
├── boards/                     # Arduino board definitions
│   ├── ArduinoBoard.ts        # Base Arduino board class
│   ├── ArduinoUno.ts          # Arduino Uno R3
│   ├── ArduinoNano.ts         # Arduino Nano
│   ├── ArduinoMega.ts         # Arduino Mega 2560
│   └── ArduinoLeonardo.ts     # Arduino Leonardo
├── emulator/                   # AVR processor emulation
│   ├── AVRProcessor.ts        # Main AVR emulator wrapper
│   ├── Memory.ts              # Flash/SRAM/EEPROM memory
│   ├── Registers.ts           # CPU register management
│   ├── Instructions.ts        # AVR instruction set
│   ├── Peripherals.ts         # Timer, UART, ADC, etc.
│   └── Interrupts.ts          # Interrupt handling
├── compiler/                   # Arduino code compilation
│   ├── ArduinoCompiler.ts     # Compilation orchestrator
│   ├── Preprocessor.ts        # C preprocessor
│   ├── Parser.ts              # C++ syntax parsing
│   ├── Linker.ts              # Object code linking
│   └── Libraries.ts           # Arduino library support
├── protocols/                  # Communication protocols
│   ├── UART.ts                # Serial communication
│   ├── I2C.ts                 # I2C bus protocol
│   ├── SPI.ts                 # SPI protocol
│   └── OneWire.ts             # One-wire protocol
├── virtual-port/               # Virtual serial port system
│   ├── VirtualSerialPort.ts   # Main virtual port interface
│   ├── WindowsComPort.ts      # Windows COM port implementation
│   ├── UnixPtyPort.ts         # macOS/Linux pty implementation
│   ├── PortManager.ts         # Port lifecycle management
│   └── SerialBridge.ts        # Arduino UART to system port bridge
└── utils/                      # Simulation utilities
    ├── MathUtils.ts           # Mathematical calculations
    ├── SignalProcessing.ts    # Signal analysis
    ├── DataLogger.ts          # Simulation data logging
    └── PerformanceMonitor.ts  # Performance profiling
```

### State Management (`src/renderer/store/`)

```
store/
├── index.ts                    # Store configuration and root reducer
├── slices/                     # Redux Toolkit slices
│   ├── workspaceSlice.ts      # Workspace state management
│   ├── simulationSlice.ts     # Simulation state
│   ├── projectSlice.ts        # Project management
│   ├── componentsSlice.ts     # Component library state
│   ├── editorSlice.ts         # Code editor state
│   └── uiSlice.ts             # UI state (panels, dialogs)
├── middleware/                 # Custom Redux middleware
│   ├── simulationMiddleware.ts # Simulation event handling
│   ├── persistMiddleware.ts   # State persistence
│   └── undoMiddleware.ts      # Undo/redo functionality
└── selectors/                  # Memoized state selectors
    ├── workspaceSelectors.ts  # Workspace-related selectors
    ├── simulationSelectors.ts # Simulation state selectors
    └── componentSelectors.ts  # Component state selectors
```

### Testing Structure (`tests/`)

```
tests/
├── unit/                       # Unit tests
│   ├── components/            # Component unit tests
│   ├── simulation/            # Simulation logic tests
│   ├── utils/                 # Utility function tests
│   └── store/                 # State management tests
├── integration/                # Integration tests
│   ├── simulation-flow/       # End-to-end simulation tests
│   ├── ui-interactions/       # UI interaction tests
│   └── file-operations/       # File I/O tests
├── e2e/                        # End-to-end tests
│   ├── basic-circuit/         # Basic circuit creation tests
│   ├── code-compilation/      # Code compilation tests
│   └── project-management/    # Project save/load tests
├── fixtures/                   # Test data and fixtures
│   ├── circuits/              # Sample circuit files
│   ├── sketches/              # Sample Arduino sketches
│   └── projects/              # Complete test projects
└── helpers/                    # Test utilities
    ├── mockComponents.ts      # Mock component implementations
    ├── simulationHelpers.ts   # Simulation test utilities
    └── testRenderer.ts        # React testing utilities
```

### Asset Organization (`assets/`)

```
assets/
├── icons/                      # Application icons
│   ├── components/            # Electronic component icons
│   ├── tools/                 # Tool icons
│   └── app/                   # Application icons (various sizes)
├── images/                     # Static images
│   ├── boards/                # Arduino board images
│   ├── tutorials/             # Tutorial screenshots
│   └── splash/                # Splash screen images
├── fonts/                      # Custom fonts
├── audio/                      # Sound effects
├── models/                     # 3D models (future use)
└── themes/                     # UI themes and styling
    ├── default/               # Default theme
    ├── dark/                  # Dark theme
    └── high-contrast/         # Accessibility theme
```

### Build Scripts (`scripts/`)

```
scripts/
├── build.js                    # Production build script
├── dev.js                      # Development server script
├── test.js                     # Test runner script
├── package.js                  # Application packaging script
├── release.js                  # Release preparation script
├── clean.js                    # Build cleanup script
├── copy-assets.js              # Asset copying script
└── version-bump.js             # Version management script
```

## Configuration Files

### Package.json Structure
```json
{
  "name": "simudino",
  "version": "1.0.0",
  "description": "Cross-platform Arduino simulator",
  "main": "dist/main/index.js",
  "bin": {
    "simudino": "dist/cli/index.js",
    "simudino-headless": "dist/cli/index.js"
  },
  "scripts": {
    "dev": "node scripts/dev.js",
    "build": "node scripts/build.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "package": "electron-builder",
    "release": "node scripts/release.js",
    "cli:test": "node dist/cli/index.js test",
    "cli:run": "node dist/cli/index.js run"
  },
  "dependencies": {
    "@reduxjs/toolkit": "^1.9.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-redux": "^8.0.0",
    "react-dnd": "^16.0.0",
    "monaco-editor": "^0.34.0",
    "avr8js": "^0.23.0",
    "konva": "^8.4.0",
    "react-konva": "^18.2.0"
  },
  "devDependencies": {
    "electron": "^22.0.0",
    "electron-builder": "^23.6.0",
    "webpack": "^5.75.0",
    "typescript": "^4.9.0",
    "@types/react": "^18.0.0",
    "jest": "^29.3.0",
    "eslint": "^8.30.0",
    "prettier": "^2.8.0"
  }
}
```

### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "declaration": true,
    "outDir": "./dist",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["renderer/components/*"],
      "@simulation/*": ["simulation/*"],
      "@shared/*": ["shared/*"],
      "@utils/*": ["shared/utils/*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build",
    "tests"
  ]
}
```

This project structure provides a solid foundation for building Simudino with clear separation of concerns, scalable architecture, and comprehensive testing support.