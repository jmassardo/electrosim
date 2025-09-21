/**
 * Serial Port Manager
 * Manages virtual serial ports and provides cross-platform COM port creation
 */

import { VirtualSerialPort, SerialPortInfo } from '../simulation/virtual-port/VirtualSerialPort';
import { PlatformVirtualSerialPort, IPlatformVirtualSerialPort } from './PlatformVirtualSerialPort';
import { EventEmitter } from 'events';

export interface SerialPortManagerOptions {
  startingPortNumber?: number;
  maxPorts?: number;
  enableLogging?: boolean;
}

export interface VirtualPortConfig {
  portName?: string;
  baudRate?: number;
  boardType?: string;
  description?: string;
  manufacturer?: string;
  serialNumber?: string;
}

export class SerialPortManager extends EventEmitter {
  private ports: Map<string, IPlatformVirtualSerialPort> = new Map();
  private nextPortNumber: number = 3; // Start at COM3
  private maxPorts: number = 16;
  private enableLogging: boolean = false;

  constructor(options: SerialPortManagerOptions = {}) {
    super();
    this.nextPortNumber = options.startingPortNumber || 3;
    this.maxPorts = options.maxPorts || 16;
    this.enableLogging = options.enableLogging || false;
    
    this.log('SerialPortManager initialized');
  }

  /**
   * Create a virtual serial port that appears in system device manager
   */
  public async createVirtualPort(config: VirtualPortConfig = {}): Promise<IPlatformVirtualSerialPort> {
    const portName = config.portName || this.generatePortName();
    
    if (this.ports.has(portName)) {
      throw new Error(`Port ${portName} already exists`);
    }

    if (this.ports.size >= this.maxPorts) {
      throw new Error(`Maximum number of ports (${this.maxPorts}) reached`);
    }

    this.log(`Creating virtual port: ${portName}`);

    const port = PlatformVirtualSerialPort(portName, {
      baudRate: config.baudRate || 9600,
      boardType: config.boardType || 'Arduino Uno',
      description: config.description || 'Arduino Simulator Virtual Port',
      manufacturer: config.manufacturer || 'ElectroSim',
      serialNumber: config.serialNumber || this.generateSerialNumber(portName)
    });

    try {
      await port.createPort();
      this.ports.set(portName, port);
      
      // Set up event forwarding
      port.on('data', (data) => this.emit('data', { port: portName, data }));
      port.on('error', (error) => this.emit('error', { port: portName, error }));
      port.on('open', () => this.emit('port-opened', portName));
      port.on('close', () => this.emit('port-closed', portName));

      this.log(`Virtual port created successfully: ${portName}`);
      this.emit('port-created', portName);
      
      return port;
    } catch (error) {
      this.log(`Failed to create virtual port ${portName}: ${error}`);
      throw error;
    }
  }

  /**
   * Create multiple virtual ports (for Arduino Mega with multiple UARTs)
   */
  public async createMultiplePorts(count: number, baseConfig: VirtualPortConfig = {}): Promise<IPlatformVirtualSerialPort[]> {
    if (count <= 0 || count > 8) {
      throw new Error('Port count must be between 1 and 8');
    }

    if (this.ports.size + count > this.maxPorts) {
      throw new Error(`Cannot create ${count} ports. Would exceed maximum (${this.maxPorts})`);
    }

    const ports: IPlatformVirtualSerialPort[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const config = {
          ...baseConfig,
          portName: baseConfig.portName ? `${baseConfig.portName}_${i}` : undefined,
          description: `${baseConfig.description || 'Arduino Simulator'} Serial${i}`,
          serialNumber: baseConfig.serialNumber ? `${baseConfig.serialNumber}-${i}` : undefined
        };
        
        const port = await this.createVirtualPort(config);
        ports.push(port);
      } catch (error) {
        // Clean up any ports created before the failure
        for (const createdPort of ports) {
          await this.destroyVirtualPort(createdPort.portName).catch(() => {});
        }
        throw error;
      }
    }

