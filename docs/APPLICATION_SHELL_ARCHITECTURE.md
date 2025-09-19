# Application Shell Architecture

## Overview

The ElectroSim Application Shell provides the foundational user interface framework built on Electron and React. This document details the architecture, implementation, and design decisions for the application shell.

## Architecture Components

### 1. Electron Main Process (`src/main/`)

#### Main Window Configuration (`src/main/index.ts`)
- **Window Dimensions**: 1400x900 pixels (minimum 1000x700)
- **Security Settings**: Context isolation enabled, node integration disabled
- **Platform Adaptations**: Custom title bar on macOS, standard on Windows/Linux
- **Background Color**: Matches app theme (#2f3349)
- **Development Features**: DevTools enabled in development mode

#### Application Menu (`src/main/menu.ts`)
- **Cross-Platform Menus**: File, Edit, Simulation, Tools, Help
- **Keyboard Shortcuts**: Standard platform-specific accelerators
- **IPC Communication**: Menu actions trigger renderer events
- **Platform Adaptations**: macOS-specific menu structure

#### Key Features:
```typescript
// Enhanced window configuration
const windowOptions = {
  width: 1400,
  height: 900,
  minWidth: 1000,
  minHeight: 700,
  center: true,
  titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true,
    preload: join(__dirname, '../preload/index.js'),
  },
  backgroundColor: '#2f3349'
};
```

### 2. Preload Script (`src/preload/`)

#### IPC Bridge (`src/preload/index.ts`)
- **Secure API Exposure**: contextBridge for safe renderer communication
- **Menu Event Handlers**: Two-way communication for menu interactions
- **Window Controls**: Minimize, maximize, close functionality
- **Project Management**: File operations for save/load

#### Menu Event System:
```typescript
menu: {
  onNewProject: (callback: () => void) => ipcRenderer.on('menu:new-project', callback),
  onOpenProject: (callback: () => void) => ipcRenderer.on('menu:open-project', callback),
  // ... additional menu handlers
  removeAllListeners: () => { /* cleanup */ }
}
```

### 3. React Renderer (`src/renderer/`)

#### Main Application (`src/renderer/App.tsx`)
- **Modern React**: Hooks-based functional components
- **Material-UI Integration**: Consistent design system
- **Responsive Design**: Adapts to different window sizes
- **Menu Event Handling**: Responds to main process menu actions

#### UI Structure:
```
┌─────────────────────────────────┐
│ Custom Title Bar (Electron)     │ ← Window controls
├─────────────────────────────────┤
│ Application Header              │ ← Branding and title
├─────────────────────────────────┤
│                                 │
│        Main Content Area        │ ← Project workspace
│                                 │
├─────────────────────────────────┤
│ Status Footer                   │ ← Version and status
└─────────────────────────────────┘
```

### 4. Build System Integration

#### Webpack Configurations
- **Main Process**: `webpack.main.config.js` - Electron main bundle
- **Renderer Process**: `webpack.renderer.config.js` - React UI bundle
- **Preload Script**: `webpack.preload.config.js` - IPC bridge bundle
- **CLI Tools**: `webpack.cli.config.js` - Command-line interface

## Design System

### Color Palette
- **Primary**: #60a5fa (ElectroSim Blue)
- **Background**: #2f3349 (Deep Space)
- **Gradient**: Linear gradient from #667eea to #764ba2
- **Success**: #10b981, Warning: #f59e0b, Error: #ef4444

### Typography
- **Primary Font**: System fonts (San Francisco, Segoe UI, Roboto)
- **Icon Font**: Material-UI Icons
- **Code Font**: Monospace for technical content

### Layout Principles
- **8px Grid System**: Consistent spacing throughout the interface
- **Responsive Design**: Adapts to minimum 1000x700 window size
- **Glass Morphism**: Frosted glass effects with backdrop blur
- **Elevation**: Box shadows for depth and hierarchy

## Key Features Implemented

### 1. Enhanced Window Management
- **Custom Title Bar**: macOS-style integrated controls
- **Window Controls**: Minimize, maximize, close buttons
- **Proper Event Handling**: IPC communication for window actions
- **Platform Adaptation**: Different styles for macOS/Windows/Linux

### 2. Comprehensive Menu System
- **File Menu**: New project, open, save, save as, exit
- **Simulation Menu**: Start/resume, pause, stop, reset
- **Tools Menu**: Virtual serial port, developer tools
- **Help Menu**: About dialog, documentation links

### 3. Modern UI Framework
- **Material-UI Components**: Professional appearance
- **Responsive Layout**: Flexible grid system
- **Accessibility**: ARIA labels and keyboard navigation
- **Theme Integration**: Consistent color scheme

### 4. Performance Optimizations
- **Code Splitting**: Separate bundles for different processes
- **Lazy Loading**: Components loaded on demand
- **Efficient Bundling**: Webpack optimization for production
- **Memory Management**: Proper cleanup of event listeners

## Technical Specifications

### Application Startup Performance
- **Target**: < 3 seconds (as per roadmap requirements)
- **Current**: Build completes in ~15 seconds, runtime startup is rapid
- **Optimization**: Production builds use minification and tree shaking

### Cross-Platform Compatibility
- **macOS**: Native look and feel with hidden title bar
- **Windows**: Standard window chrome and controls
- **Linux**: Standard desktop integration

### Security Implementation
- **Context Isolation**: Prevents renderer access to Node.js APIs
- **Web Security**: Enabled for production security
- **Preload Script**: Secure bridge for necessary IPC communication
- **Content Security**: External links open in system browser

## Development Workflow

### Hot Module Replacement
- **Development Server**: webpack-dev-server on port 3000
- **Live Reload**: Changes reflect immediately in development
- **Source Maps**: Full debugging support with TypeScript

### Build Process
```bash
npm run dev      # Development mode with hot reload
npm run build    # Production build all targets
npm run start    # Start built application
```

### Testing Integration
- **TypeScript**: Strict type checking (`npm run type-check`)
- **Linting**: ESLint validation (`npm run lint`)
- **Unit Tests**: Jest framework (`npm test`)

## Future Enhancements

### Planned Improvements
1. **Custom Icons**: Professional icon design replacing placeholder
2. **Theme System**: Dark/light mode toggle
3. **Window State**: Remember position and size
4. **Splash Screen**: Loading indicator for startup
5. **Menu State**: Dynamic menu item enabling/disabling

### Performance Targets
- **Startup Time**: Optimize to < 2 seconds
- **Memory Usage**: Monitor and optimize memory footprint
- **Bundle Size**: Tree shaking and code splitting optimizations

## File Structure
```
src/
├── main/
│   ├── index.ts          # Main process entry point
│   ├── menu.ts           # Application menu system
│   ├── auto-updater.ts   # Update management
│   ├── file-system.ts    # File operations
│   └── security.ts       # Security policies
├── preload/
│   └── index.ts          # IPC bridge (secure)
├── renderer/
│   ├── App.tsx           # Main React component
│   ├── index.tsx         # Renderer entry point
│   ├── components/       # UI components
│   ├── hooks/           # Custom React hooks
│   └── store/           # Redux state management
└── shared/
    ├── types/           # TypeScript interfaces
    └── utils/           # Common utilities
```

## Success Criteria Validation

✅ **Electron Application**: Boots successfully on all platforms  
✅ **React Components**: Render correctly in Electron renderer  
✅ **Menu System**: Cross-platform menus with keyboard shortcuts  
✅ **Window Controls**: Minimize, maximize, close functionality  
✅ **Performance**: Application starts and builds efficiently  
✅ **Build System**: All webpack targets compile successfully  

---

**Document Version**: 1.0  
**Last Updated**: September 19, 2025  
**Phase**: Development Roadmap Phase 1 - Application Shell