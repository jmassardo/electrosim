/**
 * I2C Communication Module
 * Simulates I2C (Inter-Integrated Circuit) bus communication for Arduino
 * Supports master and slave modes with realistic timing and protocols
 */

export interface I2CConfig {
  frequency: number; // Hz (100kHz, 400kHz, 1MHz, 3.4MHz)
  pullUpResistors: boolean;
  slaveAddress?: number; // 7-bit address for slave mode
  addressingMode: '7bit' | '10bit';
  generalCallEnabled: boolean;
  clockStretching: boolean;
  timeout: number; // milliseconds
}

export interface I2CDevice {
  address: number;
  name: string;
  registers: Map<number, number>;
  isConnected: boolean;
  powerConsumption: number; // mA
  clockStretch: boolean;
  responseDelay: number; // microseconds
}

export interface I2CTransaction {
  address: number;
  operation: 'read' | 'write' | 'scan';
  register?: number;
  data: number[];
  success: boolean;
  timestamp: number;
  duration: number; // microseconds
  errorCode?: number;
}

export interface I2CBusState {
  sda: boolean; // Serial Data Line
  scl: boolean; // Serial Clock Line
  busy: boolean;
  frequency: number;
  devicesConnected: number;
}

export class I2C {
  private config: I2CConfig;
  private devices: Map<number, I2CDevice> = new Map();
  private isInitialized: boolean = false;
  private transactions: I2CTransaction[] = [];
  
  // Bus state
  private busState: I2CBusState = {
    sda: true,
    scl: true,
    busy: false,
    frequency: 100000,
    devicesConnected: 0
  };
  
  // Timing simulation
  private lastTransactionTime: number = 0;
  private bitDuration: number = 10; // microseconds (100kHz)
  
  // Error codes
  private readonly ERROR_CODES = {
    SUCCESS: 0,
    DATA_TOO_LONG: 1,
    NACK_ON_ADDRESS: 2,
    NACK_ON_DATA: 3,
    OTHER_ERROR: 4,
    TIMEOUT: 5
  };
  
  // Callbacks
  private onTransactionCallback?: (transaction: I2CTransaction) => void;
  private onDeviceConnectedCallback?: (device: I2CDevice) => void;
  private onBusErrorCallback?: (errorCode: number, address: number) => void;

  constructor(config: Partial<I2CConfig> = {}) {
    this.config = {
      frequency: 100000, // 100kHz standard mode
      pullUpResistors: true,
      addressingMode: '7bit',
      generalCallEnabled: false,
      clockStretching: true,
      timeout: 1000,
      ...config
    };
    
    this.bitDuration = 1000000 / this.config.frequency; // microseconds
    this.busState.frequency = this.config.frequency;
  }

  /**
   * Initialize I2C bus
   */
  public begin(address?: number): boolean {
    this.isInitialized = true;
    
    if (address !== undefined) {
      // Slave mode
      if (address < 8 || address > 119) {
        return false; // Invalid slave address
      }
      this.config.slaveAddress = address;
    }
    
    this.busState.sda = true;
    this.busState.scl = true;
    this.busState.busy = false;
    
    return true;
  }

  /**
   * Set I2C clock frequency
   */
  public setClock(frequency: number): boolean {
    const validFrequencies = [100000, 400000, 1000000, 3400000];
    
    if (!validFrequencies.includes(frequency)) {
      return false;
    }
    
    this.config.frequency = frequency;
    this.busState.frequency = frequency;
    this.bitDuration = 1000000 / frequency;
    
    return true;
  }

  /**
   * Begin transmission to device
   */
  public beginTransmission(address: number): boolean {
    if (!this.isInitialized || this.busState.busy) {
      return false;
    }
    
    if (address < 8 || address > 119) {
      return false; // Invalid address
    }
    
    this.busState.busy = true;
    this.lastTransactionTime = Date.now() * 1000; // microseconds
    
    return true;
  }

  /**
   * End transmission and send data
   */
  public endTransmission(sendStop: boolean = true): number {
    if (!this.busState.busy) {
      return this.ERROR_CODES.OTHER_ERROR;
    }
    
    this.busState.busy = false;
    
    // Simulate transmission success/failure
    const device = this.devices.get(0); // For this simulation
    if (!device || !device.isConnected) {
      return this.ERROR_CODES.NACK_ON_ADDRESS;
    }
    
    // sendStop parameter affects bus behavior in real implementation
    if (sendStop) {
      this.busState.sda = true;
      this.busState.scl = true;
    }
    
    return this.ERROR_CODES.SUCCESS;
  }

