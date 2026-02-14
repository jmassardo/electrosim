import { ServoMotorComponent } from '../../../../src/simulation/components/ServoMotor';

describe('ServoMotorComponent', () => {
  let servo: ServoMotorComponent;

  beforeEach(() => {
    servo = new ServoMotorComponent('test-servo');
  });

  describe('Constructor', () => {
    test('should create servo with default configuration', () => {
      expect(servo.getId()).toBe('test-servo');
      expect(servo.getType()).toBe('servo');
      expect(servo.getLabel()).toBe('SERVO_test-servo');
      expect(servo.getCurrentAngle()).toBe(90);
      expect(servo.getTargetAngle()).toBe(90);
    });

    test('should create servo with custom angle range', () => {
      const customServo = new ServoMotorComponent('custom', -90, 90);
      expect(customServo.properties.minAngle).toBe(-90);
      expect(customServo.properties.maxAngle).toBe(90);
    });

    test('should have correct pin configuration', () => {
      const pins = servo.getPins();
      expect(pins).toHaveLength(3);
      
      expect(pins[0]).toEqual({
        id: 'vcc',
        name: 'VCC',
        number: 1,
        type: 'power',
        direction: 'input'
      });
      
      expect(pins[1]).toEqual({
        id: 'gnd',
        name: 'GND',
        number: 2,
        type: 'ground',
        direction: 'input'
      });
      
      expect(pins[2]).toEqual({
        id: 'pwm',
        name: 'PWM',
        number: 3,
        type: 'digital',
        direction: 'input'
      });
    });

    test('should have correct default properties', () => {
      expect(servo.properties).toMatchObject({
        minAngle: 0,
        maxAngle: 180,
        speed: 180,
        pwmFrequency: 50,
        type: 'standard',
        torque: '1.8kg-cm',
        voltage: '4.8-6V'
      });
    });
  });

  describe('Angle Control', () => {
    test('should set target angle from PWM pulse duration', () => {
      // 1ms pulse = 0 degrees
      servo.setPulseWidth(1000);
      expect(servo.getTargetAngle()).toBe(0);
      
      // 1.5ms pulse = 90 degrees  
      servo.setPulseWidth(1500);
      expect(servo.getTargetAngle()).toBe(90);
      
      // 2ms pulse = 180 degrees
      servo.setPulseWidth(2000);
      expect(servo.getTargetAngle()).toBe(180);
    });

    test('should clamp angles to valid range', () => {
      servo.setPulseWidth(500); // Should result in angle below minimum
      expect(servo.getTargetAngle()).toBe(0);
      
      servo.setPulseWidth(2500); // Should result in angle above maximum
      expect(servo.getTargetAngle()).toBe(180);
    });

    test('should handle custom angle ranges', () => {
      const customServo = new ServoMotorComponent('custom', -45, 45);
      
      customServo.setPulseWidth(1000); // Should map to -45 degrees
      expect(customServo.getTargetAngle()).toBe(-45);
      
      customServo.setPulseWidth(2000); // Should map to 45 degrees
      expect(customServo.getTargetAngle()).toBe(45);
    });
  });

  describe('Movement Simulation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should gradually move to target angle', () => {
      const context = {
        deltaTime: 100, // 100ms
        currentTime: 1000,
        voltage: { vcc: 5.0, gnd: 0.0, pwm: 3.3 }
      };

      // Set target to 180 degrees
      servo.setPulseWidth(2000);
      expect(servo.getTargetAngle()).toBe(180);
      expect(servo.getCurrentAngle()).toBe(90); // Still at start position

      // Update servo (should move towards target)
      servo.update(context);
      
      // Should have moved but not reached target yet
      // Speed is 180 deg/sec, so in 100ms should move 18 degrees
      expect(servo.getCurrentAngle()).toBe(108); // 90 + 18
      expect(servo.getCurrentAngle()).toBeLessThan(180);
    });

    test('should respect movement speed', () => {
      servo.setProperty('speed', 90); // 90 degrees per second
      
      const context = {
        deltaTime: 1000, // 1 second
        currentTime: 2000,
        voltage: { vcc: 5.0, gnd: 0.0, pwm: 3.3 }
      };

      servo.setPulseWidth(2000); // Target 180 degrees
      servo.update(context);
      
      // Should move exactly 90 degrees in 1 second
      expect(servo.getCurrentAngle()).toBe(180); // 90 + 90 = 180, reached target
    });

    test('should not overshoot target angle', () => {
      const context = {
        deltaTime: 2000, // 2 seconds - more than needed
        currentTime: 3000,
        voltage: { vcc: 5.0, gnd: 0.0, pwm: 3.3 }
      };

      servo.setPulseWidth(1000); // Target 0 degrees (90 degrees movement)
      servo.update(context);
      
      // Should stop at target, not overshoot
      expect(servo.getCurrentAngle()).toBe(0);
    });
  });

  describe('PWM Signal Processing', () => {
    test('should detect valid PWM signals', () => {
      expect(servo.isPWMValid(1500)).toBe(true); // Valid center pulse
      expect(servo.isPWMValid(1000)).toBe(true); // Valid minimum pulse
      expect(servo.isPWMValid(2000)).toBe(true); // Valid maximum pulse
    });

    test('should reject invalid PWM signals', () => {
      expect(servo.isPWMValid(500)).toBe(false);  // Too short
      expect(servo.isPWMValid(2500)).toBe(false); // Too long
      expect(servo.isPWMValid(0)).toBe(false);    // Invalid
    });

    test('should handle PWM frequency validation', () => {
      servo.setProperty('pwmFrequency', 50);
      
      // Test with correct frequency (50Hz = 20ms period)
      expect(servo.isFrequencyValid(50)).toBe(true);
      expect(servo.isFrequencyValid(60)).toBe(true); // Close enough
      
      // Test with incorrect frequency
      expect(servo.isFrequencyValid(10)).toBe(false); // Too slow
      expect(servo.isFrequencyValid(1000)).toBe(false); // Too fast
    });
  });

  describe('Power and Voltage', () => {
    test('should require proper power supply', () => {
      const context = {
        deltaTime: 100,
        currentTime: 1000,
        voltage: { vcc: 3.0, gnd: 0.0, pwm: 3.3 } // Under voltage
      };

      servo.setPulseWidth(2000);
      servo.update(context);
      
      // Should move slower or not at all with insufficient voltage
      expect(servo.getCurrentAngle()).toBeLessThanOrEqual(90);
    });

    test('should calculate current consumption', () => {
      // Under load (moving)
      servo.setPulseWidth(2000);
      const movingCurrent = servo.getCurrentConsumption();
      
      // At rest (holding position)
      const context = {
        deltaTime: 1000,
        currentTime: 2000,
        voltage: { vcc: 5.0, gnd: 0.0, pwm: 3.3 }
      };
      servo.update(context); // Allow to reach target
      
      const restingCurrent = servo.getCurrentConsumption();
      
      expect(movingCurrent).toBeGreaterThan(restingCurrent);
      expect(restingCurrent).toBeGreaterThan(0); // Always draws some current
    });
  });

  describe('Error Handling', () => {
    test('should handle missing power', () => {
      const context = {
        deltaTime: 100,
        currentTime: 1000,
        voltage: { vcc: 0, gnd: 0.0, pwm: 3.3 } // No power
      };

      servo.setPulseWidth(2000);
      const initialAngle = servo.getCurrentAngle();
      servo.update(context);
      
      // Should not move without power
      expect(servo.getCurrentAngle()).toBe(initialAngle);
    });

    test('should handle invalid pulse widths gracefully', () => {
      expect(() => servo.setPulseWidth(-100)).not.toThrow();
      expect(() => servo.setPulseWidth(5000)).not.toThrow();
      
      // Should clamp to valid range
      servo.setPulseWidth(-100);
      expect(servo.getTargetAngle()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON correctly', () => {
      servo.setPulseWidth(1800);
      servo.setProperty('speed', 120);
      
      const serialized = servo.toJSON();
      
      expect(serialized).toMatchObject({
        id: 'test-servo',
        type: 'servo',
        properties: expect.objectContaining({
          minAngle: 0,
          maxAngle: 180,
          speed: 120,
          type: 'standard'
        })
      });
    });

    test('should restore from JSON correctly', () => {
      const jsonData = {
        id: 'restored-servo',
        type: 'servo',
        properties: {
          minAngle: -90,
          maxAngle: 90,
          speed: 60,
          type: 'micro'
        }
      };

      const restoredServo = ServoMotorComponent.fromJSON(jsonData);
      
      expect(restoredServo.getId()).toBe('restored-servo');
      expect(restoredServo.properties.minAngle).toBe(-90);
      expect(restoredServo.properties.maxAngle).toBe(90);
      expect(restoredServo.properties.speed).toBe(60);
    });
  });
});