/**
 * Enhanced Project Data Models for ElectroSim
 * Implements complete project structure as specified in 4.4.1
 */

// Import and re-export existing types that we'll extend
import type { 
  ArduinoBoardType, 
  ArduinoBoardConfig, 
  BaseComponent, 
  Wire, 
  ComponentConnection 
} from '../shared/types';

export type { 
  ArduinoBoardType, 
  ArduinoBoardConfig, 
  BaseComponent, 
  Wire, 
  ComponentConnection 
};

// Enhanced Project Metadata
export interface ProjectMetadata {
  name: string;
  description: string;
  author: string;
  created: Date;
  modified: Date;
  version: string;
  tags: string[];
}

// Enhanced Circuit Data Structure
export interface CircuitData {
  components: CanvasComponent[];
  wires: Wire[];
  boardType: string;
  canvasSettings: CanvasSettings;
}

export interface CanvasComponent {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; rotation?: number };
  properties: Record<string, any>;
  connections: Record<string, string[]>;
  metadata?: Record<string, any>;
}

export interface CanvasSettings {
  zoom: number;
  panX: number;
  panY: number;
  gridEnabled: boolean;
  snapToGrid: boolean;
  showPinLabels: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// Enhanced Code Data Structure  
export interface CodeData {
  mainSketch: string;
  libraries: LibraryReference[];
  includes: string[];
}

export interface LibraryReference {
  name: string;
  version?: string;
  source: 'builtin' | 'community' | 'local';
  path?: string;
  dependencies?: string[];
}

// Enhanced Project Settings
export interface ProjectSettings {
  compilation: CompilationSettings;
  simulation: SimulationSettings;
  display: DisplaySettings;
  arduino: ArduinoSettings;
}

export interface CompilationSettings {
  optimization: 'Os' | 'O0' | 'O1' | 'O2' | 'O3';
  warnings: 'none' | 'default' | 'more' | 'all';
  debugSymbols: boolean;
  verboseOutput: boolean;
  customFlags?: string[];
}

export interface SimulationSettings {
  speed: 'realtime' | 'fast' | 'step';
  showElectrical: boolean;
  enableProfiling: boolean;
  maxRunTime: number; // seconds
  timeStep: number; // milliseconds
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  gridEnabled: boolean;
  snapToGrid: boolean;
  showPinLabels: boolean;
  showComponentLabels: boolean;
  wireThickness: number;
}

export interface ArduinoSettings {
  boardType: string;
  port?: string;
  baudRate: number;
  programmer?: string;
  additionalBoards?: string[];
}

// Main Project Interface
export interface ElectroSimProject {
  metadata: ProjectMetadata;
  circuit: CircuitData;
  code: CodeData;
  settings: ProjectSettings;
  version: string;
}

// Project Reference for Recent Projects
export interface ProjectReference {
  name: string;
  path: string;
  lastOpened: Date;
  metadata?: Partial<ProjectMetadata>;
  thumbnail?: string; // base64 encoded image
}

// Validation Result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Project Template
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail?: string;
  project: Omit<ElectroSimProject, 'metadata'>;
  tutorial?: {
    steps: TutorialStep[];
    resources: string[];
  };
}

export interface TutorialStep {
  title: string;
  description: string;
  code?: string;
  circuit?: Partial<CircuitData>;
  tips?: string[];
}

// Auto-save and Recovery
export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxRecoveryFiles: number;
  recoveryPath: string;
}

export interface RecoveryFile {
  projectName: string;
  filePath: string;
  timestamp: Date;
  size: number;
  isCorrupted: boolean;
}

// Export Configuration
export interface ArduinoExportConfig {
  includeDiagram: boolean;
  includeLibraries: boolean;
  generateReadme: boolean;
  optimizeCode: boolean;
  target: 'arduino-ide' | 'platformio' | 'both';
}

// Version Migration
export interface ProjectMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (project: any) => ElectroSimProject;
  description: string;
}

// Default configurations
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  compilation: {
    optimization: 'Os',
    warnings: 'all',
    debugSymbols: true,
    verboseOutput: false,
  },
  simulation: {
    speed: 'realtime',
    showElectrical: true,
    enableProfiling: false,
    maxRunTime: 300, // 5 minutes
    timeStep: 1, // 1ms
  },
  display: {
    theme: 'light',
    gridEnabled: true,
    snapToGrid: true,
    showPinLabels: true,
    showComponentLabels: true,
    wireThickness: 2,
  },
  arduino: {
    boardType: 'uno',
    baudRate: 9600,
  },
};

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  gridEnabled: true,
  snapToGrid: true,
  showPinLabels: true,
  theme: 'light',
};

export const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds
  maxRecoveryFiles: 10,
  recoveryPath: '', // Will be set by ProjectManager
};

// Project file format version
export const PROJECT_FORMAT_VERSION = '2.0.0';

// File extensions
export const PROJECT_FILE_EXTENSION = '.esp'; // ElectroSim Project
export const RECOVERY_FILE_EXTENSION = '.esp.recovery';
export const BACKUP_FILE_EXTENSION = '.esp.backup';