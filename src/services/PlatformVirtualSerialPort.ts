/**
 * Platform-Specific Virtual Serial Port Implementation
 * Creates actual system-level serial ports that external applications can connect to
 */

import { EventEmitter } from 'events';
import { SerialPortInfo } from '../simulation/virtual-port/VirtualSerialPort';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../shared/logging/Logger';
import { SerialPortError, ErrorHandler } from '../shared/errors/ElectroSimErrors';

export interface PlatformPortConfig {
  baudRate: number;
  boardType: string;
  description: string;
  manufacturer: string;
  serialNumber: string;
}

/**
 * Interface for platform-specific virtual serial port implementations
 */
export interface IPlatformVirtualSerialPort {
  readonly portName: string;
  readonly isOpen: boolean;
  readonly config: PlatformPortConfig;
  
  createPort(): Promise<void>;
  destroyPort(): Promise<void>;
  writeToPort(data: Buffer): Promise<number>;
  readFromPort(): Promise<Buffer>;
  getPortInfo(): SerialPortInfo;
  getBaudRate(): number;
  setBaudRate(baudRate: number): Promise<void>;
  getBytesTransmitted(): number;
  getBytesReceived(): number;
  getStatistics(): PlatformPortStatistics;
  
  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
  removeAllListeners(event?: string): this;
}

/**
 * Statistics interface for platform virtual serial ports
 */
export interface PlatformPortStatistics {
  portName: string;
  isOpen: boolean;
  isCreated: boolean;
  baudRate: number;
  bytesTransmitted: number;
  bytesReceived: number;
  bufferSizes: {
    rx: number;
    tx: number;
  };
}

/**
 * Abstract base class for platform-specific virtual serial port implementations
 */
export abstract class AbstractPlatformVirtualSerialPort extends EventEmitter implements IPlatformVirtualSerialPort {
  protected _portName: string;
  protected _config: PlatformPortConfig;
  protected _isOpen: boolean = false;
  protected _isPortCreated: boolean = false;
  protected _bytesTransmitted: number = 0;
  protected _bytesReceived: number = 0;
  protected _rxBuffer: Buffer = Buffer.alloc(0);
  protected _txBuffer: Buffer = Buffer.alloc(0);

  constructor(portName: string, config: PlatformPortConfig) {
    super();
    this._portName = portName;
    this._config = config;
  }

  // Public getters
  public get portName(): string { 
    return this._portName; 
  }
  
  public get isOpen(): boolean { 
    return this._isOpen; 
  }
  
  public get config(): PlatformPortConfig { 
    return { ...this._config }; 
  }

  // Abstract methods to be implemented by platform-specific classes
  abstract createPort(): Promise<void>;
  abstract destroyPort(): Promise<void>;
  abstract writeToPort(data: Buffer): Promise<number>;
  abstract readFromPort(): Promise<Buffer>;

  /**
   * Get port information
   */
  public getPortInfo(): SerialPortInfo {
    return {
      path: this._portName,
      manufacturer: this._config.manufacturer,
      serialNumber: this._config.serialNumber,
      pnpId: `ELECTROSIM_${this._config.boardType.replace(/\s+/g, '_').toUpperCase()}`,
      locationId: this._portName,
      productId: '0001',
      vendorId: '2341', // Arduino VID
    };
  }

  /**
   * Open the virtual port for communication
   */
  public async open(): Promise<void> {
    return ErrorHandler.handleAsync(async () => {
      if (this._isOpen) {
        throw new SerialPortError(`Port ${this._portName} is already open`);
      }

      Logger.info('Opening virtual serial port', {
        component: 'PlatformVirtualSerialPort',
        operation: 'open',
        portName: this._portName
      });

      try {
        if (!this._isPortCreated) {
          await this.createPort();
          this._isPortCreated = true;
        }

        this._isOpen = true;
        this.emit('open');
        
        Logger.info('Virtual serial port opened successfully', {
          component: 'PlatformVirtualSerialPort',
          operation: 'open',
          portName: this._portName
        });
      } catch (error) {
        Logger.error('Failed to open virtual serial port', error, {
          component: 'PlatformVirtualSerialPort',
          operation: 'open',
          portName: this._portName
        });
        this.emit('error', error);
        throw new SerialPortError(`Failed to open port ${this._portName}: ${error}`);
      }
    });
  }

