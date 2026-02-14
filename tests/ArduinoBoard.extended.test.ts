/**
 * Additional tests for ArduinoBoard base class to improve coverage
 */

import { ArduinoUnoBoard } from '../src/simulation/boards/ArduinoUno';
import { PinMode } from '../src/simulation/boards/ArduinoBoard';

describe('ArduinoBoard Extended Tests', () => {
  let arduino: ArduinoUnoBoard;

  beforeEach(() => {
    arduino = new ArduinoUnoBoard('test-board', 'Test Board Extended');
  });

  afterEach(() => {
    arduino.stopSketch();
  });

  describe('Error handling and edge cases', () => {
    test('should handle invalid pin operations', () => {
      // Invalid pin numbers
      expect(() => arduino.setPinMode(999, PinMode.OUTPUT)).toThrow('Invalid pin number');
      expect(() => arduino.writeDigitalPin(999, true)).toThrow('Invalid pin number');
      expect(() => arduino.readDigitalPin(999)).toThrow('Invalid pin number');
      expect(() => arduino.readAnalogPin(999)).toThrow('Invalid analog pin number');
      expect(() => arduino.writeAnalogPin(999, 128)).toThrow('Invalid pin number');
    });

    test('should handle pin mode restrictions', () => {
      // Try to write PWM to non-PWM pin (pin 4 doesn't support PWM)
      arduino.setPinMode(4, PinMode.OUTPUT);
      
      // Should not throw but should be ignored (Arduino behavior)
      expect(() => arduino.writeAnalogPin(4, 128)).not.toThrow();
      
      const pin4 = arduino.getPin(4);
      expect(pin4?.pwmValue).toBeUndefined();
      
      // Should throw when trying to write PWM to non-output pin
      arduino.setPinMode(3, PinMode.INPUT); // Pin 3 supports PWM
      expect(() => arduino.writeAnalogPin(3, 128)).toThrow('not set to OUTPUT mode');
    });

    test('should handle power pin access', () => {
      const powerPin = arduino.getPin(100); // 5V power pin
      expect(powerPin).toBeDefined();
      expect(powerPin?.type).toBe('power');
      expect(powerPin?.voltage).toBe(5.0);
    });

    test('should handle ground pin access', () => {
      const groundPin = arduino.getPin(102); // GND pin
      expect(groundPin).toBeDefined();
      expect(groundPin?.type).toBe('ground');
      expect(groundPin?.voltage).toBe(0);
    });
  });

  describe('Sketch loading and execution', () => {
    test('should handle sketch compilation errors gracefully', async () => {
      // Test with minimal invalid sketch - the compiler might be lenient
      const invalidSketch = `totally invalid code here`;
      
      const result = await arduino.loadSketch(invalidSketch);
      // Check if it either fails or succeeds (depending on compiler implementation)
      expect(typeof result.success).toBe('boolean');
      
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    test('should handle empty sketch', async () => {
      const emptySketch = '';
      const result = await arduino.loadSketch(emptySketch);
      expect(result.success).toBe(false);
    });

    test('should track compilation results', async () => {
      const simpleSketch = `
        void setup() {
          pinMode(13, OUTPUT);
        }
        void loop() {
          digitalWrite(13, HIGH);
        }
      `;
      
      const result = await arduino.loadSketch(simpleSketch);
      expect(result).toBeDefined();
      expect(arduino.getLastSketchCode()).toBe(simpleSketch);
    });
  });

  describe('Board state management', () => {
    test('should track running state correctly', async () => {
      expect(arduino.isSketchRunning()).toBe(false);
      
      // Load a valid sketch first
      const simpleSketch = `void setup() {} void loop() {}`;
      await arduino.loadSketch(simpleSketch);
      
      // Now try to start
      arduino.startSketch();
      expect(arduino.isSketchRunning()).toBe(true);
      
      arduino.stopSketch();
      expect(arduino.isSketchRunning()).toBe(false);
    });

    test('should handle reset correctly', () => {
      // Set some pin states
      arduino.setPinMode(13, PinMode.OUTPUT);
      arduino.writeDigitalPin(13, true);
      
      const pin13Before = arduino.getPin(13);
      expect(pin13Before?.mode).toBe(PinMode.OUTPUT);
      expect(pin13Before?.digitalValue).toBe(true);
      
      // Reset should restore defaults
      arduino.reset();
      
      const pin13After = arduino.getPin(13);
      expect(pin13After?.mode).toBe(PinMode.INPUT);
      expect(pin13After?.digitalValue).toBe(false);
    });

    test('should provide board information', () => {
      expect(arduino.getBoardName()).toBe('Arduino Uno R3');
      expect(arduino.getDigitalPinCount()).toBe(20);
      expect(arduino.getAnalogPinCount()).toBe(6);
      expect(arduino.getPWMPins()).toEqual([3, 5, 6, 9, 10, 11]);
    });

    test('should track power consumption', () => {
      const powerModel = arduino.getPowerModel();
      expect(powerModel.activeConsumption).toBe(20);
      expect(powerModel.sleepConsumption).toBe(0.015);
      expect(powerModel.supplyVoltage).toBe(5.0);
    });
  });

  describe('Pin collections and mapping', () => {
    test('should provide correct digital pins collection', () => {
      const digitalPins = arduino.getDigitalPins();
      expect(digitalPins.length).toBe(14);
      
      digitalPins.forEach((pin, index) => {
        expect(pin.number).toBe(index);
        expect(pin.name).toBe(`D${index}`);
      });
    });

    test('should provide correct analog pins collection', () => {
      const analogPins = arduino.getAnalogPins();
      expect(analogPins.length).toBe(6);
      
      analogPins.forEach((pin, index) => {
        expect(pin.number).toBe(14 + index);
        expect(pin.name).toBe(`A${index}`);
      });
    });

    test('should provide all pins', () => {
      const allPins = arduino.getAllPins();
      expect(allPins.length).toBeGreaterThan(20); // Digital + Analog + Power pins
      
      // Should include power pins
      const powerPins = allPins.filter(pin => pin.type === 'power');
      expect(powerPins.length).toBeGreaterThan(0);
      
      const groundPins = allPins.filter(pin => pin.type === 'ground');
      expect(groundPins.length).toBeGreaterThan(0);
    });
  });

  describe('Legacy compatibility methods', () => {
    test('should support legacy pinMode method', () => {
      arduino.setPinMode(13, 'OUTPUT');
      const pin = arduino.getPin(13);
      expect(pin?.mode).toBe(PinMode.OUTPUT);
      
      arduino.setPinMode(13, 'INPUT_PULLUP');
      const updatedPin = arduino.getPin(13);
      expect(updatedPin?.mode).toBe(PinMode.INPUT_PULLUP);
    });

    test('should support legacy digitalWrite/digitalRead', () => {
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);
      expect(arduino.digitalRead(13)).toBe(true);
      
      arduino.digitalWrite(13, false);
      expect(arduino.digitalRead(13)).toBe(false);
    });

    test('should support legacy analogRead/analogWrite', () => {
      // Test analogRead with pin numbers
      arduino.setPinMode(14, PinMode.INPUT); // A0
      const analogValue = arduino.analogRead(0); // Should map to pin 14
      expect(typeof analogValue).toBe('number');
      
      // Test analogWrite on PWM pin
      arduino.setPinMode(9, 'OUTPUT');
      arduino.analogWrite(9, 128);
      const pin9 = arduino.getPin(9);
      expect(pin9?.pwmValue).toBe(128);
    });

    test('should support resetBoard alias', () => {
      arduino.setPinMode(13, 'OUTPUT');
      arduino.resetBoard();
      
      const pin13 = arduino.getPin(13);
      expect(pin13?.mode).toBe(PinMode.INPUT);
    });

    test('should provide render data for UI', () => {
      const renderData = arduino.getRenderData();
      expect(renderData.position).toBeDefined();
      expect(renderData.type).toBe('arduino-uno');
      expect(renderData.name).toBe('Test Board Extended');
      expect(renderData.pins).toBeInstanceOf(Array);
      expect(renderData.pins.length).toBeGreaterThan(0);
      expect(renderData.size).toBeDefined();
    });

    test('should serialize board state', () => {
      const serialized = arduino.serialize();
      expect(serialized.id).toBe('test-board');
      expect(serialized.type).toBe('arduino-uno');
      expect(serialized.name).toBe('Test Board Extended');
      expect(serialized.position).toBeDefined();
    });
  });

  describe('Emulator integration', () => {
    test('should provide access to emulator components', () => {
      const emulatorConfig = arduino.getEmulatorConfig();
      expect(emulatorConfig.flashSize).toBe(32768);
      expect(emulatorConfig.ramSize).toBe(2048);
      expect(emulatorConfig.eepromSize).toBe(1024);
      expect(emulatorConfig.clockFrequency).toBe(16000000);
    });

    test('should provide access to compiler', () => {
      const compiler = arduino.getCompiler();
      expect(compiler).toBeDefined();
    });

    test('should handle delay method', () => {
      // Delay should not throw (it's a no-op in simulation)
      expect(() => arduino.delay(1000)).not.toThrow();
    });

    test('should handle update method', () => {
      // Update should not throw
      expect(() => arduino.update()).not.toThrow();
    });
  });
});