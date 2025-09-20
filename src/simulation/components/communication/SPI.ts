/**
 * SPI Communication Module
 * Simulates SPI (Serial Peripheral Interface) bus communication for Arduino
 * Supports master mode with multiple slave devices
 */

export interface SPIConfig {
  clockSpeed: number;    // Hz (up to 8MHz for Arduino Uno)
  bitOrder: 'MSBFIRST' | 'LSBFIRST';
  dataMode: 0 | 1 | 2 | 3; // Clock polarity and phase
  maxSlaves: number;     // Maximum number of slave devices
  timeout: number;       // milliseconds
}

export interface SPIDevice {
  slaveSelectPin: number;
  name: string;
  registers: Map<number, number>;
  isSelected: boolean;
  isConnected: boolean;
  maxClockSpeed: number; // Maximum supported clock speed
  powerConsumption: number; // mA
  responseDelay: number; // microseconds
  bufferSize: number;    // bytes
}

export interface SPITransaction {
  slaveSelectPin: number;
  operation: 'read' | 'write' | 'transfer';
  dataOut: number[];
  dataIn: number[];
  success: boolean;
  timestamp: number;
  duration: number; // microseconds
  clockSpeed: number;
}

export interface SPIBusState {
  miso: boolean; // Master In Slave Out
  mosi: boolean; // Master Out Slave In
  sck: boolean;  // Serial Clock
  busy: boolean;
  activeSlavePin?: number;
  clockSpeed: number;
  devicesConnected: number;
}

export class SPI {
  private config: SPIConfig;
  private devices: Map<number, SPIDevice> = new Map();
  private isInitialized: boolean = false;
  private transactions: SPITransaction[] = [];
  
  // Bus state
  private busState: SPIBusState = {
    miso: false,
    mosi: false,
    sck: false,
    busy: false,
    clockSpeed: 4000000, // 4MHz default
    devicesConnected: 0
  };
  
  // Pin assignments
  private pins = {
    miso: 12,  // Pin 12 on Arduino Uno
    mosi: 11,  // Pin 11 on Arduino Uno
    sck: 13,   // Pin 13 on Arduino Uno
    ss: 10     // Pin 10 on Arduino Uno (default slave select)
  };
  
  // Timing simulation
  private lastTransactionTime: number = 0;
  private bitDuration: number = 0.25; // microseconds (4MHz)
  
  // Data modes configuration
  private readonly DATA_MODES = {
    0: { cpol: false, cpha: false }, // Clock idle low, data sampled on rising edge
    1: { cpol: false, cpha: true },  // Clock idle low, data sampled on falling edge
    2: { cpol: true, cpha: false },  // Clock idle high, data sampled on falling edge
    3: { cpol: true, cpha: true }    // Clock idle high, data sampled on rising edge
  };
  
  // Callbacks
  private onTransactionCallback?: (transaction: SPITransaction) => void;
  private onDeviceConnectedCallback?: (device: SPIDevice) => void;
  private onSlaveSelectCallback?: (pin: number, selected: boolean) => void;

  constructor(config: Partial<SPIConfig> = {}) {
    this.config = {
      clockSpeed: 4000000, // 4MHz default
      bitOrder: 'MSBFIRST',
      dataMode: 0,
      maxSlaves: 8,
      timeout: 1000,
      ...config
    };
    
    this.bitDuration = 1000000 / this.config.clockSpeed; // microseconds
    this.busState.clockSpeed = this.config.clockSpeed;
  }

  /**
   * Initialize SPI bus
   */
  public begin(): boolean {
    this.isInitialized = true;
    
    // Set initial pin states
    this.busState.sck = this.DATA_MODES[this.config.dataMode].cpol;
    this.busState.mosi = false;
    this.busState.miso = false;
    this.busState.busy = false;
    
    return true;
  }

  /**
   * Set clock speed
   */
  public setClockDivider(divider: 2 | 4 | 8 | 16 | 32 | 64 | 128): void {
    const baseFrequency = 16000000; // 16MHz Arduino Uno clock
    this.config.clockSpeed = baseFrequency / divider;
    this.busState.clockSpeed = this.config.clockSpeed;
    this.bitDuration = 1000000 / this.config.clockSpeed;
  }

