/**
 * Integration tests for the simulation system
 */

import { SimpleSimulationManager } from '../../../simulation/core/SimpleSimulationManager';
import { ArduinoUnoBoard } from '../../../simulation/boards/ArduinoUno';
import { LEDComponent } from '../../../simulation/components/LED';

describe('Simulation Integration Tests', () => {
  let simulation: SimpleSimulationManager;

  beforeEach(() => {
    simulation = new SimpleSimulationManager();
  });

  describe('Arduino and LED Integration', () => {
    it('should connect LED to Arduino and control it', () => {
      const arduino = new ArduinoUnoBoard('arduino-1', 'Test Arduino');
      const led = new LEDComponent('led-1', 'red');

      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      simulation.addLED(led, { x: 100, y: 0 });

      // Connect LED anode to Arduino pin 13, cathode to ground
      simulation.connectLEDToArduino('led-1', 'arduino-1', 13);
      simulation.connectLEDToGround('led-1', 'arduino-1');

      // Verify connections exist
      const connections = simulation.getAllConnections();
      expect(connections.length).toBe(2);

      // Set Arduino pin 13 HIGH
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);

      // In a real app, this would be handled by the simulation loop
      // Manually propagate the signal for testing
      const pin13 = arduino.getPin(13);
      if (pin13) {
        led.setPinVoltage('Anode', pin13.voltage);
        led.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: 5.0 });
      }

      // Check LED state
      const ledRenderData = led.getRenderData();
      expect(ledRenderData.isOn).toBe(true);
      expect(ledRenderData.brightness).toBeGreaterThan(0);
    });

    it('should handle PWM control of LED brightness', () => {
      const arduino = new ArduinoUnoBoard('arduino-pwm', 'PWM Arduino');
      const led = new LEDComponent('led-pwm', 'blue', 1.0); // Use 1.0V forward voltage for testing

      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      simulation.addLED(led, { x: 100, y: 0 });

      // Connect to PWM-capable pin
      simulation.connectLEDToArduino('led-pwm', 'arduino-pwm', 9);
      simulation.connectLEDToGround('led-pwm', 'arduino-pwm');

      // Test different PWM values
      const testValues = [0, 64, 128, 192, 255];
      
      arduino.setPinMode(9, 'OUTPUT');
      
      testValues.forEach(pwmValue => {
        arduino.analogWrite(9, pwmValue);
        
        // Manually propagate the signal for testing
        const pin9 = arduino.getPin(9);
        if (pin9) {
          led.setPinVoltage('Anode', pin9.voltage);
          led.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: pin9.voltage });
        }
        
        const ledRenderData = led.getRenderData();
        const expectedBrightness = pwmValue / 255;
        
        if (pwmValue === 0) {
          expect(ledRenderData.isOn).toBe(false);
          expect(ledRenderData.brightness).toBe(0);
        } else {
          expect(ledRenderData.isOn).toBe(true);
          expect(ledRenderData.brightness).toBeCloseTo(expectedBrightness, 1);
        }
      });
    });
  });

  describe('Multiple LED Control', () => {
    it('should handle multiple LEDs with different behaviors', () => {
      const arduino = new ArduinoUnoBoard('multi-led-arduino', 'Multi-LED Arduino');
      const redLed = new LEDComponent('red-led', 'red');
      const greenLed = new LEDComponent('green-led', 'green');
      const blueLed = new LEDComponent('blue-led', 'blue');

      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      simulation.addLED(redLed, { x: 100, y: 0 });
      simulation.addLED(greenLed, { x: 100, y: 50 });
      simulation.addLED(blueLed, { x: 100, y: 100 });

      // Connect LEDs to different pins
      simulation.connectLEDToArduino('red-led', 'multi-led-arduino', 11);   // PWM
      simulation.connectLEDToArduino('green-led', 'multi-led-arduino', 12); // Digital
      simulation.connectLEDToArduino('blue-led', 'multi-led-arduino', 9);   // PWM

      // Connect all to ground
      simulation.connectLEDToGround('red-led', 'multi-led-arduino');
      simulation.connectLEDToGround('green-led', 'multi-led-arduino');
      simulation.connectLEDToGround('blue-led', 'multi-led-arduino');

      // Setup pins
      arduino.setPinMode(11, 'OUTPUT');
      arduino.setPinMode(12, 'OUTPUT');
      arduino.setPinMode(9, 'OUTPUT');

      // Test different control patterns
      // Red LED: PWM fade
      arduino.analogWrite(11, 128);
      const pin11 = arduino.getPin(11);
      if (pin11) {
        redLed.setPinVoltage('Anode', pin11.voltage);
        redLed.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: pin11.voltage });
      }

      // Green LED: Digital on
      arduino.digitalWrite(12, true);
      const pin12 = arduino.getPin(12);
      if (pin12) {
        greenLed.setPinVoltage('Anode', pin12.voltage);
        greenLed.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: 5.0 });
      }

      // Blue LED: PWM bright
      arduino.analogWrite(9, 255);
      const pin9 = arduino.getPin(9);
      if (pin9) {
        blueLed.setPinVoltage('Anode', pin9.voltage);
        blueLed.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: pin9.voltage });
      }

      // Verify each LED has correct state
      const redData = redLed.getRenderData();
      const greenData = greenLed.getRenderData();
      const blueData = blueLed.getRenderData();

      expect(redData.isOn).toBe(true);
      expect(redData.brightness).toBeCloseTo(0.5, 1); // 128/255 ≈ 0.5

      expect(greenData.isOn).toBe(true);
      expect(greenData.brightness).toBe(1.0); // Full brightness for digital HIGH

      expect(blueData.isOn).toBe(true);
      expect(blueData.brightness).toBe(1.0); // 255/255 = 1.0
    });
  });

  describe('Simulation State Management', () => {
    it('should start and stop simulation correctly', () => {
      const arduino = new ArduinoUnoBoard('state-arduino', 'State Arduino');
      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });

      expect(simulation.getIsRunning()).toBe(false);

      simulation.start();
      expect(simulation.getIsRunning()).toBe(true);

      simulation.stop();
      expect(simulation.getIsRunning()).toBe(false);
    });

    it('should manage components and connections', () => {
      const arduino = new ArduinoUnoBoard('conn-arduino', 'Connection Arduino');
      const led1 = new LEDComponent('led-1', 'red');
      const led2 = new LEDComponent('led-2', 'green');

      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      simulation.addLED(led1, { x: 100, y: 0 });
      simulation.addLED(led2, { x: 100, y: 50 });

      // Create connections
      simulation.connectLEDToArduino('led-1', 'conn-arduino', 13);
      simulation.connectLEDToArduino('led-2', 'conn-arduino', 12);
      simulation.connectLEDToGround('led-1', 'conn-arduino');
      simulation.connectLEDToGround('led-2', 'conn-arduino');

      // Verify component and connection management
      const components = simulation.getAllComponents();
      const connections = simulation.getAllConnections();

      expect(components.length).toBe(3); // Arduino + 2 LEDs
      expect(connections.length).toBe(4); // 2 anode + 2 cathode connections

      // Verify component structure
      const arduinoComp = components.find(c => c.type === 'arduino-uno');
      const ledComps = components.filter(c => c.type === 'led');

      expect(arduinoComp).toBeDefined();
      expect(ledComps.length).toBe(2);
      expect(ledComps[0].id).toBe('led-1');
      expect(ledComps[1].id).toBe('led-2');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid component connections gracefully', () => {
      const arduino = new ArduinoUnoBoard('error-arduino', 'Error Arduino');
      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });

      // Try to connect non-existent LED
      expect(() => {
        simulation.connectLEDToArduino('non-existent-led', 'error-arduino', 13);
      }).not.toThrow();

      // Try to connect to non-existent Arduino
      const led = new LEDComponent('error-led', 'red');
      simulation.addLED(led, { x: 100, y: 0 });
      
      expect(() => {
        simulation.connectLEDToArduino('error-led', 'non-existent-arduino', 13);
      }).not.toThrow();

      // Verify connections don't interfere with valid operations
      simulation.connectLEDToArduino('error-led', 'error-arduino', 13);
      const connections = simulation.getAllConnections();
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should validate component states and report errors', () => {
      const led = new LEDComponent('unconnected-led', 'red');
      simulation.addLED(led, { x: 100, y: 0 });

      // LED should report validation errors when not connected
      const errors = led.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('not connected'))).toBe(true);
    });

    it('should handle Arduino pin validation', () => {
      const arduino = new ArduinoUnoBoard('pin-test-arduino', 'Pin Test Arduino');
      
      // Test valid pin operations
      expect(() => {
        arduino.setPinMode(13, 'OUTPUT');
        arduino.digitalWrite(13, true);
      }).not.toThrow();

      // Test PWM on PWM-capable pins
      expect(() => {
        arduino.setPinMode(9, 'OUTPUT');
        arduino.analogWrite(9, 128);
      }).not.toThrow();

      // Verify pin states
      const pin13 = arduino.getPin(13);
      const pin9 = arduino.getPin(9);

      expect(pin13?.digitalValue).toBe(true);
      expect(pin9?.pwmValue).toBe(128);
    });
  });

  describe('Real-world Simulation Scenarios', () => {
    it('should simulate a simple LED blink pattern', () => {
      const arduino = new ArduinoUnoBoard('blink-arduino', 'Blink Arduino');
      const led = new LEDComponent('blink-led', 'red');

      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      simulation.addLED(led, { x: 100, y: 0 });
      simulation.connectLEDToArduino('blink-led', 'blink-arduino', 13);
      simulation.connectLEDToGround('blink-led', 'blink-arduino');

      arduino.setPinMode(13, 'OUTPUT');

      // Simulate blink pattern: on -> off -> on
      const testPattern = [true, false, true];

      testPattern.forEach(state => {
        arduino.digitalWrite(13, state);
        const pin13 = arduino.getPin(13);
        
        if (pin13) {
          led.setPinVoltage('Anode', pin13.voltage);
          led.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: 5.0 });
        }

        const ledData = led.getRenderData();
        expect(ledData.isOn).toBe(state);
        expect(ledData.brightness).toBe(state ? 1.0 : 0);
      });
    });

    it('should simulate PWM breathing effect', () => {
      const arduino = new ArduinoUnoBoard('pwm-arduino', 'PWM Arduino');
      const led = new LEDComponent('pwm-led', 'blue', 1.0); // Use 1.0V forward voltage for testing

      simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      simulation.addLED(led, { x: 100, y: 0 });
      simulation.connectLEDToArduino('pwm-led', 'pwm-arduino', 9);
      simulation.connectLEDToGround('pwm-led', 'pwm-arduino');

      arduino.setPinMode(9, 'OUTPUT');

      // Simulate breathing pattern: fade in and out
      const breathingPattern = [0, 64, 128, 192, 255, 192, 128, 64, 0];

      breathingPattern.forEach(pwmValue => {
        arduino.analogWrite(9, pwmValue);
        const pin9 = arduino.getPin(9);
        
        if (pin9) {
          led.setPinVoltage('Anode', pin9.voltage);
          led.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: pin9.voltage });
        }

        const ledData = led.getRenderData();
        const expectedBrightness = pwmValue / 255;

        if (pwmValue === 0) {
          expect(ledData.isOn).toBe(false);
          expect(ledData.brightness).toBe(0);
        } else {
          expect(ledData.isOn).toBe(true);
          expect(ledData.brightness).toBeCloseTo(expectedBrightness, 2);
        }
      });
    });
  });
});