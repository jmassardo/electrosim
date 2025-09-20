/**
 * SG90 Servo Motor
 * Simulates a standard 9g servo motor commonly used in Arduino projects
 */

export interface ServoPosition {
  angle: number;        // degrees (0-180)
  pulseWidth: number;   // microseconds (500-2500)
  timestamp: number;
}

export interface ServoConfig {
  minPulseWidth: number;    // microseconds (typical: 500-1000)
  maxPulseWidth: number;    // microseconds (typical: 2000-2500)  
  minAngle: number;         // degrees (typical: 0)
  maxAngle: number;         // degrees (typical: 180)
  speed: number;            // degrees per second
  precision: number;        // degrees accuracy
  deadband: number;         // degrees - minimum movement
  operatingVoltage: { min: number; max: number };
  stallTorque: number;      // kg⋅cm
  operatingCurrent: number; // mA (no load)
  stallCurrent: number;     // mA (stalled)
}

export class SG90Servo {
  private config: ServoConfig;
  private pin: number;
  private currentAngle: number = 90; // Start at center
  private targetAngle: number = 90;
  private isAttached: boolean = false;
  private isMoving: boolean = false;
  
  // Movement simulation
  private movementTimer: NodeJS.Timeout | null = null;
  private movementStartTime: number = 0;
  private movementStartAngle: number = 90;
  
  // Load simulation
  private load: number = 0; // kg⋅cm external load
  private isStalled: boolean = false;
  
  // Callbacks
  private onPositionChangeCallback?: (position: ServoPosition) => void;
  private onStallCallback?: (angle: number) => void;

  constructor(pin: number, config: Partial<ServoConfig> = {}) {
    this.pin = pin;
    this.config = {
      minPulseWidth: 500,
      maxPulseWidth: 2500,
      minAngle: 0,
      maxAngle: 180,
      speed: 60, // degrees per second (0.6s/60°)
      precision: 1,
      deadband: 1,
      operatingVoltage: { min: 4.8, max: 6.0 },
      stallTorque: 1.8, // kg⋅cm
      operatingCurrent: 15, // mA
      stallCurrent: 650, // mA
      ...config
    };
  }

  /**
   * Attach servo to pin and initialize
   */
  public attach(voltage: number = 5.0): boolean {
    if (voltage < this.config.operatingVoltage.min || voltage > this.config.operatingVoltage.max) {
      return false;
    }

    this.isAttached = true;
    this.currentAngle = 90;
    this.targetAngle = 90;
    
    return true;
  }

  /**
   * Detach servo from pin
   */
  public detach(): void {
    this.isAttached = false;
    this.stopMovement();
  }

  /**
   * Move servo to specified angle
   */
  public write(angle: number): void {
    if (!this.isAttached) return;

    // Clamp angle to valid range
    angle = Math.max(this.config.minAngle, Math.min(this.config.maxAngle, angle));
    
    // Check if movement is significant (deadband)
    if (Math.abs(angle - this.currentAngle) < this.config.deadband) {
      return;
    }

    this.targetAngle = angle;
    
    // Check if load exceeds stall torque
    if (this.load > this.config.stallTorque) {
      this.isStalled = true;
      if (this.onStallCallback) {
        this.onStallCallback(this.currentAngle);
      }
      return;
    }

    this.startMovement();
  }

  /**
   * Move servo using pulse width (microseconds)
   */
  public writeMicroseconds(pulseWidth: number): void {
    if (!this.isAttached) return;

    // Clamp pulse width
    pulseWidth = Math.max(this.config.minPulseWidth, 
      Math.min(this.config.maxPulseWidth, pulseWidth));

    // Convert pulse width to angle
    const angle = this.pulseWidthToAngle(pulseWidth);
    this.write(angle);
  }

  /**
   * Get current servo angle
   */
  public read(): number {
    return Math.round(this.currentAngle / this.config.precision) * this.config.precision;
  }

  /**
   * Get current pulse width in microseconds
   */
  public readMicroseconds(): number {
    return this.angleToPulseWidth(this.currentAngle);
  }

  /**
   * Check if servo is attached
   */
  public attached(): boolean {
    return this.isAttached;
  }

  /**
   * Check if servo is currently moving
   */
  public isServoMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Get servo pin
   */
  public getPin(): number {
    return this.pin;
  }

  /**
   * Set external load on servo
   */
  public setLoad(loadKgCm: number): void {
    this.load = Math.max(0, loadKgCm);
    
    // If load exceeds torque while moving, stall
    if (this.load > this.config.stallTorque && this.isMoving) {
      this.isStalled = true;
      this.stopMovement();
      
      if (this.onStallCallback) {
        this.onStallCallback(this.currentAngle);
      }
    } else if (this.isStalled && this.load <= this.config.stallTorque) {
      // Resume movement if load is reduced
      this.isStalled = false;
      if (Math.abs(this.targetAngle - this.currentAngle) > this.config.deadband) {
        this.startMovement();
      }
    }
  }

