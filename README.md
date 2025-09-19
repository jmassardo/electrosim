# 🔌 ElectroSim - Arduino Circuit Simulator

ElectroSim is a cross-platform Arduino simulator with drag-and-drop circuit design, real-time simulation, and headless testing capabilities. Built with Electron, React, and TypeScript for optimal performance and developer experience.

## ✨ Features

- **🎨 Visual Circuit Design**: Drag-and-drop interface for creating Arduino circuits
- **⚡ Real-time Simulation**: Execute Arduino sketches with accurate timing
- **🔧 Component Library**: Comprehensive electronic components (LEDs, resistors, sensors, etc.)
- **📱 Arduino Boards**: Support for Arduino Uno, Nano, Mega, and more
- **🔌 Virtual Serial Port**: Serial communication simulation and monitoring
- **🧪 Headless Testing**: Automated testing for CI/CD pipelines
- **📊 Debugging Tools**: Variable watching, breakpoints, and step execution
- **💾 Project Management**: Save, load, and share circuit projects

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/jmassardo/electrosim.git
cd electrosim

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## 🛠️ Development Setup

### Development Environment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Type Check**
   ```bash
   npm run type-check
   ```

3. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

4. **Lint Code**
   ```bash
   npm run lint
   npm run lint:fix
   ```

5. **Format Code**
   ```bash
   npm run format
   npm run format:check
   ```

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with hot reload |
| `npm run build` | Build all components for production |
| `npm run test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Check code quality with ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm start` | Start built application |
| `npm run package` | Package for distribution |

### Build System

ElectroSim uses Webpack with separate configurations for different processes:

- **Main Process** (`webpack.main.config.js`): Electron main process
- **Renderer Process** (`webpack.renderer.config.js`): React UI
- **Preload Scripts** (`webpack.preload.config.js`): Secure IPC bridge
- **CLI Tools** (`webpack.cli.config.js`): Command-line interface

### Project Structure

```
electrosim/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Application entry point
│   │   ├── menu.ts     # Application menu
│   │   ├── file-system.ts # File operations
│   │   └── security.ts # Security policies
│   ├── renderer/       # React UI components
│   │   ├── App.tsx     # Main application component
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks
│   │   └── store/      # Redux state management
│   ├── preload/        # Secure IPC bridge
│   │   └── index.ts    # Preload script
│   ├── simulation/     # Circuit simulation engine
│   │   ├── core/       # Simulation algorithms
│   │   ├── components/ # Electronic component models
│   │   └── boards/     # Arduino board simulations
│   ├── shared/         # Shared types and utilities
│   │   ├── types/      # TypeScript interfaces
│   │   └── utils/      # Common utilities
│   └── cli/            # Command-line interface
│       └── index.ts    # CLI entry point
├── tests/              # Test files
├── assets/             # Static assets
├── dist/               # Built output
└── docs/               # Documentation
```

### Technology Stack

#### Core Technologies
- **Electron**: Cross-platform desktop app framework
- **React 18**: UI library with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Redux Toolkit**: Predictable state management
- **Material-UI**: React component library

#### Development Tools
- **Webpack**: Module bundler with hot reload
- **Jest**: Testing framework with coverage reports
- **ESLint**: Code linting and quality enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality gates

#### Simulation Engine
- **AVR8js**: Arduino AVR microcontroller emulation
- **Konva**: 2D canvas library for circuit visualization
- **RxJS**: Reactive programming for real-time updates

### Code Quality Standards

#### TypeScript Configuration
- Strict mode enabled
- Path aliases for clean imports
- Declaration files generated
- Source maps for debugging

#### ESLint Rules
- TypeScript recommended rules
- React hooks rules
- Import/export validation
- Code complexity limits

#### Testing Requirements
- Minimum 80% test coverage
- Unit tests for all components
- Integration tests for workflows
- E2E tests for critical paths

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# End-to-end tests
npm run test:e2e
```

### Test Structure
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full application workflow testing
- **Simulation Tests**: Circuit simulation accuracy

## 📦 Building & Packaging

### Development Build
```bash
npm run build
```

### Production Package
```bash
# Package for current platform
npm run package

# Package for specific platforms
npm run package:win
npm run package:mac
npm run package:linux
```

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration |
| `jest.config.js` | Jest testing configuration |
| `.eslintrc.js` | ESLint code quality rules |
| `webpack.*.config.js` | Webpack build configurations |
| `electron-builder.json` | Electron packaging configuration |

## 🎯 Development Roadmap

ElectroSim follows a structured 18-month development roadmap:

1. **Phase 1**: Foundation & Core Infrastructure ✅
2. **Phase 2**: Basic Simulation Core
3. **Phase 3**: Component Library
4. **Phase 4**: Circuit Simulation Core
5. **Phase 5**: Arduino Integration
6. **Phase 6**: Advanced Features

See [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) for detailed milestones.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** tests for new functionality
4. **Ensure** code passes all quality checks
5. **Submit** a pull request

### Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run type-check
npm run lint
npm test
npm run build

# Commit with conventional format
git commit -m "feat(simulation): add LED component simulation"

# Push and create PR
git push origin feature/your-feature-name
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/jmassardo/electrosim/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jmassardo/electrosim/discussions)
- **Documentation**: [Wiki](https://github.com/jmassardo/electrosim/wiki)

---

**ElectroSim** - *Bringing Arduino simulation to everyone, everywhere.*