  /**
   * Set data mode (clock polarity and phase)
   */
  public setDataMode(mode: 0 | 1 | 2 | 3): void {
    this.config.dataMode = mode;
    this.busState.sck = this.DATA_MODES[mode].cpol;
  }

  /**
   * Set bit order
   */
  public setBitOrder(order: 'MSBFIRST' | 'LSBFIRST'): void {
    this.config.bitOrder = order;
  }

  /**
   * Transfer single byte
   */
  public transfer(data: number, slaveSelectPin?: number): number {
    if (!this.isInitialized) return 0;
    
    const ssPin = slaveSelectPin || this.pins.ss;
    const device = this.devices.get(ssPin);
    
    if (!device || !device.isConnected) {
      this.recordTransaction({
        slaveSelectPin: ssPin,
        operation: 'transfer',
        dataOut: [data],
        dataIn: [0],
        success: false,
        timestamp: Date.now(),
        duration: 0,
        clockSpeed: this.config.clockSpeed
      });
      return 0;
    }
    
    // Select device
    this.selectDevice(ssPin);
    
    // Simulate transmission timing (8 bits)
    const transmissionTime = 8 * this.bitDuration + device.responseDelay;
    this.simulateDelay(transmissionTime);
    
    // Generate response data (in real device, this would be actual response)
    const responseData = this.generateResponseByte(device, data);
    
    // Deselect device
    this.deselectDevice(ssPin);
    
    this.recordTransaction({
      slaveSelectPin: ssPin,
      operation: 'transfer',
      dataOut: [data],
      dataIn: [responseData],
      success: true,
      timestamp: Date.now(),
      duration: transmissionTime,
      clockSpeed: this.config.clockSpeed
    });
    
    return responseData;
  }

  /**
   * Transfer multiple bytes
   */
  public transferBytes(data: number[], slaveSelectPin?: number): number[] {
    if (!this.isInitialized || data.length === 0) return [];
    
    const ssPin = slaveSelectPin || this.pins.ss;
    const device = this.devices.get(ssPin);
    
    if (!device || !device.isConnected) {
      this.recordTransaction({
        slaveSelectPin: ssPin,
        operation: 'transfer',
        dataOut: data,
        dataIn: [],
        success: false,
        timestamp: Date.now(),
        duration: 0,
        clockSpeed: this.config.clockSpeed
      });
      return [];
    }
    
    // Select device
    this.selectDevice(ssPin);
    
    const responseData: number[] = [];
    const transmissionTime = data.length * 8 * this.bitDuration + device.responseDelay;
    
    // Transfer each byte
    for (const byte of data) {
      const response = this.generateResponseByte(device, byte);
      responseData.push(response);
    }
    
    this.simulateDelay(transmissionTime);
    
    // Deselect device
    this.deselectDevice(ssPin);
    
    this.recordTransaction({
      slaveSelectPin: ssPin,
      operation: 'transfer',
      dataOut: data,
      dataIn: responseData,
      success: true,
      timestamp: Date.now(),
      duration: transmissionTime,
      clockSpeed: this.config.clockSpeed
    });
    
    return responseData;
  }

  /**
   * Begin transaction with device
   */
  public beginTransaction(slaveSelectPin: number): boolean {
    if (!this.isInitialized || this.busState.busy) return false;
    
    const device = this.devices.get(slaveSelectPin);
    if (!device || !device.isConnected) return false;
    
    this.selectDevice(slaveSelectPin);
    return true;
  }

  /**
   * End transaction
   */
  public endTransaction(slaveSelectPin: number): void {
    this.deselectDevice(slaveSelectPin);
  }

  /**
   * Add device to SPI bus
   */
  public addDevice(device: Omit<SPIDevice, 'isSelected' | 'isConnected'>): boolean {
    if (this.devices.has(device.slaveSelectPin)) return false;
    if (this.devices.size >= this.config.maxSlaves) return false;
    
    const newDevice: SPIDevice = {
      ...device,
      isSelected: false,
      isConnected: true
    };
    
    this.devices.set(device.slaveSelectPin, newDevice);
    this.busState.devicesConnected++;
    
    if (this.onDeviceConnectedCallback) {
      this.onDeviceConnectedCallback(newDevice);
    }
    
    return true;
  }

  /**
   * Remove device from bus
   */
  public removeDevice(slaveSelectPin: number): boolean {
    const device = this.devices.get(slaveSelectPin);
    if (!device) return false;
    
    device.isConnected = false;
    this.busState.devicesConnected--;
    
    return true;
  }

