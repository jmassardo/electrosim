/**
 * Abstract Arduino Board Base Class
 * Provides common functionality for all Arduino board implementations
 */

import { AVREmulator, AVREmulatorConfig } from '../emulator/AVREmulator';
import { ArduinoCompiler, CompilationResult } from '../compiler/ArduinoCompiler';

export enum PinMode {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  INPUT_PULLUP = 'INPUT_PULLUP'
}

export enum PinType {
  DIGITAL = 'digital',
  ANALOG = 'analog',
  POWER = 'power',
  GROUND = 'ground'
}

export interface PinDefinition {
  number: number;
  name: string;
  type: PinType;
  mode: PinMode;
  digitalValue: boolean;
  analogValue: number;   // 0-1023 for analog pins
  pwmValue?: number;     // 0-255 for PWM capable pins
  voltage: number;       // actual voltage level
  current: number;       // current flow in amperes
  isPWMCapable: boolean;
  isInterruptCapable?: boolean;
}

export interface Timer {
  id: number;
  name: string;
  prescaler: number;
  compareValue: number;
  currentValue: number;
  mode: TimerMode;
  frequency: number;
  onCompareMatch?: () => void;
}

export enum TimerMode {
  NORMAL = 'normal',
  CTC = 'ctc',
  FAST_PWM = 'fast_pwm',
  PHASE_CORRECT_PWM = 'phase_correct_pwm'
}

export interface PowerModel {
  activeConsumption: number;    // Current consumption when active (mA)
  sleepConsumption: number;     // Current consumption in sleep mode (μA)
  supplyVoltage: number;        // Supply voltage (V)
  batteryCapacity?: number;     // Battery capacity (mAh)
}

export interface ArduinoBoardState {
  isRunning: boolean;
  pins: Map<number, PinDefinition>;
  timers: Timer[];
  serialOutput: string[];
  programCounter: number;
  memoryUsage: {
    flash: number;
    sram: number;
    eeprom: number;
  };
  powerModel: PowerModel;
  compilationResult?: CompilationResult;
  lastSketchCode?: string;
}

/**
 * Abstract base class for Arduino board implementations
 */
export abstract class ArduinoBoard {
  public readonly id: string;
  public readonly type: string;
  public name: string;
  public position: { x: number; y: number; rotation: number };

  protected state: ArduinoBoardState;
  protected emulator: AVREmulator;
  protected compiler: ArduinoCompiler;
  protected emulatorConfig: AVREmulatorConfig;
  protected startTime: number = 0;

  constructor(id: string, name: string, type: string) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = { x: 0, y: 0, rotation: 0 };
    
    this.emulatorConfig = this.getEmulatorConfig();
    this.emulator = new AVREmulator(this.emulatorConfig, this.id);
    this.compiler = new ArduinoCompiler();

    this.state = {
      isRunning: false,
      pins: new Map(),
      timers: [],
      serialOutput: [],
      programCounter: 0,
      memoryUsage: {
        flash: 0,
        sram: 0,
        eeprom: 0
      },
      powerModel: this.getPowerModel()
    };