  /**
   * Write data to device
   */
  public write(data: number | number[]): number {
    if (!this.busState.busy) {
      return 0;
    }
    
    const dataArray = Array.isArray(data) ? data : [data];
    
    // Simulate write timing
    const transmissionTime = dataArray.length * 8 * this.bitDuration + 100; // Include overhead
    this.simulateDelay(transmissionTime);
    
    return dataArray.length;
  }

  /**
   * Request data from device
   */
  public requestFrom(address: number, quantity: number, sendStop: boolean = true): number {
    if (!this.isInitialized) {
      return 0;
    }
    
    const device = this.devices.get(address);
    if (!device || !device.isConnected) {
      this.recordTransaction({
        address,
        operation: 'read',
        data: [],
        success: false,
        timestamp: Date.now(),
        duration: 0,
        errorCode: this.ERROR_CODES.NACK_ON_ADDRESS
      });
      return 0;
    }
    
    // Simulate read timing
    const transmissionTime = quantity * 8 * this.bitDuration + device.responseDelay;
    this.simulateDelay(transmissionTime);
    
    // Generate mock data for simulation
    const data: number[] = [];
    for (let i = 0; i < quantity; i++) {
      data.push(Math.floor(Math.random() * 256));
    }
    
    // sendStop parameter affects bus behavior
    if (sendStop) {
      this.busState.sda = true;
      this.busState.scl = true;
    }
    
    this.recordTransaction({
      address,
      operation: 'read',
      data,
      success: true,
      timestamp: Date.now(),
      duration: transmissionTime,
      errorCode: this.ERROR_CODES.SUCCESS
    });
    
    return quantity;
  }

  /**
   * Read data from buffer
   */
  public read(): number {
    // In real implementation, this would read from receive buffer
    // For simulation, return random data
    return Math.floor(Math.random() * 256);
  }

  /**
   * Check how many bytes available to read
   */
  public available(): number {
    // Simulate data availability
    return Math.floor(Math.random() * 32);
  }

  /**
   * Scan for devices on bus
   */
  public scan(): number[] {
    const foundDevices: number[] = [];
    
    for (let address = 8; address < 120; address++) {
      const device = this.devices.get(address);
      if (device && device.isConnected) {
        foundDevices.push(address);
        
        // Record scan transaction
        this.recordTransaction({
          address,
          operation: 'scan',
          data: [],
          success: true,
          timestamp: Date.now(),
          duration: 8 * this.bitDuration,
          errorCode: this.ERROR_CODES.SUCCESS
        });
      }
    }
    
    return foundDevices;
  }

  /**
   * Add device to I2C bus
   */
  public addDevice(device: Omit<I2CDevice, 'isConnected'>): boolean {
    if (this.devices.has(device.address)) {
      return false; // Device already exists
    }
    
    const newDevice: I2CDevice = {
      ...device,
      isConnected: true
    };
    
    this.devices.set(device.address, newDevice);
    this.busState.devicesConnected++;
    
    if (this.onDeviceConnectedCallback) {
      this.onDeviceConnectedCallback(newDevice);
    }
    
    return true;
  }

  /**
   * Remove device from bus
   */
  public removeDevice(address: number): boolean {
    const device = this.devices.get(address);
    if (!device) {
      return false;
    }
    
    device.isConnected = false;
    this.busState.devicesConnected--;
    
    return true;
  }

  /**
   * Get device by address
   */
  public getDevice(address: number): I2CDevice | undefined {
    const device = this.devices.get(address);
    return device ? { ...device } : undefined;
  }

  /**
   * Get all connected devices
   */
  public getConnectedDevices(): I2CDevice[] {
    return Array.from(this.devices.values()).filter(device => device.isConnected);
  }

  /**
   * Read register from device
   */
  public readRegister(address: number, register: number): number {
    const device = this.devices.get(address);
    if (!device || !device.isConnected) {
      return -1;
    }
    
    const value = device.registers.get(register) || 0;
    
    this.recordTransaction({
      address,
      operation: 'read',
      register,
      data: [value],
      success: true,
      timestamp: Date.now(),
      duration: 16 * this.bitDuration + device.responseDelay,
      errorCode: this.ERROR_CODES.SUCCESS
    });
    
    return value;
  }

