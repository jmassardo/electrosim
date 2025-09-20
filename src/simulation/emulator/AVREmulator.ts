/**
 * AVR8js Emulator Wrapper
 * Provides a high-level interface for AVR microcontroller emulation
 * Integrates with the simulation system to provide real Arduino code execution
 */

import { CPU } from 'avr8js';
import { ArduinoSerialManager, ArduinoSerialAPI } from '../virtual-port/ArduinoSerialAPI';

export interface AVREmulatorConfig {
  flashSize: number;      // Flash memory size in bytes
  ramSize: number;        // SRAM size in bytes
  eepromSize: number;     // EEPROM size in bytes
  clockFrequency: number; // CPU clock frequency in Hz
}

export interface EmulatorState {
  isRunning: boolean;
  programCounter: number;
  stackPointer: number;
  cpuCycles: number;
  lastInstructionTime: number;
  registers: Uint8Array;
  sram: Uint8Array;
  flash: Uint16Array;
}

export interface MemoryUsage {
  flash: { used: number; total: number };
  sram: { used: number; total: number };
  eeprom: { used: number; total: number };
}

/**
 * AVR Emulator wrapper for Arduino board simulation
 */
export class AVREmulator {
  private cpu: CPU;
  private config: AVREmulatorConfig;
  private isRunning: boolean = false;
  private cycleCount: number = 0;
  private lastCycleTime: number = 0;
  private emulatorId: string;
  private serial: ArduinoSerialAPI;
  
  // Debugging support
  private breakpoints: Set<number> = new Set();
  private stepMode: boolean = false;
  private onBreakpoint?: (pc: number) => void;
  private onCycleComplete?: (cycles: number) => void;

  constructor(config: AVREmulatorConfig, emulatorId: string = 'default') {
    this.config = config;
    this.emulatorId = emulatorId;
    
    // Initialize CPU with flash memory
    this.cpu = new CPU(new Uint16Array(config.flashSize / 2));
    
    // Set up memory
    this.initializeMemory();

    // Initialize Serial communication
    const serialManager = ArduinoSerialManager.getInstance();
    this.serial = serialManager.connectEmulator(this.cpu, this.emulatorId);
  }

  /**
   * Initialize CPU memory and registers
   */
  private initializeMemory(): void {
    // Clear SRAM
    for (let i = 0; i < this.config.ramSize; i++) {
      this.cpu.data[i] = 0;
    }
    
    // Initialize stack pointer (Arduino Uno: 0x08FF for 2K RAM)
    this.cpu.SP = this.config.ramSize - 1;
    
    // Initialize program counter
    this.cpu.pc = 0;
    
    // Reset cycle count
    this.cycleCount = 0;
    this.lastCycleTime = performance.now();
  }

  /**
   * Load compiled Arduino program into flash memory
   */
  public loadProgram(hexData: Uint16Array): void {
    if (hexData.length > this.config.flashSize / 2) {
      throw new Error(`Program size ${hexData.length * 2} bytes exceeds flash capacity ${this.config.flashSize} bytes`);
    }
    
    // Copy program to flash memory
    for (let i = 0; i < hexData.length; i++) {
      this.cpu.progMem[i] = hexData[i];
    }
    
    // Convert to bytes for debugging
    for (let i = 0; i < hexData.length; i++) {
      this.cpu.progBytes[i * 2] = hexData[i] & 0xff;
      this.cpu.progBytes[i * 2 + 1] = (hexData[i] >> 8) & 0xff;
    }
    
    // Reset CPU state
    this.initializeMemory();
  }

