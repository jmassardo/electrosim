/**
 * Arduino Serial API Integration
 * Bridges Arduino code Serial calls with VirtualSerialPort
 */

import { VirtualSerialPort, VirtualSerialPortManager } from '../virtual-port/VirtualSerialPort';

export interface ArduinoSerialConfig {
  baudRate: number;
  timeout: number;
  rxBufferSize: number;
  txBufferSize: number;
}

export class ArduinoSerialAPI {
  private port: VirtualSerialPort;
  private config: ArduinoSerialConfig;
  private isInitialized: boolean = false;
  private emulatorInstance: any; // AVR8js CPU instance

  constructor(
    portName: string = 'COM_Arduino_Uno',
    config: Partial<ArduinoSerialConfig> = {}
  ) {
    this.config = {
      baudRate: 9600,
      timeout: 1000,
      rxBufferSize: 64,
      txBufferSize: 64,
      ...config
    };

    // Get or create virtual serial port
    const manager = VirtualSerialPortManager.getInstance();
    this.port = manager.getPort(portName) || manager.createPort(portName, {
      baudRate: this.config.baudRate,
      timeout: this.config.timeout
    });
  }

  /**
   * Connect to AVR8js emulator instance
   */
  public connectEmulator(emulator: any): void {
    this.emulatorInstance = emulator;
    this.setupSerialInterrupts();
  }

  /**
   * Initialize Serial communication (Arduino Serial.begin())
   */
  public begin(baudRate: number = 9600): void {
    this.config.baudRate = baudRate;
    this.isInitialized = true;

    // Update port configuration only if port is closed
    if (!this.port.isPortOpen) {
      this.port.updateConfig({ baudRate }).catch(err => {
        console.error('Failed to update port config:', err);
      });
      
      // Open port
      this.port.open().catch(err => {
        console.error('Failed to open serial port:', err);
      });
    }

    // Emit serial begin event for emulator
    if (this.emulatorInstance) {
      this.emulatorInstance.events?.emit('serial-begin', { baudRate });
    }
  }

  /**
   * Check if Serial is initialized (Arduino if(Serial))
   */
  public get initialized(): boolean {
    return this.isInitialized && this.port.isPortOpen;
  }

  /**
   * Get number of bytes available to read (Arduino Serial.available())
   */
  public available(): number {
    if (!this.isInitialized) return 0;
    return this.port.serialAvailable();
  }

  /**
   * Read a single byte (Arduino Serial.read())
   */
  public read(): number {
    if (!this.isInitialized) return -1;
    return this.port.serialRead();
  }

  /**
   * Peek at the next byte without consuming it (Arduino Serial.peek())
   */
  public peek(): number {
    if (!this.isInitialized) return -1;
    return this.port.serialPeek();
  }

  /**
   * Write a single byte (Arduino Serial.write())
   */
  public write(value: number | Buffer | number[]): number {
    if (!this.isInitialized) return 0;
    
    this.port.serialWrite(value);
    
    if (typeof value === 'number') {
      return 1;
    } else if (Buffer.isBuffer(value)) {
      return value.length;
    } else {
      return value.length;
    }
  }

  /**
   * Print data as human-readable ASCII (Arduino Serial.print())
   */
  public print(data: string | number | boolean): void {
    if (!this.isInitialized) return;
    this.port.serialPrint(String(data));
  }

  /**
   * Print data with newline (Arduino Serial.println())
   */
  public println(data: string | number | boolean = ''): void {
    if (!this.isInitialized) return;
    this.port.serialPrintln(String(data));
  }

  /**
   * Wait for transmission to complete (Arduino Serial.flush())
   */
  public flush(): void {
    if (!this.isInitialized) return;
    this.port.serialFlush();
  }

  /**
   * Read string from buffer (Arduino Serial.readString())
   */
  public readString(): string {
    if (!this.isInitialized) return '';
    return this.port.serialReadString();
  }

  /**
   * Read string until terminator (Arduino Serial.readStringUntil())
   */
  public readStringUntil(terminator: string): string {
    if (!this.isInitialized) return '';
    return this.port.serialReadStringUntil(terminator);
  }

  /**
   * Read bytes into buffer (Arduino Serial.readBytes())
   */
  public readBytes(buffer: Buffer, length: number): number {
    if (!this.isInitialized || length <= 0) return 0;

    let bytesRead = 0;
    for (let i = 0; i < length && this.available() > 0; i++) {
      const byte = this.read();
      if (byte === -1) break;
      buffer[i] = byte;
      bytesRead++;
    }

    return bytesRead;
  }

  /**
   * Read bytes until terminator (Arduino Serial.readBytesUntil())
   */
  public readBytesUntil(terminator: number, buffer: Buffer, length: number): number {
    if (!this.isInitialized || length <= 0) return 0;

    let bytesRead = 0;
    for (let i = 0; i < length && this.available() > 0; i++) {
      const byte = this.read();
      if (byte === -1 || byte === terminator) break;
      buffer[i] = byte;
      bytesRead++;
    }

    return bytesRead;
  }

