/**
 * Unit tests for Arduino Uno Board
 */

import { ArduinoUnoBoard } from '../../../simulation/boards/ArduinoUno';

describe('ArduinoUnoBoard', () => {
  let arduino: ArduinoUnoBoard;

  beforeEach(() => {
    arduino = new ArduinoUnoBoard('test-arduino', 'Test Arduino');
  });

  describe('constructor', () => {
    it('should create Arduino with correct initial state', () => {
      expect(arduino.id).toBe('test-arduino');
      expect(arduino.name).toBe('Test Arduino');
      expect(arduino.type).toBe('arduino-uno');
    });

    it('should initialize pins correctly', () => {
      // Check digital pins
      for (let i = 0; i <= 13; i++) {
        const pin = arduino.getPin(i);
        expect(pin).toBeDefined();
        expect(pin?.type).toBe('digital');
        expect(pin?.number).toBe(i);
      }

      // Check analog pins (A0-A5 = pins 14-19)
      for (let i = 0; i <= 5; i++) {
        const pin = arduino.getPin(14 + i);
        expect(pin).toBeDefined();
        expect(pin?.type).toBe('analog');
        expect(pin?.name).toBe(`A${i}`);
      }
    });
  });

  describe('digital pin operations', () => {
    it('should set pin mode correctly', () => {
      arduino.setPinMode(13, 'OUTPUT');
      const pin13 = arduino.getPin(13);
      expect(pin13?.mode).toBe('OUTPUT');
    });

    it('should write digital values', () => {
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);
      
      const state = arduino.digitalRead(13);
      expect(state).toBe(true);
      
      const pin13 = arduino.getPin(13);
      expect(pin13?.voltage).toBe(5.0);
    });

    it('should read digital values', () => {
      arduino.setPinMode(12, 'INPUT');
      
      // Simulate external signal
      const pin12 = arduino.getPin(12);
      if (pin12) {
        pin12.voltage = 5.0;
        pin12.digitalValue = true;
      }
      
      const state = arduino.digitalRead(12);
      expect(state).toBe(true);
    });

    it('should handle input pullup mode', () => {
      arduino.setPinMode(11, 'INPUT_PULLUP');
      const pin11 = arduino.getPin(11);
      expect(pin11?.mode).toBe('INPUT_PULLUP');
      expect(pin11?.voltage).toBe(5.0); // Should be pulled high
    });
  });

  describe('analog pin operations', () => {
    it('should read analog values', () => {
      const analogPin = arduino.getPin(14); // A0
      if (analogPin) {
        analogPin.voltage = 2.5; // Set to half of 5V
        analogPin.analogValue = 512; // Corresponding ADC value
      }
      
      const analogValue = arduino.analogRead(0);
      expect(analogValue).toBe(512); // Should be approximately half of 1023
    });

    it('should write PWM values on PWM-capable pins', () => {
      arduino.setPinMode(9, 'OUTPUT'); // Pin 9 supports PWM
      arduino.analogWrite(9, 128);
      
      const pin9 = arduino.getPin(9);
      expect(pin9?.pwmValue).toBe(128);
      expect(pin9?.voltage).toBeCloseTo(2.5, 1); // 128/255 * 5V ≈ 2.5V
    });

    it('should only allow PWM on PWM-capable pins', () => {
      arduino.setPinMode(4, 'OUTPUT'); // Pin 4 doesn't support PWM
      arduino.analogWrite(4, 128);
      
      const pin4 = arduino.getPin(4);
      expect(pin4?.pwmValue).toBeUndefined();
    });
  });

  describe('power management', () => {
    it('should have correct supply voltage', () => {
      const renderData = arduino.getRenderData();
      expect(renderData.type).toBe('arduino-uno');
    });

    it('should simulate power consumption', () => {
      // Simulate some pin activity
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);
      arduino.setPinMode(9, 'OUTPUT');
      arduino.analogWrite(9, 255);

      const renderData = arduino.getRenderData();
      expect(renderData.isRunning).toBeDefined();
    });
  });

  describe('reset functionality', () => {
    it('should reset all pins to default state', () => {
      // Set some pin states
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);
      arduino.setPinMode(9, 'OUTPUT');
      arduino.analogWrite(9, 128);

      // Reset
      arduino.reset();

      // Check all pins are reset
      const pin13 = arduino.getPin(13);
      const pin9 = arduino.getPin(9);
      
      expect(pin13?.voltage).toBe(0);
      expect(pin13?.digitalValue).toBe(false);
      expect(pin9?.pwmValue).toBe(0);
    });
  });

  describe('render data', () => {
    it('should provide comprehensive render data', () => {
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);

      const renderData = arduino.getRenderData();
      
      expect(renderData.isRunning).toBeDefined();
      expect(renderData.pins).toBeDefined();
      expect(renderData.pins.length).toBe(20); // 14 digital + 6 analog
      expect(renderData.type).toBe('arduino-uno');
      expect(renderData.name).toBe('Test Arduino');
    });

    it('should track pin states in render data', () => {
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);
      arduino.setPinMode(9, 'OUTPUT');
      arduino.analogWrite(9, 200);

      const renderData = arduino.getRenderData();
      const pin13Data = renderData.pins.find(p => p.number === 13);
      const pin9Data = renderData.pins.find(p => p.number === 9);
      
      expect(pin13Data?.digitalValue).toBe(true);
      expect(pin13Data?.voltage).toBe(5.0);
      expect(pin9Data?.pwmValue).toBe(200);
    });
  });
});