  /**
   * Load program from Intel HEX format string
   */
  public loadHexProgram(hexString: string): void {
    const lines = hexString.split('\n').filter(line => line.trim().length > 0);
    const programData: number[] = [];
    
    for (const line of lines) {
      if (!line.startsWith(':')) continue;
      
      // Parse Intel HEX line
      const byteCount = parseInt(line.substr(1, 2), 16);
      const address = parseInt(line.substr(3, 4), 16);
      const recordType = parseInt(line.substr(7, 2), 16);
      
      if (recordType === 0) { // Data record
        for (let i = 0; i < byteCount; i++) {
          const byte = parseInt(line.substr(9 + i * 2, 2), 16);
          programData[address + i] = byte;
        }
      }
    }
    
    // Convert bytes to 16-bit words
    const program = new Uint16Array(Math.ceil(programData.length / 2));
    for (let i = 0; i < programData.length; i += 2) {
      const low = programData[i] || 0;
      const high = programData[i + 1] || 0;
      program[i / 2] = low | (high << 8);
    }
    
    this.loadProgram(program);
  }

  /**
   * Start emulation
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.lastCycleTime = performance.now();
    this.executeLoop();
  }

  /**
   * Stop emulation
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Pause emulation (can be resumed)
   */
  public pause(): void {
    this.isRunning = false;
  }