  /**
   * Write to device register
   */
  public writeRegister(address: number, register: number, value: number): boolean {
    const device = this.devices.get(address);
    if (!device || !device.isConnected) {
      this.recordTransaction({
        address,
        operation: 'write',
        register,
        data: [value],
        success: false,
        timestamp: Date.now(),
        duration: 0,
        errorCode: this.ERROR_CODES.NACK_ON_ADDRESS
      });
      return false;
    }
    
    device.registers.set(register, value);
    
    this.recordTransaction({
      address,
      operation: 'write',
      register,
      data: [value],
      success: true,
      timestamp: Date.now(),
      duration: 16 * this.bitDuration + device.responseDelay,
      errorCode: this.ERROR_CODES.SUCCESS
    });
    
    return true;
  }

  /**
   * Get bus state
   */
  public getBusState(): I2CBusState {
    return { ...this.busState };
  }

  /**
   * Get transaction history
   */
  public getTransactions(): I2CTransaction[] {
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
  public getConfig(): I2CConfig {
    return { ...this.config };
  }

  /**
   * Check if bus is ready
   */
  public isReady(): boolean {
    return this.isInitialized && !this.busState.busy;
  }

  /**
   * Simulate bus error
   */
  public simulateError(address: number, errorCode: number): void {
    this.recordTransaction({
      address,
      operation: 'write',
      data: [],
      success: false,
      timestamp: Date.now(),
      duration: 0,
      errorCode
    });
    
    if (this.onBusErrorCallback) {
      this.onBusErrorCallback(errorCode, address);
    }
  }

  /**
   * Calculate total bus power consumption
   */
  public getTotalPowerConsumption(): number {
    let totalConsumption = 5; // Base I2C controller consumption (mA)
    
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
  public onTransaction(callback: (transaction: I2CTransaction) => void): void {
    this.onTransactionCallback = callback;
  }

  /**
   * Set device connected callback
   */
  public onDeviceConnected(callback: (device: I2CDevice) => void): void {
    this.onDeviceConnectedCallback = callback;
  }

  /**
   * Set bus error callback
   */
  public onBusError(callback: (errorCode: number, address: number) => void): void {
    this.onBusErrorCallback = callback;
  }

  /**
   * Create common sensor devices
   */
  public createDHT22Device(address: number = 0x27): I2CDevice {
    return {
      address,
      name: 'DHT22 Temperature/Humidity Sensor',
      registers: new Map([
        [0x00, 25], // Temperature register
        [0x01, 60], // Humidity register
        [0x02, 0x01] // Status register
      ]),
      isConnected: false,
      powerConsumption: 2.5,
      clockStretch: false,
      responseDelay: 100
    };
  }

  /**
   * Create MPU6050 accelerometer device
   */
  public createMPU6050Device(address: number = 0x68): I2CDevice {
    return {
      address,
      name: 'MPU6050 Accelerometer/Gyroscope',
      registers: new Map([
        [0x75, 0x68], // WHO_AM_I register
        [0x3B, 0x00], // ACCEL_XOUT_H
        [0x3C, 0x00], // ACCEL_XOUT_L
        [0x43, 0x00], // GYRO_XOUT_H
        [0x44, 0x00]  // GYRO_XOUT_L
      ]),
      isConnected: false,
      powerConsumption: 3.9,
      clockStretch: true,
      responseDelay: 200
    };
  }

  /**
   * Create LCD display device
   */
  public createLCDDevice(address: number = 0x20): I2CDevice {
    return {
      address,
      name: 'HD44780 LCD with I2C Backpack',
      registers: new Map([
        [0x00, 0x00], // Control register
        [0x01, 0x00], // Data register
        [0x02, 0x08]  // Backlight register
      ]),
      isConnected: false,
      powerConsumption: 25,
      clockStretch: false,
      responseDelay: 50
    };
  }

  /**
   * Record transaction
   */
  private recordTransaction(transaction: I2CTransaction): void {
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
   * Generate realistic I2C addresses
   */
  public static getCommonAddresses(): { address: number; device: string }[] {
    return [
      { address: 0x20, device: 'PCF8574 I/O Expander' },
      { address: 0x27, device: 'LCD with I2C Backpack' },
      { address: 0x48, device: 'ADS1115 ADC' },
      { address: 0x50, device: 'AT24C32 EEPROM' },
      { address: 0x57, device: 'DS3231 RTC' },
      { address: 0x68, device: 'MPU6050 IMU' },
      { address: 0x76, device: 'BME280 Environmental Sensor' },
      { address: 0x77, device: 'BMP280 Pressure Sensor' }
    ];
  }
}