  /**
   * Get device by slave select pin
   */
  public getDevice(slaveSelectPin: number): SPIDevice | undefined {
    const device = this.devices.get(slaveSelectPin);
    return device ? { ...device } : undefined;
  }

  /**
   * Get all connected devices
   */
  public getConnectedDevices(): SPIDevice[] {
    return Array.from(this.devices.values()).filter(device => device.isConnected);
  }

  /**
   * Read register from device
   */
  public readRegister(slaveSelectPin: number, register: number): number {
    const device = this.devices.get(slaveSelectPin);
    if (!device || !device.isConnected) return -1;
    
    // Typical SPI read: send register address with read bit, then read data
    this.selectDevice(slaveSelectPin);
    
    const readCommand = register | 0x80; // Set read bit
    this.transfer(readCommand);
    const value = this.transfer(0x00); // Send dummy byte to read response
    
    this.deselectDevice(slaveSelectPin);
    
    return value;
  }

  /**
   * Write to device register
   */
  public writeRegister(slaveSelectPin: number, register: number, value: number): boolean {
    const device = this.devices.get(slaveSelectPin);
    if (!device || !device.isConnected) return false;
    
    // Typical SPI write: send register address, then data
    this.selectDevice(slaveSelectPin);
    
    this.transfer(register & 0x7F); // Clear write bit
    this.transfer(value);
    
    this.deselectDevice(slaveSelectPin);
    
    // Update device register
    device.registers.set(register, value);
    
    return true;
  }

  /**
   * Get bus state
   */
  public getBusState(): SPIBusState {
    return { ...this.busState };
  }

  /**
   * Get transaction history
   */
  public getTransactions(): SPITransaction[] {
    return [...this.transactions];
  }

  /**
   * Clear transaction history
   */
  public clearTransactions(): void {
    this.transactions = [];
  }

  /**
   * Get configuration
   */
  public getConfig(): SPIConfig {
    return { ...this.config };
  }

  /**
   * Get pin assignments
   */
  public getPins(): typeof this.pins {
    return { ...this.pins };
  }

  /**
   * Check if bus is ready
   */
  public isReady(): boolean {
    return this.isInitialized && !this.busState.busy;
  }

  /**
   * Calculate total bus power consumption
   */
  public getTotalPowerConsumption(): number {
    let totalConsumption = 2; // Base SPI controller consumption (mA)
    
    for (const device of this.devices.values()) {
      if (device.isConnected) {
        totalConsumption += device.powerConsumption;
      }
    }
    
    return totalConsumption;
  }

  /**
   * Set transaction callback
   */
  public onTransaction(callback: (transaction: SPITransaction) => void): void {
    this.onTransactionCallback = callback;
  }

  /**
   * Set device connected callback
   */
  public onDeviceConnected(callback: (device: SPIDevice) => void): void {
    this.onDeviceConnectedCallback = callback;
  }

  /**
   * Set slave select callback
   */
  public onSlaveSelect(callback: (pin: number, selected: boolean) => void): void {
    this.onSlaveSelectCallback = callback;
  }

  /**
   * Select device for communication
   */
  private selectDevice(slaveSelectPin: number): void {
    const device = this.devices.get(slaveSelectPin);
    if (!device) return;
    
    device.isSelected = true;
    this.busState.busy = true;
    this.busState.activeSlavePin = slaveSelectPin;
    
    if (this.onSlaveSelectCallback) {
      this.onSlaveSelectCallback(slaveSelectPin, true);
    }
  }

  /**
   * Deselect device
   */
  private deselectDevice(slaveSelectPin: number): void {
    const device = this.devices.get(slaveSelectPin);
    if (!device) return;
    
    device.isSelected = false;
    this.busState.busy = false;
    this.busState.activeSlavePin = undefined as any;
    
    if (this.onSlaveSelectCallback) {
      this.onSlaveSelectCallback(slaveSelectPin, false);
    }
  }

  /**
   * Generate response byte from device
   */
  private generateResponseByte(device: SPIDevice, inputByte: number): number {
    // In real implementation, this would depend on the specific device
    // For simulation, generate some realistic response
    
    // Check if it's a register read/write command
    if (inputByte & 0x80) {
      // Read command
      const register = inputByte & 0x7F;
      return device.registers.get(register) || 0;
    } else if (inputByte === 0x00) {
      // Dummy byte, return some status or data
      return Math.floor(Math.random() * 256);
    } else {
      // Command or data byte
      return inputByte; // Echo back for simulation
    }
  }

