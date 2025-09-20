/**
 * DHT22 Temperature and Humidity Sensor
 * Simulates the popular DHT22/AM2302 sensor for Arduino projects
 */

export interface DHT22Reading {
  temperature: number;  // Celsius
  humidity: number;     // Percentage (0-100)
  heatIndex: number;    // Calculated heat index
  dewPoint: number;     // Calculated dew point
  timestamp: number;
  valid: boolean;
  error?: string;
}

export interface DHT22Config {
  temperatureRange: { min: number; max: number };
  humidityRange: { min: number; max: number };
  accuracy: number;           // ±°C accuracy
  responseTime: number;       // ms response time
  powerConsumption: number;   // mA
  operatingVoltage: { min: number; max: number };
  samplingPeriod: number;     // ms minimum sampling period
}

export class DHT22Sensor {
  private config: DHT22Config;
  private pin: number;
  private lastReading: DHT22Reading | null = null;
  private lastSampleTime: number = 0;
  private isConnected: boolean = true;
  
  // Environmental simulation
  private ambientTemperature: number = 22.0;  // °C
  private ambientHumidity: number = 45.0;     // %
  private temperatureDrift: number = 0.1;     // °C/min
  private humidityDrift: number = 0.2;        // %/min
  
  // Simulation state
  private simulationTimer: NodeJS.Timeout | null = null;
  private onDataCallback?: (reading: DHT22Reading) => void;

  constructor(pin: number, config: Partial<DHT22Config> = {}) {
    this.pin = pin;
    this.config = {
      temperatureRange: { min: -40, max: 80 },
      humidityRange: { min: 0, max: 100 },
      accuracy: 0.3,
      responseTime: 2000,
      powerConsumption: 1.5,
      operatingVoltage: { min: 3.3, max: 6.0 },
      samplingPeriod: 2000,
      ...config
    };
  }

  /**
   * Initialize the sensor
   */
  public begin(voltage: number = 5.0): boolean {
    if (voltage < this.config.operatingVoltage.min || voltage > this.config.operatingVoltage.max) {
      return false;
    }

    this.isConnected = true;
    this.startEnvironmentalSimulation();
    
    return true;
  }

  /**
   * Read temperature and humidity
   * Simulates the DHT22 communication protocol timing
   */
  public async read(): Promise<DHT22Reading> {
    if (!this.isConnected) {
      return this.createErrorReading('Sensor not connected');
    }

    const now = Date.now();
    if (now - this.lastSampleTime < this.config.samplingPeriod) {
      return this.createErrorReading('Sampling too fast - wait ' + 
        Math.ceil((this.config.samplingPeriod - (now - this.lastSampleTime)) / 1000) + 's');
    }

    // Simulate communication delay
    await this.delay(this.config.responseTime);

    const reading = this.generateReading();
    this.lastReading = reading;
    this.lastSampleTime = now;

    if (this.onDataCallback) {
      this.onDataCallback(reading);
    }

    return reading;
  }

  /**
   * Get last reading without new communication
   */
  public getLastReading(): DHT22Reading | null {
    return this.lastReading;
  }

  /**
   * Check if sensor is connected
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get sensor pin
   */
  public getPin(): number {
    return this.pin;
  }

  /**
   * Set environmental conditions for simulation
   */
  public setEnvironmentalConditions(temperature: number, humidity: number): void {
    this.ambientTemperature = Math.max(this.config.temperatureRange.min, 
      Math.min(this.config.temperatureRange.max, temperature));
    this.ambientHumidity = Math.max(this.config.humidityRange.min, 
      Math.min(this.config.humidityRange.max, humidity));
  }

