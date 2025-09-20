/**
 * MPU6050 Accelerometer/Gyroscope Sensor
 * Simulates the popular MPU6050 6-axis motion tracking device
 * Features 3-axis accelerometer and 3-axis gyroscope
 */

export interface AccelerometerConfig {
  accelerometerRange: 2 | 4 | 8 | 16; // ±g
  gyroscopeRange: 250 | 500 | 1000 | 2000; // ±°/s
  sampleRate: number; // Hz (4-8000)
  digitalLowPassFilter: 0 | 1 | 2 | 3 | 4 | 5 | 6; // DLPF setting
  operatingVoltage: { min: number; max: number };
  i2cAddress: number; // Default 0x68
  temperatureEnabled: boolean;
}

export interface AccelerometerData {
  acceleration: {
    x: number; // g (gravity units)
    y: number; // g
    z: number; // g
  };
  gyroscope: {
    x: number; // °/s
    y: number; // °/s
    z: number; // °/s
  };
  temperature: number; // °C
  timestamp: number;
}

export interface MotionEvent {
  type: 'motion' | 'tap' | 'freefall' | 'shock';
  intensity: number;
  duration: number;
  timestamp: number;
}

export interface CalibrationData {
  accel: {
    offset: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  gyro: {
    offset: { x: number; y: number; z: number };
    drift: { x: number; y: number; z: number };
  };
}

export class MPU6050 {
  private config: AccelerometerConfig;
  private isInitialized: boolean = false;
  private lastReadTime: number = 0;
  private readInterval: number;
  
  // Raw sensor values
  private rawAccel: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private rawGyro: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private rawTemperature: number = 25;
  
