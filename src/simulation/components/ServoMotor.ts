import { DigitalComponent } from './base/DigitalComponent';
import { ComponentUpdateContext } from './base/Component';

/**
 * Servo Motor component - precise position control motor
 */
export class ServoMotorComponent extends DigitalComponent {
  private currentAngle: number;  // Current servo angle in degrees
  private targetAngle: number;   // Target angle from PWM signal
  private minAngle: number;      // Minimum servo angle
  private maxAngle: number;      // Maximum servo angle
  private speed: number;         // Degrees per second movement speed
  private lastUpdateTime: number;
  private pwmFrequency: number;  // Expected PWM frequency (typically 50Hz)
  private pulseDuration: number; // Last measured pulse duration in microseconds

  constructor(id: string, minAngle: number = 0, maxAngle: number = 180) {
    super(id, 'servo', `SERVO_${id}`, [
      { id: 'vcc', name: 'VCC', number: 1, type: 'power', direction: 'input' },
      { id: 'gnd', name: 'GND', number: 2, type: 'ground', direction: 'input' },
      { id: 'pwm', name: 'PWM', number: 3, type: 'digital', direction: 'input' }
    ]);
    
    this.currentAngle = 90; // Start at center position
    this.targetAngle = 90;
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
    this.speed = 180; // 180 degrees per second (fast servo)
    this.lastUpdateTime = Date.now();
    this.pwmFrequency = 50; // 50Hz standard for servos
    this.pulseDuration = 1500; // 1.5ms center position
    
    this.properties = {
      minAngle,
      maxAngle,
      speed: this.speed,
      pwmFrequency: this.pwmFrequency,
      type: 'standard', // standard, continuous, or micro
      torque: '1.8kg-cm', // Example torque rating
      voltage: '4.8-6V'
    };
  }

  public getCurrentAngle(): number {
    return this.currentAngle;
  }

  public getTargetAngle(): number {
    return this.targetAngle;
  }

  public setTargetAngle(angle: number): void {
    this.targetAngle = Math.max(this.minAngle, Math.min(this.maxAngle, angle));
  }

  public isMoving(): boolean {
    return Math.abs(this.currentAngle - this.targetAngle) > 1; // 1 degree tolerance
  }

  public setSpeed(degreesPerSecond: number): void {
    this.speed = Math.max(1, Math.min(720, degreesPerSecond)); // Reasonable limits
    this.properties.speed = this.speed;
  }

  private pulseDurationToAngle(pulseDurationUs: number): number {
    // Standard servo PWM timing:
    // 1000μs (1ms) = 0°
    // 1500μs (1.5ms) = 90° (center)  
    // 2000μs (2ms) = 180°
    
    const minPulse = 1000; // μs
    const maxPulse = 2000; // μs
    
    // Clamp pulse duration to valid range
    const clampedPulse = Math.max(minPulse, Math.min(maxPulse, pulseDurationUs));
    
    // Convert to angle
    const angleRange = this.maxAngle - this.minAngle;
    const pulseRange = maxPulse - minPulse;
    const normalizedPulse = (clampedPulse - minPulse) / pulseRange;
    
    return this.minAngle + (normalizedPulse * angleRange);
  }

  private readPWMSignal(): void {
    const pwmVoltage = this.getPinVoltage('PWM');
    const isHighSignal = this.voltageToLogic(pwmVoltage);
    
    // Simplified PWM reading - in a real simulation this would measure pulse timing
    // For now, we'll use voltage level to estimate pulse duration
    if (isHighSignal) {
      // Simulate reading a PWM pulse duration based on some logic
      // In a real implementation, this would measure the actual pulse timing
      this.pulseDuration = 1000 + (pwmVoltage / 5.0) * 1000; // 1000-2000μs range
    }
    
    this.targetAngle = this.pulseDurationToAngle(this.pulseDuration);
  }