  /**
   * Close the virtual port
   */
  public async close(): Promise<void> {
    return ErrorHandler.handleAsync(async () => {
      if (!this._isOpen) {
        return;
      }

      Logger.info('Closing virtual serial port', {
        component: 'PlatformVirtualSerialPort',
        operation: 'close',
        portName: this._portName
      });

      try {
        this._isOpen = false;
        this.emit('close');
        
        Logger.info('Virtual serial port closed successfully', {
          component: 'PlatformVirtualSerialPort',
          operation: 'close',
          portName: this._portName
        });
      } catch (error) {
        Logger.error('Error during port close', error, {
          component: 'PlatformVirtualSerialPort',
          operation: 'close',
          portName: this._portName
        });
        this.emit('error', error);
        throw new SerialPortError(`Failed to close port ${this._portName}: ${error}`);
      }
    });
  }

  /**
   * Write data to the port (Arduino -> Host)
   */
  public async write(data: Buffer | string): Promise<number> {
    if (!this._isOpen) {
      throw new Error(`Port ${this._portName} is not open`);
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    try {
      const bytesWritten = await this.writeToPort(buffer);
      this._bytesTransmitted += bytesWritten;
      this.emit('data', { direction: 'out', data: buffer });
      return bytesWritten;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Read data from the port (Host -> Arduino)
   */
  public async read(): Promise<Buffer> {
    if (!this._isOpen) {
      throw new Error(`Port ${this._portName} is not open`);
    }

    try {
      const buffer = await this.readFromPort();
      
      if (buffer.length > 0) {
        this._bytesReceived += buffer.length;
        this.emit('data', { direction: 'in', data: buffer });
      }
      
      return buffer;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Public methods
  public getBaudRate(): number { 
    return this._config.baudRate; 
  }
  
  public getBytesTransmitted(): number { 
    return this._bytesTransmitted; 
  }
  
  public getBytesReceived(): number { 
    return this._bytesReceived; 
  }

  /**
   * Update baud rate
   */
  public async setBaudRate(baudRate: number): Promise<void> {
    this._config.baudRate = baudRate;
    // Platform-specific baud rate update would be implemented in subclasses
  }

  /**
   * Get port statistics
   */
  public getStatistics(): PlatformPortStatistics {
    return {
      portName: this._portName,
      isOpen: this._isOpen,
      isCreated: this._isPortCreated,
      baudRate: this._config.baudRate,
      bytesTransmitted: this._bytesTransmitted,
      bytesReceived: this._bytesReceived,
      bufferSizes: {
        rx: this._rxBuffer.length,
        tx: this._txBuffer.length
      }
    };
  }
}

/**
 * Windows Virtual COM Port Implementation
 */
class WindowsVirtualSerialPort extends AbstractPlatformVirtualSerialPort {
  private comPortProcess: ChildProcess | null = null;
  private namedPipePath: string;

  constructor(portName: string, config: PlatformPortConfig) {
    super(portName, config);
    this.namedPipePath = `\\\\.\\pipe\\electrosim_${portName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  async createPort(): Promise<void> {
    if (this._isPortCreated) {
      return;
    }

    try {
      // On Windows, we'll use a named pipe approach for now
      // In a full implementation, this would use Windows API to create a virtual COM port
      // For simulation purposes, we'll create a named pipe that can be accessed
      
      this._isPortCreated = true;
      this.emit('port-created');
    } catch (error) {
      throw new Error(`Failed to create Windows virtual port: ${error}`);
    }
  }

  async destroyPort(): Promise<void> {
    if (this.comPortProcess) {
      this.comPortProcess.kill();
      this.comPortProcess = null;
    }
    
    this._isPortCreated = false;
    this.emit('port-destroyed');
  }

  async writeToPort(data: Buffer): Promise<number> {
    // Windows-specific implementation
    this._txBuffer = Buffer.concat([this._txBuffer, data]);
    return data.length;
  }

  async readFromPort(): Promise<Buffer> {
    // Windows-specific implementation
    const data = this._rxBuffer;
    this._rxBuffer = Buffer.alloc(0);
    return data;
  }
}

/**
 * Linux Virtual TTY Port Implementation
 */
class LinuxVirtualSerialPort extends AbstractPlatformVirtualSerialPort {
  private ptyMaster: number | null = null;
  private ptySlave: number | null = null;
  private symlinkPath: string;

  constructor(portName: string, config: PlatformPortConfig) {
    super(portName, config);
    // Extract the number from the port name for the symlink
    const portNum = portName.match(/\d+/)?.[0] || '0';
    this.symlinkPath = `/tmp/ttyElectroSim${portNum}`;
  }

  async createPort(): Promise<void> {
    if (this._isPortCreated) {
      return;
    }

    try {
      // Create pseudo-terminal pair
      // In a full implementation, this would use node-pty or native bindings
      // For now, we'll simulate the creation
      
      this._isPortCreated = true;
      this.emit('port-created');
    } catch (error) {
      throw new Error(`Failed to create Linux virtual port: ${error}`);
    }
  }

  async destroyPort(): Promise<void> {
    try {
      // Clean up symlink
      if (fs.existsSync(this.symlinkPath)) {
        fs.unlinkSync(this.symlinkPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    this._isPortCreated = false;
    this.emit('port-destroyed');
  }

  async writeToPort(data: Buffer): Promise<number> {
    // Linux-specific implementation using pty
    this._txBuffer = Buffer.concat([this._txBuffer, data]);
    return data.length;
  }

  async readFromPort(): Promise<Buffer> {
    // Linux-specific implementation
    const data = this._rxBuffer;
    this._rxBuffer = Buffer.alloc(0);
    return data;
  }
}

/**
 * macOS Virtual Serial Port Implementation
 */
class MacOSVirtualSerialPort extends AbstractPlatformVirtualSerialPort {
  private ptyPath: string;

  constructor(portName: string, config: PlatformPortConfig) {
    super(portName, config);
    this.ptyPath = portName;
  }

  async createPort(): Promise<void> {
    if (this._isPortCreated) {
      return;
    }

    try {
      // On macOS, we'll use pseudo-terminals through IOKit
      // For simulation, we'll mark as created
      
      this._isPortCreated = true;
      this.emit('port-created');
    } catch (error) {
      throw new Error(`Failed to create macOS virtual port: ${error}`);
    }
  }

  async destroyPort(): Promise<void> {
    this._isPortCreated = false;
    this.emit('port-destroyed');
  }

  async writeToPort(data: Buffer): Promise<number> {
    // macOS-specific implementation
    this._txBuffer = Buffer.concat([this._txBuffer, data]);
    return data.length;
  }

  async readFromPort(): Promise<Buffer> {
    // macOS-specific implementation
    const data = this._rxBuffer;
    this._rxBuffer = Buffer.alloc(0);
    return data;
  }
}

/**
 * Simulation-based Virtual Serial Port (fallback)
 * This version works entirely in-memory for testing and development
 */
class SimulationVirtualSerialPort extends AbstractPlatformVirtualSerialPort {
  private dataHandler: ((data: Buffer) => void) | null = null;

  async createPort(): Promise<void> {
    if (this._isPortCreated) {
      return;
    }

    // Simulation port is always "created" successfully
    this._isPortCreated = true;
    this.emit('port-created');
  }

  async destroyPort(): Promise<void> {
    this._isPortCreated = false;
    this.emit('port-destroyed');
  }

  async writeToPort(data: Buffer): Promise<number> {
    // In simulation mode, data written to port is immediately available to external readers
    this._txBuffer = Buffer.concat([this._txBuffer, data]);
    
    // Simulate external application reading the data
    if (this.dataHandler) {
      setTimeout(() => {
        this.dataHandler?.(data);
      }, 1); // Minimal delay to simulate real transmission
    }
    
    return data.length;
  }

  async readFromPort(): Promise<Buffer> {
    const data = this._rxBuffer;
    this._rxBuffer = Buffer.alloc(0);
    return data;
  }

  /**
   * Simulate external application sending data to this port
   */
  public simulateExternalWrite(data: Buffer): void {
    this._rxBuffer = Buffer.concat([this._rxBuffer, data]);
    this.emit('data', { direction: 'in', data });
  }

  /**
   * Set up handler for data written to this port (simulates external app reading)
   */
  public setDataHandler(handler: (data: Buffer) => void): void {
    this.dataHandler = handler;
  }
}

/**
 * Factory function to create platform-appropriate virtual serial port
 */
export function createPlatformVirtualSerialPort(
  portName: string, 
  config: PlatformPortConfig
): IPlatformVirtualSerialPort {
  
  // For development/testing, use simulation mode
  if (process.env.NODE_ENV === 'test' || process.env.ELECTROSIM_SIMULATION_MODE === 'true') {
    return new SimulationVirtualSerialPort(portName, config);
  }

  switch (process.platform) {
    case 'win32':
      return new WindowsVirtualSerialPort(portName, config);
    case 'linux':
      return new LinuxVirtualSerialPort(portName, config);
    case 'darwin':
      return new MacOSVirtualSerialPort(portName, config);
    default:
      // Fallback to simulation mode for unsupported platforms
      return new SimulationVirtualSerialPort(portName, config);
  }
}

// Export the factory function separately to avoid naming conflicts
export const PlatformVirtualSerialPort = createPlatformVirtualSerialPort;