  // Calibration data
  private calibration: CalibrationData = {
    accel: {
      offset: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    gyro: {
      offset: { x: 0, y: 0, z: 0 },
      drift: { x: 0.001, y: 0.001, z: 0.001 }
    }
  };
  
  // Simulation state
  private orientation: { pitch: number; roll: number; yaw: number } = { pitch: 0, roll: 0, yaw: 0 };
  private velocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  
  // Motion detection
  private motionThreshold = 0.1; // g
  private gyroThreshold = 10; // °/s
  private motionHistory: MotionEvent[] = [];
  
  // Environmental simulation
  private environmentalNoise = 0.01; // g
  private temperatureDrift = 0.1; // °C per minute
  
  // Callbacks
  private onDataReadyCallback?: (data: AccelerometerData) => void;
  private onMotionDetectedCallback?: (event: MotionEvent) => void;
  private onTapDetectedCallback?: (intensity: number) => void;

  constructor(config: Partial<AccelerometerConfig> = {}) {
    this.config = {
      accelerometerRange: 2,
      gyroscopeRange: 250,
      sampleRate: 1000,
      digitalLowPassFilter: 3,
      operatingVoltage: { min: 2.375, max: 3.46 },
      i2cAddress: 0x68,
      temperatureEnabled: true,
      ...config
    };
    
    this.readInterval = 1000 / this.config.sampleRate;
    this.initializeBaseline();
  }

  /**
   * Initialize sensor
   */
  public begin(voltage: number = 3.3): boolean {
    if (voltage < this.config.operatingVoltage.min || voltage > this.config.operatingVoltage.max) {
      return false;
    }

    this.isInitialized = true;
    this.lastReadTime = Date.now();
    this.startDataCollection();
    
    return true;
  }

  /**
   * Read current sensor data
   */
  public read(): AccelerometerData {
    if (!this.isInitialized) {
      return this.getEmptyData();
    }

    this.updateSensorValues();
    
    const data: AccelerometerData = {
      acceleration: {
        x: this.applyCalibratedAccelerometer(this.rawAccel.x, 'x'),
        y: this.applyCalibratedAccelerometer(this.rawAccel.y, 'y'),
        z: this.applyCalibratedAccelerometer(this.rawAccel.z, 'z')
      },
      gyroscope: {
        x: this.applyCalibratedGyroscope(this.rawGyro.x, 'x'),
        y: this.applyCalibratedGyroscope(this.rawGyro.y, 'y'),
        z: this.applyCalibratedGyroscope(this.rawGyro.z, 'z')
      },
      temperature: this.rawTemperature,
      timestamp: Date.now()
    };

    this.detectMotion(data);
    this.triggerDataReady(data);
    
    return data;
  }

  /**
   * Calibrate accelerometer
   */
  public calibrateAccelerometer(samples: number = 100): Promise<void> {
    return new Promise((resolve) => {
      let sumX = 0, sumY = 0, sumZ = 0;
      let count = 0;
      
      const collectSample = () => {
        if (count < samples) {
          sumX += this.rawAccel.x;
          sumY += this.rawAccel.y;
          sumZ += this.rawAccel.z - 1; // Subtract gravity (1g) from Z-axis
          count++;
          setTimeout(collectSample, 10);
        } else {
          this.calibration.accel.offset = {
            x: sumX / samples,
            y: sumY / samples,
            z: sumZ / samples
          };
          resolve();
        }
      };
      
      collectSample();
    });
  }

  /**
   * Calibrate gyroscope
   */
  public calibrateGyroscope(samples: number = 100): Promise<void> {
    return new Promise((resolve) => {
      let sumX = 0, sumY = 0, sumZ = 0;
      let count = 0;
      
      const collectSample = () => {
        if (count < samples) {
          sumX += this.rawGyro.x;
          sumY += this.rawGyro.y;
          sumZ += this.rawGyro.z;
          count++;
          setTimeout(collectSample, 10);
        } else {
          this.calibration.gyro.offset = {
            x: sumX / samples,
            y: sumY / samples,
            z: sumZ / samples
          };
          resolve();
        }
      };
      
      collectSample();
    });
  }

  /**
   * Set sensor range
   */
  public setAccelerometerRange(range: 2 | 4 | 8 | 16): void {
    this.config.accelerometerRange = range;
  }

  /**
   * Set gyroscope range
   */
  public setGyroscopeRange(range: 250 | 500 | 1000 | 2000): void {
    this.config.gyroscopeRange = range;
  }

  /**
   * Set sample rate
   */
  public setSampleRate(rate: number): void {
    if (rate >= 4 && rate <= 8000) {
      this.config.sampleRate = rate;
      this.readInterval = 1000 / rate;
    }
  }

  /**
   * Set digital low-pass filter
   */
  public setDLPF(setting: 0 | 1 | 2 | 3 | 4 | 5 | 6): void {
    this.config.digitalLowPassFilter = setting;
  }

  /**
   * Simulate motion - pitch rotation
   */
  public simulatePitch(angle: number, duration: number = 1000): void {
    this.animateOrientation({ pitch: angle }, duration);
  }

  /**
   * Simulate motion - roll rotation
   */
  public simulateRoll(angle: number, duration: number = 1000): void {
    this.animateOrientation({ roll: angle }, duration);
  }

  /**
   * Simulate motion - yaw rotation
   */
  public simulateYaw(angle: number, duration: number = 1000): void {
    this.animateOrientation({ yaw: angle }, duration);
  }

  /**
   * Simulate linear acceleration
   */
  public simulateAcceleration(accel: { x: number; y: number; z: number }, duration: number = 500): void {
    const startTime = Date.now();
    const originalVelocity = { ...this.velocity };
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        // Apply acceleration
        this.velocity.x = originalVelocity.x + accel.x * progress;
        this.velocity.y = originalVelocity.y + accel.y * progress;
        this.velocity.z = originalVelocity.z + accel.z * progress;
        
        setTimeout(animate, 16); // ~60fps
      } else {
        // Gradually return to rest
        const decayTime = 500;
        const decayStart = Date.now();
        
        const decay = () => {
          const decayElapsed = Date.now() - decayStart;
          const decayProgress = Math.min(decayElapsed / decayTime, 1);
          const factor = 1 - decayProgress;
          
          this.velocity.x *= factor;
          this.velocity.y *= factor;
          this.velocity.z *= factor;
          
          if (decayProgress < 1) {
            setTimeout(decay, 16);
          }
        };
        
        decay();
      }
    };
    
    animate();
  }

