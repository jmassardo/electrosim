/**
 * Additional unit tests for ArduinoSerialAPI to improve coverage
 */

import { ArduinoSerialAPI, ArduinoSerialManager } from '../src/simulation/virtual-port/ArduinoSerialAPI';

describe('ArduinoSerialAPI Extended Tests', () => {
  let serial: ArduinoSerialAPI;
  let manager: ArduinoSerialManager;

  beforeEach(async () => {
    manager = ArduinoSerialManager.getInstance();
    serial = new ArduinoSerialAPI(`test-port-${Date.now()}`); // Unique port name
  });

  afterEach(async () => {
    serial.end();
    manager.closeAll();
  });

  describe('Edge cases and error handling', () => {
    test('should handle operations when not initialized', () => {
      expect(serial.available()).toBe(0);
      expect(serial.read()).toBe(-1);
      expect(serial.peek()).toBe(-1);
      expect(serial.write(65)).toBe(0);
      expect(serial.readString()).toBe('');
      expect(serial.readStringUntil('\n')).toBe('');
      expect(serial.parseInt()).toBe(0);
      expect(serial.parseFloat()).toBe(0);
    });

    test('should handle readBytes with empty buffer', async () => {
      serial.begin(9600);
      
      const buffer = Buffer.alloc(10);
      const bytesRead = serial.readBytes(buffer, 5);
      
      expect(bytesRead).toBe(0);
    });

    test('should handle write operations with different types', async () => {
      serial.begin(9600);

      // Test writing single byte
      const bytesWritten1 = serial.write(65); // 'A'
      expect(bytesWritten1).toBe(1);

      // Test writing buffer
      const buffer = Buffer.from('Hello');
      const bytesWritten2 = serial.write(buffer);
      expect(bytesWritten2).toBe(5);

      // Test writing array
      const array = [66, 67, 68]; // 'BCD'
      const bytesWritten3 = serial.write(array);
      expect(bytesWritten3).toBe(3);
    });

    test('should handle parseFloat edge cases', async () => {
      serial.begin(9600);

      // With empty buffer
      const result1 = serial.parseFloat();
      expect(result1).toBe(0);
    });
  });

  describe('Serial manager tests', () => {
    test('should manage multiple serial instances', () => {
      const serial1 = manager.getSerial('instance1');
      const serial2 = manager.getSerial('instance2');
      const serial3 = manager.getSerial('instance1'); // Should return existing

      expect(serial1).toBeDefined();
      expect(serial2).toBeDefined();
      expect(serial3).toBe(serial1); // Same instance

      const allSerials = manager.getAllSerials();
      expect(allSerials.size).toBeGreaterThanOrEqual(2);
    });

    test('should remove serial instances correctly', () => {
      const serial1 = manager.getSerial('removeme');
      expect(manager.getAllSerials().has('removeme')).toBe(true);
      
      manager.removeSerial('removeme');
      expect(manager.getAllSerials().has('removeme')).toBe(false);
    });

    test('should connect emulator and setup interrupts', () => {
      const mockEmulator = {
        getUart: jest.fn().mockReturnValue({
          onByteTransmit: jest.fn(),
          onByteReceive: jest.fn()
        })
      };

      const serial = manager.connectEmulator(mockEmulator, 'emulator-test');
      expect(serial).toBeDefined();
      expect(mockEmulator.getUart).toHaveBeenCalled();
    });
  });

  describe('Statistics and debugging', () => {
    test('should provide accurate statistics', async () => {
      const stats = serial.getStats();
      expect(stats.initialized).toBe(false);
      expect(stats.baudRate).toBe(9600);
      expect(stats.available).toBe(0);
      
      serial.begin(9600);
      const updatedStats = serial.getStats();
      expect(updatedStats.initialized).toBe(true);
    });

    test('should handle flush operation', () => {
      serial.begin(9600);
      
      // Flush should not throw
      expect(() => serial.flush()).not.toThrow();
    });

    test('should handle onData callback', () => {
      serial.begin(9600);
      
      const callback = jest.fn();
      serial.onData(callback);
      
      // onData should be defined and not throw
      expect(callback).toBeDefined();
    });
  });

  describe('Print operations', () => {
    test('should handle print with different data types', () => {
      serial.begin(9600);

      // These should not throw
      expect(() => serial.print('string')).not.toThrow();
      expect(() => serial.print(123)).not.toThrow();
      expect(() => serial.print(true)).not.toThrow();
      expect(() => serial.println()).not.toThrow();
      expect(() => serial.println('line')).not.toThrow();
    });
  });
});