  public update(_context: ComponentUpdateContext): void {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;
    
    // Check power supply
    const vccVoltage = this.getPinVoltage('VCC');
    if (vccVoltage < 4.0) {
      // Insufficient power - servo won't move
      return;
    }
    
    // Read PWM signal to determine target position
    this.readPWMSignal();
    
    // Move servo towards target position
    if (this.isMoving()) {
      const angleDifference = this.targetAngle - this.currentAngle;
      const maxMovement = (this.speed * deltaTime) / 1000; // Convert to degrees per ms
      
      if (Math.abs(angleDifference) <= maxMovement) {
        // Can reach target in this update
        this.currentAngle = this.targetAngle;
      } else {
        // Move towards target at maximum speed
        const direction = Math.sign(angleDifference);
        this.currentAngle += direction * maxMovement;
      }
      
      // Calculate current consumption based on movement and load
      const movementRatio = Math.abs(angleDifference) / 180; // Normalized movement
      const baseCurrent = 0.1; // 100mA idle current
      const moveCurrent = 0.4; // 400mA additional when moving
      const totalCurrent = baseCurrent + (moveCurrent * movementRatio);
      
      this.setPinCurrent('VCC', totalCurrent);
      this.setPinCurrent('GND', -totalCurrent);
    } else {
      // Servo is at target position - just holding current
      this.setPinCurrent('VCC', 0.1); // 100mA holding current
      this.setPinCurrent('GND', -0.1);
    }
  }

  public reset(): void {
    this.currentAngle = 90; // Center position
    this.targetAngle = 90;
    this.pulseDuration = 1500;
    this.lastUpdateTime = Date.now();
    
    this.pins.forEach(pin => {
      pin.voltage = 0;
      pin.current = 0;
      pin.connected = false;
      pin.connectionId = undefined;
    });
  }

  public getRenderData(): any {
    return {
      type: 'servo',
      id: this.id,
      name: this.name,
      position: this.position,
      pins: Array.from(this.pins.values()),
      currentAngle: this.currentAngle,
      targetAngle: this.targetAngle,
      isMoving: this.isMoving(),
      servoType: this.properties.type,
      width: 40,
      height: 20,
      servoArm: {
        angle: this.currentAngle,
        length: 15
      }
    };
  }

  public validate(): string[] {
    const errors: string[] = [];
    
    if (this.minAngle >= this.maxAngle) {
      errors.push('Minimum angle must be less than maximum angle');
    }
    
    if (this.speed <= 0) {
      errors.push('Speed must be greater than 0');
    }
    
    // Check power supply
    const vccVoltage = this.getPinVoltage('VCC');
    const gndVoltage = this.getPinVoltage('GND');
    const powerVoltage = vccVoltage - gndVoltage;
    
    if (vccVoltage > 0 && powerVoltage < 4.0) {
      errors.push(`Power supply voltage (${powerVoltage.toFixed(1)}V) too low for reliable operation`);
    }
    
    if (powerVoltage > 7.0) {
      errors.push(`Power supply voltage (${powerVoltage.toFixed(1)}V) may damage servo`);
    }
    
    // Check if PWM signal is reasonable
    const pwmVoltage = this.getPinVoltage('PWM');
    if (pwmVoltage > 5.5) {
      errors.push('PWM signal voltage too high - may damage servo');
    }
    
    return errors;
  }

  public getInfo(): Record<string, any> {
    const vccVoltage = this.getPinVoltage('VCC');
    const gndVoltage = this.getPinVoltage('GND');
    const powerVoltage = vccVoltage - gndVoltage;
    const current = Math.abs(this.getPinCurrent('VCC'));
    
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      currentAngle: `${this.currentAngle.toFixed(1)}°`,
      targetAngle: `${this.targetAngle.toFixed(1)}°`,
      status: this.isMoving() ? 'Moving' : 'Positioned',
      speed: `${this.speed}°/s`,
      angleRange: `${this.minAngle}° - ${this.maxAngle}°`,
      powerVoltage: `${powerVoltage.toFixed(1)}V`,
      current: `${(current * 1000).toFixed(0)}mA`,
      powerConsumption: `${(powerVoltage * current * 1000).toFixed(0)}mW`,
      pulseDuration: `${this.pulseDuration}μs`,
      servoType: this.properties.type,
      componentType: 'Actuator Component',
      description: 'Precise position control motor'
    };
  }
}