    this.log(`Created ${count} virtual ports successfully`);
    return ports;
  }

  /**
   * Destroy a virtual serial port
   */
  public async destroyVirtualPort(portName: string): Promise<void> {
    const port = this.ports.get(portName);
    if (!port) {
      this.log(`Port ${portName} not found for destruction`);
      return;
    }

    this.log(`Destroying virtual port: ${portName}`);

    try {
      await port.destroyPort();
      this.ports.delete(portName);
      
      this.log(`Virtual port destroyed successfully: ${portName}`);
      this.emit('port-destroyed', portName);
    } catch (error) {
      this.log(`Failed to destroy virtual port ${portName}: ${error}`);
      throw error;
    }
  }

  /**
   * Get a virtual port by name
   */
  public getPortByName(portName: string): IPlatformVirtualSerialPort | undefined {
    return this.ports.get(portName);
  }

  /**
   * List all virtual ports
   */
  public listVirtualPorts(): SerialPortInfo[] {
    return Array.from(this.ports.values()).map(port => port.getPortInfo());
  }

  /**
   * Get port names in platform-specific format
   */
  public getPlatformPortNames(): string[] {
    return Array.from(this.ports.keys());
  }

  /**
   * Close and destroy all virtual ports
   */
  public async destroyAllPorts(): Promise<void> {
    this.log('Destroying all virtual ports');
    
    const destroyPromises = Array.from(this.ports.keys()).map(portName => 
      this.destroyVirtualPort(portName).catch(error => {
        this.log(`Failed to destroy port ${portName}: ${error}`);
      })
    );

    await Promise.allSettled(destroyPromises);
    this.ports.clear();
    
    this.log('All virtual ports destroyed');
  }

  /**
   * Check if a port exists
   */
  public hasPort(portName: string): boolean {
    return this.ports.has(portName);
  }

  /**
   * Get the number of active ports
   */
  public getPortCount(): number {
    return this.ports.size;
  }

  /**
   * Get statistics for all ports
   */
  public getStatistics(): {
    totalPorts: number;
    activePorts: number;
    openPorts: number;
    platformPortNames: string[];
    portDetails: Array<{
      name: string;
      isOpen: boolean;
      baudRate: number;
      bytesTransmitted: number;
      bytesReceived: number;
    }>;
  } {
    const portDetails = Array.from(this.ports.entries()).map(([name, port]) => ({
      name,
      isOpen: port.isOpen,
      baudRate: port.getBaudRate(),
      bytesTransmitted: port.getBytesTransmitted(),
      bytesReceived: port.getBytesReceived()
    }));

    return {
      totalPorts: this.ports.size,
      activePorts: this.ports.size,
      openPorts: portDetails.filter(p => p.isOpen).length,
      platformPortNames: this.getPlatformPortNames(),
      portDetails
    };
  }

  /**
   * Generate platform-appropriate port name
   */
  private generatePortName(): string {
    let portName: string;
    let attempts = 0;
    const maxAttempts = this.maxPorts * 2;

    do {
      if (process.platform === 'win32') {
        portName = `COM${this.nextPortNumber}`;
      } else if (process.platform === 'darwin') {
        portName = `/dev/cu.ElectroSim${this.nextPortNumber.toString().padStart(3, '0')}`;
      } else {
        portName = `/dev/ttyElectroSim${this.nextPortNumber}`;
      }
      
      this.nextPortNumber++;
      attempts++;

      // Reset port number if it gets too high
      if (this.nextPortNumber > 99) {
        this.nextPortNumber = 3;
      }

      if (attempts > maxAttempts) {
        throw new Error('Unable to generate unique port name');
      }
    } while (this.ports.has(portName));

    return portName;
  }

  /**
   * Generate serial number for a port
   */
  private generateSerialNumber(portName: string): string {
    const timestamp = Date.now().toString(36);
    const portHash = portName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `ES${portHash}${timestamp}`.substring(0, 16);
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[SerialPortManager] ${message}`);
    }
  }
}

// Singleton instance
let serialPortManagerInstance: SerialPortManager | null = null;

/**
 * Get singleton SerialPortManager instance
 */
export function getSerialPortManager(options?: SerialPortManagerOptions): SerialPortManager {
  if (!serialPortManagerInstance) {
    serialPortManagerInstance = new SerialPortManager(options);
  }
  return serialPortManagerInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetSerialPortManager(): void {
  if (serialPortManagerInstance) {
    serialPortManagerInstance.destroyAllPorts().catch(() => {});
    serialPortManagerInstance = null;
  }
}