    this.initializePins();
    this.initializeTimers();
    this.setupEmulatorIntegration();
  }

  // Abstract methods that must be implemented by subclasses
  abstract getBoardName(): string;
  abstract getDigitalPinCount(): number;
  abstract getAnalogPinCount(): number;
  abstract getPWMPins(): number[];
  abstract getEmulatorConfig(): AVREmulatorConfig;
  abstract getPowerModel(): PowerModel;
  abstract setupPinDefinitions(): void;

  /**
   * Initialize all board pins
   */
  protected initializePins(): void {
    this.setupPinDefinitions();
  }

  /**
   * Initialize hardware timers
   */
  protected initializeTimers(): void {
    // Default timer setup for ATmega328P (Uno/Nano)
    // Can be overridden by subclasses for different microcontrollers
    const timers: Timer[] = [
      {
        id: 0,
        name: 'Timer0',
        prescaler: 64,
        compareValue: 255,
        currentValue: 0,
        mode: TimerMode.FAST_PWM,
        frequency: 976.5625, // 16MHz / (64 * 256)
      },
      {
        id: 1,
        name: 'Timer1',
        prescaler: 64,
        compareValue: 65535,
        currentValue: 0,
        mode: TimerMode.NORMAL,
        frequency: 244.14, // 16MHz / (64 * 65536)
      },
      {
        id: 2,
        name: 'Timer2',
        prescaler: 64,
        compareValue: 255,
        currentValue: 0,
        mode: TimerMode.FAST_PWM,
        frequency: 976.5625,
      }
    ];

    this.state.timers = timers;
  }

  /**
   * Setup emulator integration
   */
  protected setupEmulatorIntegration(): void {
    this.emulator.onCycleCompleted(() => {
      this.updatePinsFromEmulator();
      this.updateTimers();
    });

    this.startTime = performance.now();

    const serial = this.emulator.getSerial();
    serial.onData((data: string) => {
      this.state.serialOutput.push(data);
    });
  }

  /**
   * Update pin states based on AVR emulator I/O ports
   */
  protected updatePinsFromEmulator(): void {
    // Map AVR ports to Arduino pins - must be implemented by specific board types
    this.state.pins.forEach((pin, pinNumber) => {
      if (pin.mode === PinMode.OUTPUT) {
        const portMapping = this.getPortMapping(pinNumber);
        if (portMapping) {
          const pinState = this.emulator.readDigitalPin(portMapping.port, portMapping.bit);
          pin.digitalValue = pinState;
          pin.voltage = pinState ? this.state.powerModel.supplyVoltage : 0;

          // Handle PWM for capable pins
          if (pin.isPWMCapable && this.getPWMPins().includes(pinNumber)) {
            pin.pwmValue = pinState ? 255 : 0; // Simplified PWM
          }
        }
      }
    });

    // Update program counter and memory usage
    const emulatorState = this.emulator.getState();
    this.state.programCounter = emulatorState.programCounter;
    
    const memoryUsage = this.emulator.getMemoryUsage();
    this.state.memoryUsage = {
      flash: memoryUsage.flash.used,
      sram: memoryUsage.sram.used,
      eeprom: memoryUsage.eeprom.used
    };
  }

  /**
   * Update hardware timers
   */
  protected updateTimers(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.startTime;

    this.state.timers.forEach(timer => {
      if (this.state.isRunning) {
        // Simplified timer update based on frequency
        const increment = Math.floor(timer.frequency * deltaTime / 1000);
        timer.currentValue = (timer.currentValue + increment) % (timer.compareValue + 1);

        // Handle compare match
        if (timer.currentValue >= timer.compareValue && timer.onCompareMatch) {
          timer.onCompareMatch();
        }
      }
    });
  }

  /**
   * Get port mapping for a specific pin number
   * Must be implemented by subclasses
   */
  protected abstract getPortMapping(pinNumber: number): { port: number; bit: number } | null;

  /**
   * Set pin mode (pinMode equivalent)
   */
  public setPinMode(pinNumber: number, mode: PinMode): void {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      throw new Error(`Invalid pin number: ${pinNumber}`);
    }

    pin.mode = mode;

    if (mode === PinMode.INPUT_PULLUP) {
      pin.voltage = this.state.powerModel.supplyVoltage;
      pin.digitalValue = true;
    } else if (mode === PinMode.INPUT) {
      pin.voltage = 0;
      pin.digitalValue = false;
    }

    // Update emulator DDR register
    const portMapping = this.getPortMapping(pinNumber);
    if (portMapping) {
      this.emulator.setPinDirection(portMapping.port, portMapping.bit, mode === PinMode.OUTPUT);
    }
  }

  /**
   * Write digital value to pin (digitalWrite equivalent)
   */
  public writeDigitalPin(pinNumber: number, value: boolean): void {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      throw new Error(`Invalid pin number: ${pinNumber}`);
    }

    if (pin.mode !== PinMode.OUTPUT) {
      throw new Error(`Pin ${pinNumber} is not set to OUTPUT mode`);
    }

    pin.digitalValue = value;
    pin.voltage = value ? this.state.powerModel.supplyVoltage : 0;

    // Update emulator PORT register
    const portMapping = this.getPortMapping(pinNumber);
    if (portMapping) {
      this.emulator.writeDigitalPin(portMapping.port, portMapping.bit, value);
    }
  }

  /**
   * Read digital value from pin (digitalRead equivalent)
   */
  public readDigitalPin(pinNumber: number): boolean {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      throw new Error(`Invalid pin number: ${pinNumber}`);
    }

    return pin.digitalValue;
  }

  /**
   * Read analog value from pin (analogRead equivalent)
   */
  public readAnalogPin(analogPinNumber: number): number {
    const pin = this.state.pins.get(analogPinNumber);
    if (!pin || pin.type !== PinType.ANALOG) {
      throw new Error(`Invalid analog pin number: ${analogPinNumber}`);
    }

    // Convert voltage to 10-bit ADC value (0-1023)
    return Math.round((pin.voltage / this.state.powerModel.supplyVoltage) * 1023);
  }

  /**
   * Write PWM value to pin (analogWrite equivalent)
   */
  public writeAnalogPin(pinNumber: number, value: number): void {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      throw new Error(`Invalid pin number: ${pinNumber}`);
    }

    if (!pin.isPWMCapable) {
      // Arduino behavior: ignore PWM writes to non-PWM pins
      return;
    }

    if (pin.mode !== PinMode.OUTPUT) {
      throw new Error(`Pin ${pinNumber} is not set to OUTPUT mode`);
    }

    const pwmValue = Math.max(0, Math.min(255, value));
    pin.pwmValue = pwmValue;
    pin.voltage = (pwmValue / 255) * this.state.powerModel.supplyVoltage;
  }

  /**
   * Load and compile Arduino sketch
   */
  public async loadSketch(sketchCode: string): Promise<CompilationResult> {
    try {
      const boardType = this.type === 'arduino-uno' ? 'uno' :
                       this.type === 'arduino-nano' ? 'nano' :
                       this.type === 'arduino-mega' ? 'mega' : 'uno';

      const compilationResult = await this.compiler.compile(sketchCode, {
        board: boardType as any,
        libraries: [],
        verbose: false
      });

      this.state.compilationResult = compilationResult;
      this.state.lastSketchCode = sketchCode;

      if (compilationResult.success) {
        this.emulator.loadProgram(compilationResult.hexData);
      }

      return compilationResult;
    } catch (error) {
      const errorResult: CompilationResult = {
        success: false,
        binarySize: 0,
        hexData: new Uint16Array(0),
        hexString: '',
        errors: [{ 
          line: 0, 
          column: 0, 
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          severity: 'error' 
        }],
        warnings: [],
        memoryUsage: { flash: 0, sram: 0 }
      };
      
      this.state.compilationResult = errorResult;
      return errorResult;
    }
  }

  /**
   * Start running the loaded sketch
   */
  public startSketch(): void {
    if (!this.state.compilationResult?.success) {
      throw new Error('No successfully compiled sketch to run');
    }

    this.state.isRunning = true;
    this.startTime = performance.now();
    this.emulator.start();
  }

  /**
   * Stop running the sketch
   */
  public stopSketch(): void {
    this.state.isRunning = false;
    this.emulator.stop();
  }

  /**
   * Reset the board
   */
  public reset(): void {
    this.emulator.reset();
    this.state.isRunning = false;
    this.state.serialOutput = [];
    this.state.programCounter = 0;
    this.state.memoryUsage = { flash: 0, sram: 0, eeprom: 0 };

    // Reset all pins
    this.state.pins.forEach(pin => {
      if (pin.type === PinType.POWER) {
        return; // Keep power pins unchanged
      } else if (pin.type === PinType.GROUND) {
        pin.voltage = 0;
        pin.digitalValue = false;
      } else {
        pin.mode = PinMode.INPUT;
        pin.voltage = 0;
        pin.digitalValue = false;
        pin.analogValue = 0;
        pin.current = 0;
        if (pin.pwmValue !== undefined) {
          pin.pwmValue = 0;
        }
      }
    });

    this.startTime = performance.now();
  }

  /**
   * Get current millis() value
   */
  public millis(): number {
    if (!this.state.isRunning) return 0;
    return Math.floor(performance.now() - this.startTime);
  }

  /**
   * Get board state
   */
  public getState(): ArduinoBoardState {
    return {
      ...this.state,
      pins: new Map(this.state.pins)
    };
  }

  /**
   * Get all pins
   */
  public getAllPins(): PinDefinition[] {
    return Array.from(this.state.pins.values());
  }

  /**
   * Get specific pin
   */
  public getPin(pinNumber: number): PinDefinition | undefined {
    return this.state.pins.get(pinNumber);
  }

  /**
   * Get emulator instance
   */
  public getEmulator(): AVREmulator {
    return this.emulator;
  }

  /**
   * Get compilation result
   */
  public getCompilationResult(): CompilationResult | undefined {
    return this.state.compilationResult;
  }

  /**
   * Get serial output
   */
  public getSerialOutput(): string[] {
    return [...this.state.serialOutput];
  }

  /**
   * Clear serial output
   */
  public clearSerialOutput(): void {
    this.state.serialOutput = [];
  }

  /**
   * Check if sketch is running
   */
  public isSketchRunning(): boolean {
    return this.state.isRunning;
  }
}