  /**
   * Get current external load
   */
  public getLoad(): number {
    return this.load;
  }

  /**
   * Check if servo is stalled
   */
  public isServoStalled(): boolean {
    return this.isStalled;
  }

  /**
   * Set position change callback
   */
  public onPositionChange(callback: (position: ServoPosition) => void): void {
    this.onPositionChangeCallback = callback;
  }

  /**
   * Set stall callback
   */
  public onStall(callback: (angle: number) => void): void {
    this.onStallCallback = callback;
  }

  /**
   * Get current power consumption (mA)
   */
  public getCurrentConsumption(): number {
    if (!this.isAttached) return 0;
    
    if (this.isStalled) {
      return this.config.stallCurrent;
    } else if (this.isMoving) {
      // Higher current when moving under load
      const loadFactor = Math.min(this.load / this.config.stallTorque, 1);
      return this.config.operatingCurrent + (this.config.stallCurrent - this.config.operatingCurrent) * loadFactor * 0.5;
    } else {
      return this.config.operatingCurrent;
    }
  }

  /**
   * Get servo configuration
   */
  public getConfig(): ServoConfig {
    return { ...this.config };
  }

  /**
   * Calibrate servo pulse width range
   */
  public calibrate(minPulse: number, maxPulse: number): void {
    this.config.minPulseWidth = minPulse;
    this.config.maxPulseWidth = maxPulse;
  }

  /**
   * Set servo speed
   */
  public setSpeed(degreesPerSecond: number): void {
    this.config.speed = Math.max(1, Math.min(300, degreesPerSecond));
  }

  /**
   * Start smooth movement to target angle
   */
  private startMovement(): void {
    if (this.isStalled) return;
    
    this.stopMovement();
    this.isMoving = true;
    this.movementStartTime = Date.now();
    this.movementStartAngle = this.currentAngle;
    
    const angleDifference = this.targetAngle - this.currentAngle;
    const movementDuration = Math.abs(angleDifference) / this.config.speed * 1000; // ms
    
    const updateMovement = () => {
      if (!this.isMoving) return;
      
      const elapsed = Date.now() - this.movementStartTime;
      const progress = Math.min(elapsed / movementDuration, 1);
      
      // Use easing for more realistic movement
      const easedProgress = this.easeInOutCubic(progress);
      this.currentAngle = this.movementStartAngle + angleDifference * easedProgress;
      
      // Trigger position callback
      if (this.onPositionChangeCallback) {
        this.onPositionChangeCallback({
          angle: this.currentAngle,
          pulseWidth: this.angleToPulseWidth(this.currentAngle),
          timestamp: Date.now()
        });
      }
      
      if (progress >= 1) {
        this.currentAngle = this.targetAngle;
        this.isMoving = false;
        this.movementTimer = null;
      } else {
        this.movementTimer = setTimeout(updateMovement, 16); // ~60fps
      }
    };
    
    updateMovement();
  }

  /**
   * Stop current movement
   */
  private stopMovement(): void {
    this.isMoving = false;
    if (this.movementTimer) {
      clearTimeout(this.movementTimer);
      this.movementTimer = null;
    }
  }

  /**
   * Convert angle to pulse width
   */
  private angleToPulseWidth(angle: number): number {
    const range = this.config.maxAngle - this.config.minAngle;
    const pulseRange = this.config.maxPulseWidth - this.config.minPulseWidth;
    const normalizedAngle = (angle - this.config.minAngle) / range;
    
    return Math.round(this.config.minPulseWidth + normalizedAngle * pulseRange);
  }

  /**
   * Convert pulse width to angle
   */
  private pulseWidthToAngle(pulseWidth: number): number {
    const pulseRange = this.config.maxPulseWidth - this.config.minPulseWidth;
    const angleRange = this.config.maxAngle - this.config.minAngle;
    const normalizedPulse = (pulseWidth - this.config.minPulseWidth) / pulseRange;
    
    return this.config.minAngle + normalizedPulse * angleRange;
  }

  /**
   * Easing function for smooth movement
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Sweep servo between two angles
   */
  public sweep(minAngle: number, maxAngle: number, sweepsPerSecond: number = 0.5): void {
    if (!this.isAttached) return;
    
    let currentTarget = maxAngle;
    const sweepInterval = 1000 / (sweepsPerSecond * 2); // Half cycle time
    
    const doSweep = () => {
      if (!this.isAttached) return;
      
      this.write(currentTarget);
      currentTarget = currentTarget === maxAngle ? minAngle : maxAngle;
      
      setTimeout(doSweep, sweepInterval);
    };
    
    doSweep();
  }

  /**
   * Emergency stop - immediately halt movement
   */
  public emergencyStop(): void {
    this.stopMovement();
    this.targetAngle = this.currentAngle;
  }
}