/**
 * HC-SR04 Ultrasonic Distance Sensor
 * Simulates the popular ultrasonic sensor for Arduino distance measurement
 */

export interface UltrasonicReading {
  distance: number;      // cm
  duration: number;      // microseconds (echo pulse width)
  timestamp: number;
  valid: boolean;
  error?: string;
}

export interface UltrasonicConfig {
  maxRange: number;          // cm (HC-SR04: ~400cm)
  minRange: number;          // cm (HC-SR04: ~2cm)
  accuracy: number;          // ±cm accuracy
  resolution: number;        // cm resolution
  beamAngle: number;         // degrees cone angle
  operatingVoltage: { min: number; max: number };
  temperatureCoefficient: number; // cm/°C adjustment
  updateRate: number;        // Hz maximum measurement rate
}

export class HC_SR04Sensor {
  private config: UltrasonicConfig;
  private trigPin: number;
  private echoPin: number;
  private isConnected: boolean = true;
  private temperature: number = 20; // °C - affects speed of sound
  private lastMeasurementTime: number = 0;
  
  // Environmental simulation
  private objects: Array<{distance: number, angle: number, reflectivity: number}> = [];
  private noise: number = 0.1; // cm noise level
  
  // Callbacks
  private onMeasurementCallback?: (reading: UltrasonicReading) => void;

  constructor(trigPin: number, echoPin: number, config: Partial<UltrasonicConfig> = {}) {
    this.trigPin = trigPin;
    this.echoPin = echoPin;
    this.config = {
      maxRange: 400,
      minRange: 2,
      accuracy: 0.3,
      resolution: 0.1,
      beamAngle: 15,
      operatingVoltage: { min: 3.3, max: 5.5 },
      temperatureCoefficient: 0.17, // cm/°C (speed of sound changes)
      updateRate: 40, // Hz
      ...config
    };

    // Add a default object at moderate distance
    this.objects.push({ distance: 50, angle: 0, reflectivity: 0.8 });
  }

  /**
   * Initialize the sensor
   */
  public begin(voltage: number = 5.0): boolean {
    if (voltage < this.config.operatingVoltage.min || voltage > this.config.operatingVoltage.max) {
      return false;
    }

    this.isConnected = true;
    return true;
  }

  /**
   * Trigger measurement and get distance
   * Simulates the trigger pulse and echo timing
   */
  public async measure(): Promise<UltrasonicReading> {
    if (!this.isConnected) {
      return this.createErrorReading('Sensor not connected');
    }

    const now = Date.now();
    const minInterval = 1000 / this.config.updateRate;
    
    if (now - this.lastMeasurementTime < minInterval) {
      return this.createErrorReading(`Measurement rate too high (max ${this.config.updateRate} Hz)`);
    }

    this.lastMeasurementTime = now;

    // Simulate trigger pulse (10µs)
    await this.delay(0.01);

    // Find closest object in beam cone
    const measurement = this.simulateMeasurement();
    
    if (this.onMeasurementCallback) {
      this.onMeasurementCallback(measurement);
    }

    return measurement;
  }

  /**
   * Continuous measurement mode
   */
  public startContinuousMeasurement(intervalMs: number = 100): void {
    const interval = Math.max(intervalMs, 1000 / this.config.updateRate);
    
    const measurementLoop = async () => {
      if (this.isConnected) {
        await this.measure();
        setTimeout(measurementLoop, interval);
      }
    };
    
    measurementLoop();
  }

  /**
   * Get pins configuration
   */
  public getPins(): { trigger: number; echo: number } {
    return { trigger: this.trigPin, echo: this.echoPin };
  }

  /**
   * Set measurement callback
   */
  public onMeasurement(callback: (reading: UltrasonicReading) => void): void {
    this.onMeasurementCallback = callback;
  }

  /**
   * Add object to environment
   */
  public addObject(distance: number, angle: number = 0, reflectivity: number = 0.8): void {
    if (distance >= this.config.minRange && distance <= this.config.maxRange) {
      this.objects.push({ distance, angle, reflectivity });
      this.objects.sort((a, b) => a.distance - b.distance); // Keep sorted by distance
    }
  }

  /**
   * Remove all objects from environment
   */
  public clearObjects(): void {
    this.objects = [];
  }

  /**
   * Set ambient temperature (affects speed of sound)
   */
  public setTemperature(celsius: number): void {
    this.temperature = celsius;
  }

  /**
   * Set environmental noise level
   */
  public setNoise(noiseCm: number): void {
    this.noise = Math.max(0, noiseCm);
  }

  /**
   * Disconnect sensor
   */
  public disconnect(): void {
    this.isConnected = false;
  }

  /**
   * Reconnect sensor
   */
  public reconnect(): void {
    this.isConnected = true;
  }