  /**
   * Simulate tap event
   */
  public simulateTap(intensity: number = 2): void {
    const direction = Math.random() * Math.PI * 2;
    const accel = {
      x: Math.cos(direction) * intensity,
      y: Math.sin(direction) * intensity,
      z: Math.random() * intensity * 0.5
    };
    
    this.simulateAcceleration(accel, 50);
    
    const event: MotionEvent = {
      type: 'tap',
      intensity,
      duration: 50,
      timestamp: Date.now()
    };
    
    this.motionHistory.push(event);
    this.triggerTapDetected(intensity);
  }

  /**
   * Simulate free fall
   */
  public simulateFreeFall(duration: number = 1000): void {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        // Zero acceleration during free fall
        this.rawAccel = { x: 0, y: 0, z: 0 };
        setTimeout(animate, 16);
      } else {
        // Simulate impact
        this.simulateAcceleration({ x: 0, y: 0, z: -5 }, 100);
      }
    };
    
    animate();
  }

  /**
   * Get motion history
   */
  public getMotionHistory(): MotionEvent[] {
    return [...this.motionHistory];
  }

  /**
   * Clear motion history
   */
  public clearMotionHistory(): void {
    this.motionHistory = [];
  }

  /**
   * Get current orientation
   */
  public getOrientation(): { pitch: number; roll: number; yaw: number } {
    return { ...this.orientation };
  }

  /**
   * Get sensor configuration
   */
  public getConfig(): AccelerometerConfig {
    return { ...this.config };
  }

  /**
   * Get calibration data
   */
  public getCalibration(): CalibrationData {
    return JSON.parse(JSON.stringify(this.calibration));
  }

  /**
   * Set motion detection thresholds
   */
  public setMotionThreshold(accelThreshold: number, gyroThreshold: number): void {
    this.motionThreshold = accelThreshold;
    this.gyroThreshold = gyroThreshold;
  }

  /**
   * Check if sensor is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Set data ready callback
   */
  public onDataReady(callback: (data: AccelerometerData) => void): void {
    this.onDataReadyCallback = callback;
  }

  /**
   * Set motion detected callback
   */
  public onMotionDetected(callback: (event: MotionEvent) => void): void {
    this.onMotionDetectedCallback = callback;
  }

  /**
   * Set tap detected callback
   */
  public onTapDetected(callback: (intensity: number) => void): void {
    this.onTapDetectedCallback = callback;
  }

  /**
   * Get power consumption (μA)
   */
  public getPowerConsumption(): number {
    if (!this.isInitialized) return 10; // Sleep mode
    
    let consumption = 3400; // Normal operation
    
    if (this.config.sampleRate > 1000) {
      consumption += (this.config.sampleRate - 1000) * 0.5;
    }
    
    return consumption;
  }

  /**
   * Initialize baseline values
   */
  private initializeBaseline(): void {
    // Initialize with Earth gravity (1g downward on Z-axis)
    this.rawAccel = { x: 0, y: 0, z: 1 };
    this.rawGyro = { x: 0, y: 0, z: 0 };
    this.rawTemperature = 25;
  }

  /**
   * Start continuous data collection
   */
  private startDataCollection(): void {
    const collectData = () => {
      if (this.isInitialized) {
        this.updateSensorValues();
        setTimeout(collectData, this.readInterval);
      }
    };
    
    collectData();
  }

  /**
   * Update sensor values based on current state
   */
  private updateSensorValues(): void {
    const now = Date.now();
    const deltaTime = (now - this.lastReadTime) / 1000; // seconds
    
    // Calculate acceleration from orientation (gravity + motion)
    const pitch = this.orientation.pitch * Math.PI / 180;
    const roll = this.orientation.roll * Math.PI / 180;
    
    // Gravity components based on orientation
    const gravityX = Math.sin(roll);
    const gravityY = -Math.sin(pitch) * Math.cos(roll);
    const gravityZ = Math.cos(pitch) * Math.cos(roll);
    
    // Add motion acceleration
    this.rawAccel.x = gravityX + this.velocity.x + this.addNoise();
    this.rawAccel.y = gravityY + this.velocity.y + this.addNoise();
    this.rawAccel.z = gravityZ + this.velocity.z + this.addNoise();
    
    // Update gyroscope (angular velocity + drift)
    this.rawGyro.x += this.calibration.gyro.drift.x * deltaTime + this.addNoise() * 10;
    this.rawGyro.y += this.calibration.gyro.drift.y * deltaTime + this.addNoise() * 10;
    this.rawGyro.z += this.calibration.gyro.drift.z * deltaTime + this.addNoise() * 10;
    
    // Update temperature with drift
    this.rawTemperature += this.temperatureDrift * deltaTime / 60 + this.addNoise() * 0.1;
    
    this.lastReadTime = now;
  }

  /**
   * Add environmental noise
   */
  private addNoise(): number {
    return (Math.random() - 0.5) * 2 * this.environmentalNoise;
  }

  /**
   * Calibrate accelerometer reading
   */
  private applyCalibratedAccelerometer(value: number, axis: 'x' | 'y' | 'z'): number {
    const calibrated = (value - this.calibration.accel.offset[axis]) * this.calibration.accel.scale[axis];
    return Math.max(-this.config.accelerometerRange, Math.min(this.config.accelerometerRange, calibrated));
  }

  /**
   * Calibrate gyroscope reading
   */
  private applyCalibratedGyroscope(value: number, axis: 'x' | 'y' | 'z'): number {
    const calibrated = value - this.calibration.gyro.offset[axis];
    return Math.max(-this.config.gyroscopeRange, Math.min(this.config.gyroscopeRange, calibrated));
  }

  /**
   * Detect motion events
   */
  private detectMotion(data: AccelerometerData): void {
    const accelMagnitude = Math.sqrt(
      data.acceleration.x ** 2 + data.acceleration.y ** 2 + data.acceleration.z ** 2
    );
    
    const gyroMagnitude = Math.sqrt(
      data.gyroscope.x ** 2 + data.gyroscope.y ** 2 + data.gyroscope.z ** 2
    );
    
    // Detect significant motion
    if (accelMagnitude > (1 + this.motionThreshold) || gyroMagnitude > this.gyroThreshold) {
      const event: MotionEvent = {
        type: 'motion',
        intensity: Math.max(accelMagnitude - 1, gyroMagnitude / this.gyroThreshold),
        duration: 0, // Will be updated by motion tracking
        timestamp: Date.now()
      };
      
      this.motionHistory.push(event);
      this.triggerMotionDetected(event);
    }
  }

  /**
   * Animate orientation change
   */
  private animateOrientation(target: Partial<{ pitch: number; roll: number; yaw: number }>, duration: number): void {
    const startTime = Date.now();
    const startOrientation = { ...this.orientation };
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easing = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      if (target.pitch !== undefined) {
        this.orientation.pitch = startOrientation.pitch + (target.pitch - startOrientation.pitch) * easing;
      }
      if (target.roll !== undefined) {
        this.orientation.roll = startOrientation.roll + (target.roll - startOrientation.roll) * easing;
      }
      if (target.yaw !== undefined) {
        this.orientation.yaw = startOrientation.yaw + (target.yaw - startOrientation.yaw) * easing;
      }
      
      if (progress < 1) {
        setTimeout(animate, 16); // ~60fps
      }
    };
    
    animate();
  }

  /**
   * Get empty data structure
   */
  private getEmptyData(): AccelerometerData {
    return {
      acceleration: { x: 0, y: 0, z: 0 },
      gyroscope: { x: 0, y: 0, z: 0 },
      temperature: 0,
      timestamp: Date.now()
    };
  }

  /**
   * Trigger data ready callback
   */
  private triggerDataReady(data: AccelerometerData): void {
    if (this.onDataReadyCallback) {
      this.onDataReadyCallback(data);
    }
  }

  /**
   * Trigger motion detected callback
   */
  private triggerMotionDetected(event: MotionEvent): void {
    if (this.onMotionDetectedCallback) {
      this.onMotionDetectedCallback(event);
    }
  }

  /**
   * Trigger tap detected callback
   */
  private triggerTapDetected(intensity: number): void {
    if (this.onTapDetectedCallback) {
      this.onTapDetectedCallback(intensity);
    }
  }
}