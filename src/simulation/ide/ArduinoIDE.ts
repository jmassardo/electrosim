/**
 * Arduino IDE Integration
 * Provides a complete Arduino development environment within ElectroSim
 * Combines compilation and emulation for authentic Arduino development experience
 */

import { ArduinoCompiler, CompilationResult, CompilationOptions } from '../compiler/ArduinoCompiler';
import { AVREmulator, AVREmulatorConfig } from '../emulator/AVREmulator';

export interface ArduinoProject {
  id: string;
  name: string;
  code: string;
  board: 'uno' | 'nano' | 'mega' | 'leonardo';
  libraries: string[];
  lastModified: Date;
  compiled?: CompilationResult;
}

export interface DebugSession {
  project: ArduinoProject;
  emulator: AVREmulator;
  breakpoints: number[];
  isRunning: boolean;
  currentLine?: number;
  variables: Map<string, any>;
}

export interface ArduinoIDEState {
  currentProject: ArduinoProject | undefined;
  isCompiling: boolean;
  isEmulating: boolean;
  debugSession: DebugSession | undefined;
  serialOutput: string[];
  compilationErrors: string[];
}

/**
 * Arduino IDE Integration Manager
 * Provides complete Arduino development workflow
 */
export class ArduinoIDE {
  private compiler: ArduinoCompiler;
  private emulator?: AVREmulator;
  private projects: Map<string, ArduinoProject> = new Map();
  private currentProject?: ArduinoProject;
  private debugSession?: DebugSession;
  private serialBuffer: string[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  // Default Arduino templates
  private templates = {
    blank: `void setup() {
  // put your setup code here, to run once:

}

void loop() {
  // put your main code here, to run repeatedly:

}`,
    blink: `// LED blink example
#define LED_PIN 13

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}`,
    serial: `void setup() {
  Serial.begin(9600);
  Serial.println("Arduino is ready!");
}

void loop() {
  if (Serial.available()) {
    String message = Serial.readString();
    Serial.print("Received: ");
    Serial.println(message);
  }
  delay(100);
}`,
    sensors: `// Analog sensor reading example
void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  Serial.print("Sensor: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.println(voltage);
  
  delay(500);
}`
  };

  constructor() {
    this.compiler = new ArduinoCompiler();
    this.setupEventHandlers();
  }

  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    this.addEventListener('serial:data', (data: string) => {
      this.serialBuffer.push(data);
      if (this.serialBuffer.length > 1000) {
        this.serialBuffer.shift(); // Keep buffer manageable
      }
    });
  }

  /**
   * Create a new Arduino project
   */
  public createProject(
    name: string,
    template: keyof typeof this.templates = 'blank',
    board: 'uno' | 'nano' | 'mega' | 'leonardo' = 'uno'
  ): ArduinoProject {
    const project: ArduinoProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      code: this.templates[template],
      board,
      libraries: [],
      lastModified: new Date()
    };

    this.projects.set(project.id, project);
    this.currentProject = project;
    
    this.emit('project:created', project);
    return project;
  }

  /**
   * Compile current project
   */
  public async compileProject(projectId?: string): Promise<CompilationResult> {
    const project = projectId ? this.projects.get(projectId) : this.currentProject;
    if (!project) {
      throw new Error('No project selected for compilation');
    }

    this.emit('compilation:started', project);

    const options: Partial<CompilationOptions> = {
      board: project.board,
      libraries: project.libraries,
      verbose: false
    };

    try {
      const result = await this.compiler.compile(project.code, options);
      project.compiled = result;
      
      this.emit('compilation:completed', { project, result });
      return result;
    } catch (error) {
      const errorResult: CompilationResult = {
        success: false,
        binarySize: 0,
        hexData: new Uint16Array(0),
        hexString: '',
        errors: [{ 
          line: 0, 
          column: 0, 
          message: error instanceof Error ? error.message : 'Compilation failed',
          severity: 'error'
        }],
        warnings: [],
        memoryUsage: { flash: 0, sram: 0 }
      };
      
      this.emit('compilation:error', { project, error: errorResult });
      return errorResult;
    }
  }

  /**
   * Upload and run compiled program on emulator
   */
  public async uploadAndRun(projectId?: string): Promise<boolean> {
    const project = projectId ? this.projects.get(projectId) : this.currentProject;
    if (!project) {
      throw new Error('No project selected');
    }

    // Compile if not already compiled
    if (!project.compiled || !project.compiled.success) {
      const result = await this.compileProject(project.id);
      if (!result.success) {
        this.emit('upload:failed', { project, reason: 'Compilation failed' });
        return false;
      }
    }

    try {
      // Initialize emulator if needed
      if (!this.emulator) {
        const config: AVREmulatorConfig = {
          flashSize: 32768,
          ramSize: 2048, 
          eepromSize: 1024,
          clockFrequency: 16000000
        };
        this.emulator = new AVREmulator(config);
      }

      // Reset emulator and load program
      this.emulator.reset();
      this.emulator.loadProgram(project.compiled!.hexData);
      
      // Start execution
      this.emulator.start();
      
      this.emit('upload:success', { project });
      this.emit('emulation:started', { project });
      
      return true;
    } catch (error) {
      this.emit('upload:failed', { project, error });
      return false;
    }
  }

  /**
   * Get current project
   */
  public getCurrentProject(): ArduinoProject | undefined {
    return this.currentProject;
  }

  /**
   * Get all projects
   */
  public getProjects(): ArduinoProject[] {
    return Array.from(this.projects.values());
  }

  /**
   * Get available templates
   */
  public getTemplates(): Array<{name: string, code: string}> {
    return Object.entries(this.templates).map(([name, code]) => ({ name, code }));
  }

  /**
   * Validate Arduino code
   */
  public validateCode(code: string): { valid: boolean; errors: string[] } {
    return this.compiler.validateSyntax(code);
  }

  /**
   * Check if Arduino CLI is available
   */
  public isCompilerAvailable(): boolean {
    return this.compiler.isArduinoCliAvailable();
  }

  /**
   * Get supported boards
   */
  public getSupportedBoards(): Array<{name: string, fqbn: string, mcu: string}> {
    return this.compiler.getSupportedBoards();
  }

  /**
   * Get serial output buffer
   */
  public getSerialOutput(): string[] {
    return [...this.serialBuffer];
  }

  /**
   * Stop emulation
   */
  public stopEmulation(): void {
    if (this.emulator) {
      this.emulator.stop();
      this.emit('emulation:stopped');
    }
  }

  /**
   * Reset emulation
   */
  public resetEmulation(): void {
    if (this.emulator) {
      this.emulator.reset();
      this.serialBuffer = [];
      this.emit('emulation:reset');
    }
  }

  /**
   * Add event listener
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get IDE state
   */
  public getState(): ArduinoIDEState {
    const currentState = this.emulator?.getState();
    return {
      currentProject: this.currentProject,
      isCompiling: false,
      isEmulating: currentState?.isRunning || false,
      debugSession: this.debugSession,
      serialOutput: this.getSerialOutput(),
      compilationErrors: this.currentProject?.compiled?.errors.map((e: any) => e.message) || []
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopEmulation();
    this.projects.clear();
    this.eventListeners.clear();
    this.serialBuffer = [];
  }
}