  /**
   * Parse integer from serial input (Arduino Serial.parseInt())
   */
  public parseInt(skipChar: string = '\\x01'): number {
    if (!this.isInitialized) return 0;

    let value = 0;
    let isNegative = false;
    let hasDigits = false;
    const skipCharCode = skipChar.charCodeAt(0);

    // Skip whitespace and specified characters
    while (this.available() > 0) {
      const byte = this.peek();
      if (byte === -1) break;
      
      if (byte === skipCharCode || byte === 32 || byte === 9 || byte === 10 || byte === 13) {
        this.read(); // consume
        continue;
      }
      break;
    }

    // Check for negative sign
    if (this.available() > 0 && this.peek() === 45) { // '-'
      isNegative = true;
      this.read();
    }

    // Read digits
    while (this.available() > 0) {
      const byte = this.peek();
      if (byte >= 48 && byte <= 57) { // '0' to '9'
        value = value * 10 + (byte - 48);
        hasDigits = true;
        this.read();
      } else {
        break;
      }
    }

    return hasDigits ? (isNegative ? -value : value) : 0;
  }

  /**
   * Parse float from serial input (Arduino Serial.parseFloat())
   */
  public parseFloat(): number {
    if (!this.isInitialized) return 0;

    const str = this.readStringUntil('\n').trim();
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get the underlying VirtualSerialPort
   */
  public getPort(): VirtualSerialPort {
    return this.port;
  }

  /**
   * Get serial statistics
   */
  public getStats(): {
    initialized: boolean;
    baudRate: number;
    available: number;
    rxBuffer: number;
    txBuffer: number;
  } {
    const portStats = this.port.getStats();
    return {
      initialized: this.isInitialized,
      baudRate: this.config.baudRate,
      available: this.available(),
      rxBuffer: portStats.rxBufferSize,
      txBuffer: portStats.txBufferSize
    };
  }

  /**
   * Setup serial interrupts for AVR8js emulator
   */
  private setupSerialInterrupts(): void {
    if (!this.emulatorInstance) return;

    // UART receive interrupt
    this.emulatorInstance.uart.onByteTransmit = (byte: number) => {
      this.port.serialWrite(Buffer.from([byte]));
    };

    // Handle incoming bytes from host
    this.port.addEventListener('data', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { data, direction } = customEvent.detail;
      
      if (direction === 'in' && this.emulatorInstance.uart) {
        // Send bytes to emulator UART
        for (const byte of data) {
          this.emulatorInstance.uart.onByteReceive?.(byte);
        }
      }
    });
  }

  /**
   * Close serial connection (Arduino Serial.end())
   */
  public end(): void {
    this.isInitialized = false;
    this.port.close().catch(err => {
      console.error('Failed to close serial port:', err);
    });

    if (this.emulatorInstance) {
      this.emulatorInstance.events?.emit('serial-end');
    }
  }
}

/**
 * Global Arduino Serial instance factory
 * Matches Arduino's global Serial object
 */
export class ArduinoSerialManager {
  private static instance: ArduinoSerialManager;
  private serialInstances: Map<string, ArduinoSerialAPI> = new Map();

  private constructor() {}

  public static getInstance(): ArduinoSerialManager {
    if (!ArduinoSerialManager.instance) {
      ArduinoSerialManager.instance = new ArduinoSerialManager();
    }
    return ArduinoSerialManager.instance;
  }

  /**
   * Get or create Serial instance for emulator
   */
  public getSerial(emulatorId: string = 'default'): ArduinoSerialAPI {
    if (!this.serialInstances.has(emulatorId)) {
      const portName = `COM_Arduino_${emulatorId}`;
      const serial = new ArduinoSerialAPI(portName);
      this.serialInstances.set(emulatorId, serial);
    }
    
    return this.serialInstances.get(emulatorId)!;
  }

  /**
   * Connect emulator to its Serial instance
   */
  public connectEmulator(emulator: any, emulatorId: string = 'default'): ArduinoSerialAPI {
    const serial = this.getSerial(emulatorId);
    serial.connectEmulator(emulator);
    return serial;
  }

  /**
   * Remove Serial instance
   */
  public removeSerial(emulatorId: string): void {
    const serial = this.serialInstances.get(emulatorId);
    if (serial) {
      serial.end();
      this.serialInstances.delete(emulatorId);
    }
  }

  /**
   * Get all active Serial instances
   */
  public getAllSerials(): Map<string, ArduinoSerialAPI> {
    return new Map(this.serialInstances);
  }

  /**
   * Close all Serial instances
   */
  public closeAll(): void {
    for (const serial of this.serialInstances.values()) {
      serial.end();
    }
    this.serialInstances.clear();
  }
}