/**
 * Project Serialization System
 * Handles serialization, deserialization, validation, and version migration
 */

import Joi from 'joi';
import {
  ElectroSimProject,
  ProjectMetadata,
  CircuitData,
  CodeData,
  ProjectSettings,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ProjectMigration,
  PROJECT_FORMAT_VERSION,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_CANVAS_SETTINGS,
} from '../models/Project';

// Validation schemas
const projectMetadataSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow('').max(1000),
  author: Joi.string().min(1).max(100).required(),
  created: Joi.date().required(),
  modified: Joi.date().required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
  tags: Joi.array().items(Joi.string().max(50)).max(20),
});

const canvasSettingsSchema = Joi.object({
  zoom: Joi.number().min(0.1).max(10),
  panX: Joi.number(),
  panY: Joi.number(),
  gridEnabled: Joi.boolean(),
  snapToGrid: Joi.boolean(),
  showPinLabels: Joi.boolean(),
  theme: Joi.string().valid('light', 'dark', 'auto'),
});

const componentSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().required(),
  name: Joi.string().required(),
  position: Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required(),
    rotation: Joi.number().min(0).max(360),
  }).required(),
  properties: Joi.object(),
  connections: Joi.object(),
  metadata: Joi.object(),
});

const circuitDataSchema = Joi.object({
  components: Joi.array().items(componentSchema),
  wires: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    from: Joi.object().required(),
    to: Joi.object().required(),
    properties: Joi.object(),
  })),
  boardType: Joi.string().required(),
  canvasSettings: canvasSettingsSchema,
});

const libraryReferenceSchema = Joi.object({
  name: Joi.string().required(),
  version: Joi.string(),
  source: Joi.string().valid('builtin', 'community', 'local'),
  path: Joi.string(),
  dependencies: Joi.array().items(Joi.string()),
});

const codeDataSchema = Joi.object({
  mainSketch: Joi.string().required(),
  libraries: Joi.array().items(libraryReferenceSchema),
  includes: Joi.array().items(Joi.string()),
});

const projectSettingsSchema = Joi.object({
  compilation: Joi.object({
    optimization: Joi.string().valid('Os', 'O0', 'O1', 'O2', 'O3'),
    warnings: Joi.string().valid('none', 'default', 'more', 'all'),
    debugSymbols: Joi.boolean(),
    verboseOutput: Joi.boolean(),
    customFlags: Joi.array().items(Joi.string()),
  }),
  simulation: Joi.object({
    speed: Joi.string().valid('realtime', 'fast', 'step'),
    showElectrical: Joi.boolean(),
    enableProfiling: Joi.boolean(),
    maxRunTime: Joi.number().min(1),
    timeStep: Joi.number().min(0.1),
  }),
  display: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto'),
    gridEnabled: Joi.boolean(),
    snapToGrid: Joi.boolean(),
    showPinLabels: Joi.boolean(),
    showComponentLabels: Joi.boolean(),
    wireThickness: Joi.number().min(1).max(10),
  }),
  arduino: Joi.object({
    boardType: Joi.string().required(),
    port: Joi.string(),
    baudRate: Joi.number().valid(300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200),
    programmer: Joi.string(),
    additionalBoards: Joi.array().items(Joi.string()),
  }),
});

const projectSchema = Joi.object({
  metadata: projectMetadataSchema.required(),
  circuit: circuitDataSchema.required(),
  code: codeDataSchema.required(),
  settings: projectSettingsSchema.required(),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
});

export class ProjectSerializer {
  private migrations: ProjectMigration[] = [];

  constructor() {
    this.setupMigrations();
  }

