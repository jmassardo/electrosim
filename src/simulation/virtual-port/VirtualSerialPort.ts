/**
 * Virtual Serial Port
 * Provides bidirectional Arduino-host communication simulation
 * Supports configurable baud rates, realistic timing, and full Serial API
 */

export interface SerialConfig {
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  flowControl: 'none' | 'rts/cts' | 'xon/xoff';
  timeout: number; // milliseconds
}

export interface SerialFrame {
  data: Buffer;
  timestamp: number;
  direction: 'in' | 'out';
  port: string;
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

export class VirtualSerialPort extends EventTarget {
  private config: SerialConfig;
  private isOpen: boolean = false;
  private portName: string;
  private rxBuffer: Buffer = Buffer.alloc(0);
  private txBuffer: Buffer = Buffer.alloc(0);
  private transmissionTimer: NodeJS.Timeout | null = null;

  // Arduino Serial simulation state
  private available: number = 0;
  private peek: number = -1;

  constructor(portName: string, config: Partial<SerialConfig> = {}) {
    super();
    this.portName = portName;
    this.config = {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
      timeout: 1000,
      ...config
    };
  }

  /**
   * Open the virtual serial port
   */
  public async open(): Promise<void> {
    if (this.isOpen) {
      throw new Error('Port is already open');
    }

    this.isOpen = true;
    this.rxBuffer = Buffer.alloc(0);
    this.txBuffer = Buffer.alloc(0);
    this.available = 0;
    this.peek = -1;

    this.dispatchEvent(new CustomEvent('open'));
  }

  /**
   * Close the virtual serial port
   */
  public async close(): Promise<void> {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    
    if (this.transmissionTimer) {
      clearTimeout(this.transmissionTimer);
      this.transmissionTimer = null;
    }

    this.dispatchEvent(new CustomEvent('close'));
  }