  /**
   * Set data callback for continuous monitoring
   */
  public onData(callback: (reading: DHT22Reading) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Disconnect sensor (simulate unplugging)
   */
  public disconnect(): void {
    this.isConnected = false;
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  /**
   * Reconnect sensor
   */
  public reconnect(): void {
    this.isConnected = true;
    this.startEnvironmentalSimulation();
  }

  /**
   * Get sensor configuration
   */
  public getConfig(): DHT22Config {
    return { ...this.config };
  }

  /**
   * Generate realistic sensor reading
   */
  private generateReading(): DHT22Reading {
    // Add sensor noise and accuracy limitations
    const tempNoise = (Math.random() - 0.5) * this.config.accuracy * 2;
    const humidityNoise = (Math.random() - 0.5) * 2; // ±1% accuracy for humidity

    let temperature = this.ambientTemperature + tempNoise;
    let humidity = this.ambientHumidity + humidityNoise;

    // Clamp to sensor limits
    temperature = Math.max(this.config.temperatureRange.min, 
      Math.min(this.config.temperatureRange.max, temperature));
    humidity = Math.max(this.config.humidityRange.min, 
      Math.min(this.config.humidityRange.max, humidity));

    // Round to sensor precision (0.1°C, 0.1% RH)
    temperature = Math.round(temperature * 10) / 10;
    humidity = Math.round(humidity * 10) / 10;

    const reading: DHT22Reading = {
      temperature,
      humidity,
      heatIndex: this.calculateHeatIndex(temperature, humidity),
      dewPoint: this.calculateDewPoint(temperature, humidity),
      timestamp: Date.now(),
      valid: true
    };

    return reading;
  }

  /**
   * Create error reading
   */
  private createErrorReading(error: string): DHT22Reading {
    return {
      temperature: NaN,
      humidity: NaN,
      heatIndex: NaN,
      dewPoint: NaN,
      timestamp: Date.now(),
      valid: false,
      error
    };
  }

  /**
   * Calculate heat index (feels like temperature)
   */
  private calculateHeatIndex(tempC: number, humidity: number): number {
    if (tempC < 27) return tempC; // Heat index only applies above 27°C

    const tempF = tempC * 9/5 + 32;
    const rh = humidity;
    
    // Rothfusz regression (simplified)
    const hi = -42.379 + 2.04901523 * tempF + 10.14333127 * rh 
      - 0.22475541 * tempF * rh - 0.00683783 * tempF * tempF 
      - 0.05481717 * rh * rh + 0.00122874 * tempF * tempF * rh 
      + 0.00085282 * tempF * rh * rh - 0.00000199 * tempF * tempF * rh * rh;
    
    return Math.round(((hi - 32) * 5/9) * 10) / 10;
  }

  /**
   * Calculate dew point
   */
  private calculateDewPoint(tempC: number, humidity: number): number {
    const a = 17.27;
    const b = 237.7;
    
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100.0);
    const dewPoint = (b * alpha) / (a - alpha);
    
    return Math.round(dewPoint * 10) / 10;
  }

  /**
   * Start environmental simulation with gradual changes
   */
  private startEnvironmentalSimulation(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
    }

    this.simulationTimer = setInterval(() => {
      if (!this.isConnected) return;

      // Simulate gradual environmental changes
      const tempChange = (Math.random() - 0.5) * this.temperatureDrift;
      const humidityChange = (Math.random() - 0.5) * this.humidityDrift;

      this.ambientTemperature += tempChange / 60; // Per second
      this.ambientHumidity += humidityChange / 60;

      // Keep within realistic bounds
      this.ambientTemperature = Math.max(-10, Math.min(45, this.ambientTemperature));
      this.ambientHumidity = Math.max(20, Math.min(90, this.ambientHumidity));
      
    }, 1000); // Update every second
  }

  /**
   * Delay helper for async operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current power consumption (mA)
   */
  public getPowerConsumption(): number {
    return this.isConnected ? this.config.powerConsumption : 0;
  }

  /**
   * Simulate sensor failure
   */
  public simulateFailure(failureType: 'disconnection' | 'corruption' | 'timeout'): void {
    switch (failureType) {
      case 'disconnection':
        this.disconnect();
        break;
      case 'corruption':
        // Next reading will be corrupted
        this.generateReading = () => this.createErrorReading('Data corruption detected');
        break;
      case 'timeout':
        // Increase response time significantly
        this.config.responseTime = 10000;
        break;
    }
  }

  /**
   * Reset sensor to normal operation
   */
  public resetToNormal(): void {
    this.config.responseTime = 2000;
    this.reconnect();
    // Restore normal reading generation
    this.generateReading = DHT22Sensor.prototype.generateReading.bind(this);
  }
}