  /**
   * Resume paused emulation
   */
  public resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastCycleTime = performance.now();
      this.executeLoop();
    }
  }

  /**
   * Execute a single instruction (step debugging)
   */
  public step(): boolean {
    if (this.cpu.pc >= this.cpu.progMem.length) {
      return false; // Program ended
    }
    
    // Check for breakpoints
    if (this.breakpoints.has(this.cpu.pc)) {
      this.onBreakpoint?.(this.cpu.pc);
      return true;
    }
    
    // Execute single instruction using AVR8js
    this.cpu.tick();
    this.cycleCount++;
    
    return this.cpu.pc < this.cpu.progMem.length;
  }

  /**
   * Main execution loop
   */
  private executeLoop(): void {
    if (!this.isRunning) {
      return;
    }
    
    const startTime = performance.now();
    const maxExecutionTime = 16; // 16ms per frame (60 FPS)
    let instructionCount = 0;
    
    // Execute instructions for the time budget
    while (this.isRunning && (performance.now() - startTime) < maxExecutionTime) {
      if (!this.step()) {
        // Program ended
        this.isRunning = false;
        break;
      }
      
      instructionCount++;
      
      // Check if we're in step mode
      if (this.stepMode) {
        this.isRunning = false;
        break;
      }
    }
    
    // Call cycle complete callback
    this.onCycleComplete?.(this.cycleCount);
    
    // Continue execution on next frame
    if (this.isRunning) {
      requestAnimationFrame(() => this.executeLoop());
    }
  }

  /**
   * Set breakpoint at program counter address
   */
  public setBreakpoint(address: number): void {
    this.breakpoints.add(address);
  }

  /**
   * Remove breakpoint
   */
  public removeBreakpoint(address: number): void {
    this.breakpoints.delete(address);
  }

  /**
   * Enable/disable step-through debugging mode
   */
  public setStepMode(enabled: boolean): void {
    this.stepMode = enabled;
  }

  /**
   * Get current emulator state
   */
  public getState(): EmulatorState {
    return {
      isRunning: this.isRunning,
      programCounter: this.cpu.pc,
      stackPointer: this.cpu.SP,
      cpuCycles: this.cycleCount,
      lastInstructionTime: this.lastCycleTime,
      registers: new Uint8Array(this.cpu.data.slice(0, 32)),
      sram: new Uint8Array(this.cpu.data.slice(32)),
      flash: new Uint16Array(this.cpu.progMem)
    };
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryUsage(): MemoryUsage {
    // Calculate used memory (simplified heuristic)
    let flashUsed = 0;
    for (let i = this.cpu.progMem.length - 1; i >= 0; i--) {
      if (this.cpu.progMem[i] !== 0xffff) {
        flashUsed = (i + 1) * 2;
        break;
      }
    }
    
    // Find highest used SRAM address
    let sramUsed = 0;
    for (let i = this.config.ramSize - 1; i >= 32; i--) {
      if (this.cpu.data[i] !== 0) {
        sramUsed = i - 32 + 1;
        break;
      }
    }
    
    return {
      flash: { used: flashUsed, total: this.config.flashSize },
      sram: { used: sramUsed, total: this.config.ramSize - 32 },
      eeprom: { used: 0, total: this.config.eepromSize }
    };
  }

  /**
   * Read register value
   */
  public readRegister(register: number): number {
    if (register < 0 || register > 31) {
      throw new Error(`Invalid register: ${register}`);
    }
    return this.cpu.data[register];
  }

  /**
   * Write register value
   */
  public writeRegister(register: number, value: number): void {
    if (register < 0 || register > 31) {
      throw new Error(`Invalid register: ${register}`);
    }
    this.cpu.data[register] = value & 0xff;
  }

  /**
   * Read I/O register value
   */
  public readIO(address: number): number {
    return this.cpu.readData(address + 0x20);
  }

  /**
   * Write I/O register value
   */
  public writeIO(address: number, value: number): void {
    this.cpu.writeData(address + 0x20, value & 0xff);
  }

  /**
   * Read digital pin state from I/O port
   */
  public readDigitalPin(port: number, pin: number): boolean {
    const pinRegister = 0x20 + port * 3; // PIN register offset
    const pinValue = this.cpu.readData(pinRegister);
    return (pinValue & (1 << pin)) !== 0;
  }

  /**
   * Write digital pin state to I/O port
   */
  public writeDigitalPin(port: number, pin: number, value: boolean): void {
    const portRegister = 0x20 + port * 3 + 2; // PORT register offset
    let portValue = this.cpu.readData(portRegister);
    
    if (value) {
      portValue |= (1 << pin);
    } else {
      portValue &= ~(1 << pin);
    }
    
    this.cpu.writeData(portRegister, portValue);
  }

  /**
   * Set pin direction (DDR register)
   */
  public setPinDirection(port: number, pin: number, output: boolean): void {
    const ddrRegister = 0x20 + port * 3 + 1; // DDR register offset
    let ddrValue = this.cpu.readData(ddrRegister);
    
    if (output) {
      ddrValue |= (1 << pin);
    } else {
      ddrValue &= ~(1 << pin);
    }
    
    this.cpu.writeData(ddrRegister, ddrValue);
  }

  /**
   * Set callback for breakpoint hits
   */
  public onBreakpointHit(callback: (pc: number) => void): void {
    this.onBreakpoint = callback;
  }

  /**
   * Set callback for cycle completion
   */
  public onCycleCompleted(callback: (cycles: number) => void): void {
    this.onCycleComplete = callback;
  }

  /**
   * Reset the emulator to initial state
   */
  public reset(): void {
    this.stop();
    this.initializeMemory();
    this.cycleCount = 0;
  }

  /**
   * Get current instruction name (simplified)
   */
  public getCurrentInstruction(): string {
    if (this.cpu.pc >= this.cpu.progMem.length) {
      return 'END_OF_PROGRAM';
    }
    
    const opcode = this.cpu.progMem[this.cpu.pc];
    
    // Basic opcode decoding (simplified)
    if ((opcode & 0xF000) === 0x9000) {
      if ((opcode & 0xFF00) === 0x9500) return 'ASR/LSR/ROR/COM/NEG/INC/DEC';
      if ((opcode & 0xFF00) === 0x9400) return 'IJMP/ICALL/RET/RETI';
      return 'LD/ST';
    } else if ((opcode & 0xF000) === 0x0000) {
      return 'NOP/MOVW/MULS';
    } else if ((opcode & 0xF000) === 0x1000) {
      return 'CPSE';
    } else if ((opcode & 0xF000) === 0x2000) {
      return 'AND';
    } else if ((opcode & 0xF000) === 0x3000) {
      return 'CPI';
    } else if ((opcode & 0xF000) === 0xE000) {
      return 'LDI';
    }
    
    return `UNKNOWN_0x${opcode.toString(16).toUpperCase()}`;
  }

  /**
   * Get the Arduino Serial API instance
   */
  public getSerial(): ArduinoSerialAPI {
    return this.serial;
  }

  /**
   * Get emulator ID
   */
  public getId(): string {
    return this.emulatorId;
  }

  /**
   * Cleanup emulator resources
   */
  public cleanup(): void {
    this.stop();
    const serialManager = ArduinoSerialManager.getInstance();
    serialManager.removeSerial(this.emulatorId);
  }
}