  /**
   * Serialize project to JSON string
   */
  serialize(project: ElectroSimProject): string {
    try {
      // Ensure project has current version
      const projectToSerialize = {
        ...project,
        version: PROJECT_FORMAT_VERSION,
        metadata: {
          ...project.metadata,
          modified: new Date(),
        },
      };

      return JSON.stringify(projectToSerialize, this.jsonReplacer, 2);
    } catch (error) {
      throw new Error(`Failed to serialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize project from JSON string
   */
  deserialize(data: string): ElectroSimProject {
    try {
      const parsed = JSON.parse(data, this.jsonReviver);
      
      // Validate and migrate if necessary
      const migrated = this.migrateProject(parsed, parsed.version || '1.0.0');
      const validation = this.validateProject(migrated);

      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Invalid project data: ${errorMessages}`);
      }

      return migrated;
    } catch (error) {
      throw new Error(`Failed to deserialize project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate project structure
   */
  validateProject(data: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const validation = projectSchema.validate(data, { 
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: false,
      });

      if (validation.error) {
        result.isValid = false;
        result.errors = validation.error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: detail.type,
        }));
      }

      // Additional semantic validations
      this.performSemanticValidation(data, result);

    } catch (error) {
      result.isValid = false;
      result.errors.push({
        field: 'root',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'validation_error',
      });
    }

    return result;
  }

  /**
   * Migrate project from older version to current version
   */
  migrateProject(data: any, fromVersion: string): ElectroSimProject {
    if (!data.version) {
      data.version = '1.0.0';
    }

    if (data.version === PROJECT_FORMAT_VERSION) {
      return data as ElectroSimProject;
    }

    let migrated = { ...data };

    // Find and apply migrations
    const applicableMigrations = this.migrations.filter(
      migration => this.isVersionApplicable(migration.fromVersion, fromVersion)
    );

    for (const migration of applicableMigrations) {
      try {
        migrated = migration.migrate(migrated);
        console.log(`Applied migration from ${migration.fromVersion} to ${migration.toVersion}`);
      } catch (error) {
        throw new Error(`Migration failed from ${migration.fromVersion}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return migrated;
  }

  /**
   * Get available migrations
   */
  getAvailableMigrations(): ProjectMigration[] {
    return [...this.migrations];
  }

  /**
   * Custom JSON replacer for serialization
   */
  private jsonReplacer(key: string, value: any): any {
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  /**
   * Custom JSON reviver for deserialization
   */
  private jsonReviver(key: string, value: any): any {
    // Convert ISO strings back to Date objects for specific fields
    if (typeof value === 'string' && (key === 'created' || key === 'modified' || key === 'lastOpened')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return value;
  }

  /**
   * Setup version migrations
   */
  private setupMigrations(): void {
    // Migration from 1.0.0 to 2.0.0
    this.migrations.push({
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      description: 'Migrate from legacy Simudino format to ElectroSim format',
      migrate: (oldProject: any): ElectroSimProject => {
        // Handle legacy project structure
        const now = new Date();

        return {
          metadata: {
            name: oldProject.name || 'Untitled Project',
            description: oldProject.metadata?.description || '',
            author: oldProject.metadata?.author || 'ElectroSim User',
            created: oldProject.metadata?.created ? new Date(oldProject.metadata.created) : now,
            modified: now,
            version: '1.0.0',
            tags: oldProject.metadata?.tags || [],
          },
          circuit: {
            components: oldProject.circuit?.components || [],
            wires: oldProject.circuit?.wires || [],
            boardType: oldProject.circuit?.board?.type || 'uno',
            canvasSettings: {
              ...DEFAULT_CANVAS_SETTINGS,
              ...(oldProject.circuit?.canvasSettings || {}),
            },
          },
          code: {
            mainSketch: oldProject.sketch?.code || this.getDefaultSketch(),
            libraries: this.migrateLibraries(oldProject.sketch?.libraries || []),
            includes: [],
          },
          settings: {
            ...DEFAULT_PROJECT_SETTINGS,
            ...(oldProject.configuration || {}),
          },
          version: '2.0.0',
        };
      },
    });

    // Future migrations can be added here
    // Example: Migration from 2.0.0 to 2.1.0
    /*
    this.migrations.push({
      fromVersion: '2.0.0',
      toVersion: '2.1.0',
      description: 'Add new features',
      migrate: (project: any): ElectroSimProject => {
        // Migration logic
        return project;
      },
    });
    */
  }

  /**
   * Migrate libraries from old format to new format
   */
  private migrateLibraries(oldLibraries: string[] | any[]): any[] {
    return oldLibraries.map(lib => {
      if (typeof lib === 'string') {
        return {
          name: lib,
          source: 'builtin',
        };
      }
      return lib;
    });
  }

  /**
   * Get default Arduino sketch
   */
  private getDefaultSketch(): string {
    return `// ElectroSim Arduino Sketch
// Generated by ElectroSim

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Add your setup code here
}

void loop() {
  // Add your main code here
  
  delay(1000);
}`;
  }

  /**
   * Check if a migration version is applicable
   */
  private isVersionApplicable(migrationFrom: string, currentVersion: string): boolean {
    const parseVersion = (version: string) => {
      const parts = version.split('.').map(Number);
      return { major: parts[0], minor: parts[1], patch: parts[2] };
    };

    const migration = parseVersion(migrationFrom);
    const current = parseVersion(currentVersion);

    // Check if current version matches or is earlier than migration from version
    if (current.major < migration.major) return true;
    if (current.major === migration.major && current.minor < migration.minor) return true;
    if (current.major === migration.major && current.minor === migration.minor && current.patch <= migration.patch) return true;

    return false;
  }

  /**
   * Perform additional semantic validations
   */
  private performSemanticValidation(data: any, result: ValidationResult): void {
    // Check for component ID uniqueness
    if (data.circuit?.components) {
      const componentIds = new Set();
      for (const component of data.circuit.components) {
        if (componentIds.has(component.id)) {
          result.errors.push({
            field: 'circuit.components',
            message: `Duplicate component ID: ${component.id}`,
            code: 'duplicate_component_id',
          });
          result.isValid = false;
        }
        componentIds.add(component.id);
      }
    }

    // Check for wire ID uniqueness
    if (data.circuit?.wires) {
      const wireIds = new Set();
      for (const wire of data.circuit.wires) {
        if (wireIds.has(wire.id)) {
          result.errors.push({
            field: 'circuit.wires',
            message: `Duplicate wire ID: ${wire.id}`,
            code: 'duplicate_wire_id',
          });
          result.isValid = false;
        }
        wireIds.add(wire.id);
      }
    }

    // Check for valid component references in wires
    if (data.circuit?.wires && data.circuit?.components) {
      const componentIds = new Set(data.circuit.components.map((c: any) => c.id));
      for (const wire of data.circuit.wires) {
        if (wire.from?.componentId && !componentIds.has(wire.from.componentId)) {
          result.warnings.push({
            field: 'circuit.wires',
            message: `Wire references unknown component: ${wire.from.componentId}`,
            code: 'unknown_component_reference',
          });
        }
        if (wire.to?.componentId && !componentIds.has(wire.to.componentId)) {
          result.warnings.push({
            field: 'circuit.wires',
            message: `Wire references unknown component: ${wire.to.componentId}`,
            code: 'unknown_component_reference',
          });
        }
      }
    }

    // Validate sketch syntax (basic check)
    if (data.code?.mainSketch && typeof data.code.mainSketch === 'string') {
      const sketch = data.code.mainSketch;
      if (!sketch.includes('void setup()') && !sketch.includes('void loop()')) {
        result.warnings.push({
          field: 'code.mainSketch',
          message: 'Arduino sketch should contain setup() and loop() functions',
          code: 'missing_arduino_functions',
        });
      }
    }
  }
}