  /**
   * Get sensor status
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get configuration
   */
  public getConfig(): UltrasonicConfig {
    return { ...this.config };
  }

  /**
   * Simulate ultrasonic measurement
   */
  private simulateMeasurement(): UltrasonicReading {
    // Find closest object within beam angle
    let closestDistance = this.config.maxRange + 1;
    let reflectivity = 0;

    for (const obj of this.objects) {
      if (Math.abs(obj.angle) <= this.config.beamAngle / 2) {
        if (obj.distance < closestDistance) {
          closestDistance = obj.distance;
          reflectivity = obj.reflectivity;
        }
      }
    }

    // No object found or out of range
    if (closestDistance > this.config.maxRange) {
      return this.createErrorReading('No object detected within range');
    }

    // Apply temperature compensation
    const tempAdjustment = (this.temperature - 20) * this.config.temperatureCoefficient;
    let measuredDistance = closestDistance + tempAdjustment;

    // Add noise and sensor inaccuracy
    const noiseAmount = (Math.random() - 0.5) * this.noise * 2;
    const accuracyError = (Math.random() - 0.5) * this.config.accuracy * 2;
    measuredDistance += noiseAmount + accuracyError;

    // Apply resolution rounding
    measuredDistance = Math.round(measuredDistance / this.config.resolution) * this.config.resolution;

    // Clamp to sensor range
    measuredDistance = Math.max(this.config.minRange, 
      Math.min(this.config.maxRange, measuredDistance));

    // Calculate echo duration (time of flight)
    // Speed of sound at temperature: v = 331.3 + 0.606 * T (m/s)
    const speedOfSound = (331.3 + 0.606 * this.temperature) / 100; // cm/µs
    const duration = Math.round((2 * measuredDistance / speedOfSound)); // round trip in µs

    // Poor reflectivity might cause measurement errors
    if (reflectivity < 0.3 && Math.random() > reflectivity) {
      return this.createErrorReading('Weak echo - poor surface reflectivity');
    }

    return {
      distance: measuredDistance,
      duration,
      timestamp: Date.now(),
      valid: true
    };
  }

  /**
   * Create error reading
   */
  private createErrorReading(error: string): UltrasonicReading {
    return {
      distance: -1,
      duration: 0,
      timestamp: Date.now(),
      valid: false,
      error
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Move object dynamically (for motion simulation)
   */
  public moveObject(objectIndex: number, newDistance: number, newAngle: number = 0): void {
    if (objectIndex >= 0 && objectIndex < this.objects.length) {
      this.objects[objectIndex].distance = newDistance;
      this.objects[objectIndex].angle = newAngle;
      this.objects.sort((a, b) => a.distance - b.distance);
    }
  }

  /**
   * Simulate moving object
   */
  public simulateMovingObject(
    initialDistance: number, 
    finalDistance: number, 
    durationMs: number,
    angle: number = 0,
    reflectivity: number = 0.8
  ): void {
    // Remove existing objects and add moving object
    this.clearObjects();
    const objectIndex = 0;
    this.addObject(initialDistance, angle, reflectivity);

    const startTime = Date.now();
    const updateInterval = 50; // Update every 50ms

    const updatePosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      const currentDistance = initialDistance + (finalDistance - initialDistance) * progress;
      this.moveObject(objectIndex, currentDistance, angle);

      if (progress < 1) {
        setTimeout(updatePosition, updateInterval);
      }
    };

    updatePosition();
  }

  /**
   * Get power consumption (mA)
   */
  public getPowerConsumption(): number {
    return this.isConnected ? 15 : 0; // HC-SR04 typically uses ~15mA
  }

  /**
   * Create realistic environment presets
   */
  public setEnvironmentPreset(preset: 'empty_room' | 'cluttered_room' | 'hallway' | 'outdoor'): void {
    this.clearObjects();

    switch (preset) {
      case 'empty_room':
        this.addObject(300, 0, 0.7);     // Wall ahead
        this.addObject(200, -10, 0.6);   // Side wall
        this.addObject(200, 10, 0.6);    // Other side wall
        break;

      case 'cluttered_room':
        this.addObject(50, 0, 0.8);      // Table
        this.addObject(30, -5, 0.9);     // Chair
        this.addObject(80, 8, 0.4);      // Soft furniture
        this.addObject(150, 0, 0.7);     // Wall
        break;

      case 'hallway':
        this.addObject(400, 0, 0.8);     // Far end
        this.addObject(100, -8, 0.9);    // Side wall
        this.addObject(100, 8, 0.9);     // Other side wall
        break;

      case 'outdoor':
        this.addObject(350, 0, 0.6);     // Building/tree
        this.noise = 0.5;                // More noise outdoors
        break;
    }
  }
}