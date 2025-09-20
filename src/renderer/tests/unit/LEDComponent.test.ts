/**
 * Unit tests for LED component
 */

import { LEDComponent } from '../../../simulation/components/LED';
import { ComponentUpdateContext } from '../../../simulation/components/base/Component';

describe('LEDComponent', () => {
  let led: LEDComponent;

  beforeEach(() => {
    led = new LEDComponent('test-led', 'red', 2.0);
  });

  describe('constructor', () => {
    it('should create LED with correct initial state', () => {
      expect(led.id).toBe('test-led');
      expect(led.type).toBe('led');
      expect(led.name).toBe('LED_red');
      
      const renderData = led.getRenderData();
      expect(renderData.isOn).toBe(false);
      expect(renderData.brightness).toBe(0);
      expect(renderData.color).toBe('red');
    });

    it('should initialize pins correctly', () => {
      const anodePin = led.pins.get('Anode');
      const cathodePin = led.pins.get('Cathode');

      expect(anodePin).toBeDefined();
      expect(cathodePin).toBeDefined();
      expect(anodePin?.type).toBe('digital');
      expect(cathodePin?.type).toBe('digital');
    });
  });

  describe('voltage behavior', () => {
    const updateContext: ComponentUpdateContext = {
      deltaTime: 16.67,
      currentTime: 100,
      voltage: 5.0
    };

    it('should turn on when forward voltage is reached', () => {
      led.setPinVoltage('Anode', 3.0);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);

      const renderData = led.getRenderData();
      expect(renderData.isOn).toBe(true);
      expect(renderData.brightness).toBeGreaterThan(0);
    });

    it('should remain off when forward voltage is not reached', () => {
      led.setPinVoltage('Anode', 1.5);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);

      const renderData = led.getRenderData();
      expect(renderData.isOn).toBe(false);
      expect(renderData.brightness).toBe(0);
    });

    it('should remain off when reverse biased', () => {
      led.setPinVoltage('Anode', 0.0);
      led.setPinVoltage('Cathode', 3.0);
      led.update(updateContext);

      const renderData = led.getRenderData();
      expect(renderData.isOn).toBe(false);
    });

    it('should handle voltage changes dynamically', () => {
      // Initially on
      led.setPinVoltage('Anode', 3.0);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);
      expect(led.getRenderData().isOn).toBe(true);

      // Turn off
      led.setPinVoltage('Anode', 1.0);
      led.update(updateContext);
      expect(led.getRenderData().isOn).toBe(false);
    });
  });

  describe('brightness calculation', () => {
    const updateContext: ComponentUpdateContext = {
      deltaTime: 16.67,
      currentTime: 100,
      voltage: 5.0
    };

    it('should calculate brightness based on current', () => {
      led.setPinVoltage('Anode', 2.5);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);

      const renderData = led.getRenderData();
      expect(renderData.brightness).toBeGreaterThan(0);
      expect(renderData.brightness).toBeLessThanOrEqual(1);
    });

    it('should have higher brightness with higher voltage', () => {
      // Low voltage
      led.setPinVoltage('Anode', 2.2);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);
      const lowBrightness = led.getRenderData().brightness;

      // Reset and test higher voltage
      led.reset();
      led.setPinVoltage('Anode', 3.5);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);
      const highBrightness = led.getRenderData().brightness;

      expect(highBrightness).toBeGreaterThan(lowBrightness);
    });
  });

  describe('reset functionality', () => {
    it('should reset to initial state', () => {
      const updateContext: ComponentUpdateContext = {
        deltaTime: 16.67,
        currentTime: 100,
        voltage: 5.0
      };

      // Turn on LED
      led.setPinVoltage('Anode', 3.0);
      led.setPinVoltage('Cathode', 0.0);
      led.update(updateContext);
      expect(led.getRenderData().isOn).toBe(true);

      // Reset
      led.reset();
      const renderData = led.getRenderData();
      expect(renderData.isOn).toBe(false);
      expect(renderData.brightness).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate properly when pins are connected', () => {
      const anodePin = led.pins.get('Anode');
      const cathodePin = led.pins.get('Cathode');
      
      if (anodePin && cathodePin) {
        anodePin.connected = true;
        anodePin.connectionId = 'conn1';
        cathodePin.connected = true;
        cathodePin.connectionId = 'conn2';
      }

      const errors = led.validate();
      expect(errors).toHaveLength(0);
    });

    it('should report validation errors when pins are not connected', () => {
      const errors = led.validate();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Anode'))).toBe(true);
      expect(errors.some(error => error.includes('Cathode'))).toBe(true);
    });
  });

  describe('properties', () => {
    it('should have correct default properties', () => {
      expect(led.properties).toEqual({
        color: 'red',
        forwardVoltage: 2.0,
        maxCurrent: 0.025,
        typicalCurrent: 0.02
      });
    });

    it('should allow different colors and voltages', () => {
      const blueLed = new LEDComponent('blue-led', 'blue', 3.2);
      expect(blueLed.properties.color).toBe('blue');
      expect(blueLed.properties.forwardVoltage).toBe(3.2);
    });
  });
});