  /**
   * Record transaction
   */
  private recordTransaction(transaction: SPITransaction): void {
    this.transactions.push(transaction);
    
    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
      this.transactions.shift();
    }
    
    if (this.onTransactionCallback) {
      this.onTransactionCallback(transaction);
    }
  }

  /**
   * Simulate transmission delay
   */
  private simulateDelay(microseconds: number): void {
    // In real implementation, this would block
    // For simulation, we just track timing
    this.lastTransactionTime += microseconds;
  }

  /**
   * Create common SPI devices
   */
  public createSDCardDevice(slaveSelectPin: number = 10): SPIDevice {
    return {
      slaveSelectPin,
      name: 'SD Card Module',
      registers: new Map([
        [0x00, 0x01], // Status register
        [0x01, 0x00], // Command register
        [0x02, 0xFF]  // Data register
      ]),
      isSelected: false,
      isConnected: false,
      maxClockSpeed: 25000000, // 25MHz
      powerConsumption: 100, // 100mA during read/write
      responseDelay: 100,
      bufferSize: 512
    };
  }

  /**
   * Create OLED display device
   */
  public createOLEDDevice(slaveSelectPin: number = 9): SPIDevice {
    return {
      slaveSelectPin,
      name: 'SSD1306 OLED Display',
      registers: new Map([
        [0x00, 0x00], // Command register
        [0x40, 0x00], // Data register
        [0x8D, 0x14]  // Charge pump setting
      ]),
      isSelected: false,
      isConnected: false,
      maxClockSpeed: 10000000, // 10MHz
      powerConsumption: 20,
      responseDelay: 50,
      bufferSize: 1024
    };
  }

  /**
   * Create digital potentiometer device
   */
  public createDigitalPotDevice(slaveSelectPin: number = 8): SPIDevice {
    return {
      slaveSelectPin,
      name: 'MCP4131 Digital Potentiometer',
      registers: new Map([
        [0x00, 128], // Wiper position (0-255)
        [0x01, 0x01], // Status register
        [0x04, 0x00]  // TCON register
      ]),
      isSelected: false,
      isConnected: false,
      maxClockSpeed: 10000000, // 10MHz
      powerConsumption: 1.5,
      responseDelay: 10,
      bufferSize: 2
    };
  }

  /**
   * Create ADC device
   */
  public createADCDevice(slaveSelectPin: number = 7): SPIDevice {
    return {
      slaveSelectPin,
      name: 'MCP3008 ADC',
      registers: new Map([
        [0x00, 0], // Channel 0
        [0x01, 0], // Channel 1
        [0x02, 0], // Channel 2
        [0x03, 0]  // Channel 3
      ]),
      isSelected: false,
      isConnected: false,
      maxClockSpeed: 3600000, // 3.6MHz
      powerConsumption: 5,
      responseDelay: 200,
      bufferSize: 3
    };
  }

  /**
   * Get common clock speeds
   */
  public static getCommonClockSpeeds(): { speed: number; description: string }[] {
    return [
      { speed: 125000, description: '125kHz (Very slow)' },
      { speed: 250000, description: '250kHz (Slow)' },
      { speed: 1000000, description: '1MHz (Standard)' },
      { speed: 2000000, description: '2MHz (Fast)' },
      { speed: 4000000, description: '4MHz (Default)' },
      { speed: 8000000, description: '8MHz (Maximum for Uno)' }
    ];
  }

  /**
   * Get data mode descriptions
   */
  public static getDataModeDescriptions(): { mode: number; description: string }[] {
    return [
      { mode: 0, description: 'Mode 0: CPOL=0, CPHA=0 (Clock idle low, sample rising)' },
      { mode: 1, description: 'Mode 1: CPOL=0, CPHA=1 (Clock idle low, sample falling)' },
      { mode: 2, description: 'Mode 2: CPOL=1, CPHA=0 (Clock idle high, sample falling)' },
      { mode: 3, description: 'Mode 3: CPOL=1, CPHA=1 (Clock idle high, sample rising)' }
    ];
  }
}