  /**
   * Write data to the serial port (host -> Arduino)
   */
  public async write(data: string | Buffer): Promise<void> {
    if (!this.isOpen) {
      throw new Error('Port is not open');
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    
    // Add to RX buffer (from Arduino's perspective)
    this.rxBuffer = Buffer.concat([this.rxBuffer, buffer]);
    this.available += buffer.length;

    // Update peek value
    if (this.peek === -1 && this.available > 0) {
      this.peek = this.rxBuffer[0];
    }

    // Emit data event for Arduino to process
    this.dispatchEvent(new CustomEvent('data', { 
      detail: { 
        data: buffer,
        direction: 'in' as const,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Read data from the serial port (Arduino -> host)
   */
  public async read(size?: number): Promise<Buffer> {
    if (!this.isOpen) {
      throw new Error('Port is not open');
    }

    if (this.txBuffer.length === 0) {
      return Buffer.alloc(0);
    }

    const readSize = size ? Math.min(size, this.txBuffer.length) : this.txBuffer.length;
    const data = this.txBuffer.slice(0, readSize);
    this.txBuffer = this.txBuffer.slice(readSize);

    return data;
  }

  /**
   * Get port configuration
   */
  public getConfig(): SerialConfig {
    return { ...this.config };
  }

  /**
   * Update port configuration
   */
  public async updateConfig(config: Partial<SerialConfig>): Promise<void> {
    if (this.isOpen) {
      throw new Error('Cannot update config while port is open');
    }
    
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if port is open
   */
  public get isPortOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get port name
   */
  public get path(): string {
    return this.portName;
  }

  // Arduino Serial API Methods

  /**
   * Arduino Serial.available()
   */
  public serialAvailable(): number {
    return this.available;
  }

  /**
   * Arduino Serial.read()
   */
  public serialRead(): number {
    if (this.available === 0) {
      return -1;
    }

    const byte = this.rxBuffer[0];
    this.rxBuffer = this.rxBuffer.slice(1);
    this.available--;

    // Update peek value
    if (this.available > 0) {
      this.peek = this.rxBuffer[0];
    } else {
      this.peek = -1;
    }

    return byte;
  }

  /**
   * Arduino Serial.peek()
   */
  public serialPeek(): number {
    return this.peek;
  }

  /**
   * Arduino Serial.print()
   */
  public serialPrint(data: string | number): void {
    const buffer = Buffer.from(String(data), 'utf8');
    this.serialWrite(buffer);
  }

  /**
   * Arduino Serial.println()
   */
  public serialPrintln(data: string | number = ''): void {
    const buffer = Buffer.from(String(data) + '\\r\\n', 'utf8');
    this.serialWrite(buffer);
  }

  /**
   * Arduino Serial.write()
   */
  public serialWrite(data: Buffer | number | number[]): void {
    if (!this.isOpen) {
      return;
    }

    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (typeof data === 'number') {
      buffer = Buffer.from([data]);
    } else {
      buffer = Buffer.from(data);
    }

    // Calculate transmission timing based on baud rate
    const bitsPerByte = this.config.dataBits + this.config.stopBits + (this.config.parity !== 'none' ? 1 : 0) + 1; // +1 for start bit
    const transmissionTimeMs = (buffer.length * bitsPerByte * 1000) / this.config.baudRate;

    // Add to TX buffer
    this.txBuffer = Buffer.concat([this.txBuffer, buffer]);

    // Schedule transmission with realistic timing
    if (this.transmissionTimer) {
      clearTimeout(this.transmissionTimer);
    }

    this.transmissionTimer = setTimeout(() => {
      this.dispatchEvent(new CustomEvent('data', {
        detail: {
          data: buffer,
          direction: 'out' as const,
          timestamp: Date.now()
        }
      }));
      this.transmissionTimer = null;
    }, transmissionTimeMs);
  }

  /**
   * Arduino Serial.flush()
   */
  public serialFlush(): void {
    // Wait for transmission to complete
    if (this.transmissionTimer) {
      // In real implementation, this would block until transmission is done
      // For simulation, we'll just trigger immediate transmission
      clearTimeout(this.transmissionTimer);
      this.transmissionTimer = null;
    }
  }

  /**
   * Arduino Serial.readString()
   */
  public serialReadString(): string {
    const buffer = Buffer.alloc(this.available);
    let index = 0;

    while (this.available > 0 && index < buffer.length) {
      const byte = this.serialRead();
      if (byte !== -1) {
        buffer[index++] = byte;
      }
    }

    return buffer.slice(0, index).toString('utf8');
  }

  /**
   * Arduino Serial.readStringUntil()
   */
  public serialReadStringUntil(terminator: string): string {
    const terminatorCode = terminator.charCodeAt(0);
    const buffer: number[] = [];

    while (this.available > 0) {
      const byte = this.serialRead();
      if (byte === -1) break;
      if (byte === terminatorCode) break;
      buffer.push(byte);
    }

    return Buffer.from(buffer).toString('utf8');
  }

  /**
   * Get transmission statistics
   */
  public getStats(): {
    bytesReceived: number;
    bytesSent: number;
    rxBufferSize: number;
    txBufferSize: number;
    baudRate: number;
    isOpen: boolean;
  } {
    return {
      bytesReceived: this.rxBuffer.length,
      bytesSent: this.txBuffer.length,
      rxBufferSize: this.available,
      txBufferSize: this.txBuffer.length,
      baudRate: this.config.baudRate,
      isOpen: this.isOpen
    };
  }
}

/**
 * Virtual Serial Port Manager
 * Manages multiple virtual serial ports and provides discovery
 */
export class VirtualSerialPortManager {
  private ports: Map<string, VirtualSerialPort> = new Map();
  private static instance: VirtualSerialPortManager;

  private constructor() {}

  public static getInstance(): VirtualSerialPortManager {
    if (!VirtualSerialPortManager.instance) {
      VirtualSerialPortManager.instance = new VirtualSerialPortManager();
    }
    return VirtualSerialPortManager.instance;
  }

  /**
   * Create a new virtual serial port
   */
  public createPort(portName: string, config?: Partial<SerialConfig>): VirtualSerialPort {
    if (this.ports.has(portName)) {
      throw new Error(`Port ${portName} already exists`);
    }

    const port = new VirtualSerialPort(portName, config);
    this.ports.set(portName, port);
    return port;
  }

  /**
   * Get an existing virtual serial port
   */
  public getPort(portName: string): VirtualSerialPort | undefined {
    return this.ports.get(portName);
  }

  /**
   * Remove a virtual serial port
   */
  public async removePort(portName: string): Promise<void> {
    const port = this.ports.get(portName);
    if (port) {
      await port.close();
      this.ports.delete(portName);
    }
  }

  /**
   * List all virtual serial ports
   */
  public listPorts(): SerialPortInfo[] {
    return Array.from(this.ports.entries()).map(([path]) => ({
      path,
      manufacturer: 'ElectroSim',
      serialNumber: `ES-${path.replace(/[^a-zA-Z0-9]/g, '')}`,
      pnpId: `ElectroSim\\${path}`,
      locationId: path,
      productId: '0x001',
      vendorId: '0x2341' // Arduino vendor ID
    }));
  }

  /**
   * Get Arduino-style port names (COM1, /dev/ttyUSB0, etc.)
   */
  public getArduinoPortNames(): string[] {
    const platformPorts: string[] = [];
    let index = 0;

    for (const _ of this.ports.keys()) {
      // Generate platform-appropriate port names
      if (process.platform === 'win32') {
        platformPorts.push(`COM${index + 3}`); // Start from COM3
      } else if (process.platform === 'darwin') {
        platformPorts.push(`/dev/cu.usbmodem${(1000 + index).toString(16)}`);
      } else {
        platformPorts.push(`/dev/ttyUSB${index}`);
      }
      index++;
    }

    return platformPorts;
  }

  /**
   * Close all ports
   */
  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.ports.values()).map(port => port.close());
    await Promise.all(closePromises);
    this.ports.clear();
  }
}