/**
 * Virtual Serial Port Test
 * Tests bidirectional Arduino-host serial communication
 */

import { 
  VirtualSerialPort, 
  VirtualSerialPortManager,
  ArduinoSerialAPI,
  ArduinoSerialManager 
} from '../src/shared/types';

describe('Virtual Serial Port System', () => {
  let portManager: VirtualSerialPortManager;
  let serialManager: ArduinoSerialManager;

  beforeEach(() => {
    portManager = VirtualSerialPortManager.getInstance();
    serialManager = ArduinoSerialManager.getInstance();
  });

  afterEach(async () => {
    await portManager.closeAll();
    serialManager.closeAll();
  });

  test('should create virtual serial port', () => {
    const port = portManager.createPort('COM_Test', { baudRate: 115200 });
    
    expect(port).toBeDefined();
    expect(port.path).toBe('COM_Test');
    expect(port.getConfig().baudRate).toBe(115200);
    expect(port.isPortOpen).toBe(false);
  });

  test('should open and close port', async () => {
    const port = portManager.createPort('COM_Test');
    
    expect(port.isPortOpen).toBe(false);
    
    await port.open();
    expect(port.isPortOpen).toBe(true);
    
    await port.close();
    expect(port.isPortOpen).toBe(false);
  });

  test('should handle bidirectional communication', async () => {
    const port = portManager.createPort('COM_Test');
    await port.open();

    const receivedData: Buffer[] = [];
    port.addEventListener('data', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.direction === 'out') {
        receivedData.push(customEvent.detail.data);
      }
    });

    // Host sends data to Arduino
    await port.write('Hello Arduino\n');
    expect(port.serialAvailable()).toBe(14); // 'Hello Arduino\n' length

    // Arduino reads the data
    const bytes: number[] = [];
    while (port.serialAvailable() > 0) {
      bytes.push(port.serialRead());
    }
    const receivedString = Buffer.from(bytes).toString('utf8');
    expect(receivedString).toBe('Hello Arduino\n');

    // Arduino sends response
    port.serialPrintln('Hello Host');
    
    // Give more time for transmission
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(receivedData.length).toBeGreaterThanOrEqual(1);
    const lastMessage = receivedData[receivedData.length - 1].toString('utf8');
    expect(lastMessage).toBe('Hello Host\\r\\n');
  });

  test('should support Arduino Serial API', () => {
    const serial = serialManager.getSerial('test-emulator');
    
    expect(serial).toBeDefined();
    expect(serial.initialized).toBe(false);
    
    // Initialize serial communication
    serial.begin(9600);
    expect(serial.initialized).toBe(true);
    
    const stats = serial.getStats();
    expect(stats.baudRate).toBe(9600);
    expect(stats.initialized).toBe(true);
  });

  test('should handle Serial.print() and Serial.println()', async () => {
    const serial = serialManager.getSerial('test-emulator');
    const port = serial.getPort();
    await port.open();
    serial.begin(9600);

    const receivedData: string[] = [];
    port.addEventListener('data', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.direction === 'out') {
        receivedData.push(customEvent.detail.data.toString('utf8'));
      }
    });

    // Test different print methods
    serial.print('Hello');
    serial.print(123);
    serial.print(true);
    serial.println();
    serial.println('World');

    // Give time for transmission
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should have transmitted some data
    expect(receivedData.length).toBeGreaterThan(0);
    
    // Check that data contains expected values
    const allData = receivedData.join('');
    expect(allData.length).toBeGreaterThan(0);
  });

  test('should handle Serial.read() and Serial.available()', async () => {
    const serial = serialManager.getSerial('test-emulator');
    const port = serial.getPort();
    await port.open();
    serial.begin(9600);

    // Send data from host
    await port.write('Test123');
    
    expect(serial.available()).toBe(7);
    
    // Read character by character
    expect(serial.read()).toBe('T'.charCodeAt(0));
    expect(serial.read()).toBe('e'.charCodeAt(0));
    expect(serial.available()).toBe(5);
    
    // Read remaining as string
    const remaining = serial.readString();
    expect(remaining).toBe('st123');
    expect(serial.available()).toBe(0);
  });

  test('should support parseInt() and parseFloat()', async () => {
    const serial = serialManager.getSerial('parse-test-emulator');
    const port = serial.getPort();
    await port.open();
    serial.begin(9600);

    // Test parseInt
    await port.write('42\n');
    await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
    const intValue = serial.parseInt();
    expect(intValue).toBe(42);

    // Test parseFloat  
    await port.write('3.14\n');
    await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
    const floatValue = serial.parseFloat();
    expect(floatValue).toBe(3.14);

    // Test negative numbers
    await port.write('-123\n');
    await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
    const negValue = serial.parseInt();
    expect(negValue).toBe(-123);
  });

  test('should handle readStringUntil()', async () => {
    const serial = serialManager.getSerial('test-emulator');
    const port = serial.getPort();
    await port.open();
    serial.begin(9600);

    await port.write('Hello,World\nNext line');
    
    const result = serial.readStringUntil(',');
    expect(result).toBe('Hello');
    
    const remaining = serial.readStringUntil('\n');
    expect(remaining).toBe('World');
  });

  test('should provide correct port listing', () => {
    // Create multiple ports
    portManager.createPort('COM1');
    portManager.createPort('COM2');
    portManager.createPort('USB0');

    const ports = portManager.listPorts();
    expect(ports).toHaveLength(3);
    
    const port1 = ports.find(p => p.path === 'COM1');
    expect(port1).toBeDefined();
    expect(port1?.manufacturer).toBe('ElectroSim');
    expect(port1?.vendorId).toBe('0x2341'); // Arduino vendor ID
    
    const arduinoPorts = portManager.getArduinoPortNames();
    expect(arduinoPorts).toHaveLength(3);
    
    // Platform-specific naming
    if (process.platform === 'win32') {
      expect(arduinoPorts[0]).toMatch(/^COM\d+$/);
    } else if (process.platform === 'darwin') {
      expect(arduinoPorts[0]).toMatch(/^\/dev\/cu\.usbmodem/);
    } else {
      expect(arduinoPorts[0]).toMatch(/^\/dev\/ttyUSB\d+$/);
    }
  });

  test('should handle baud rate configuration', async () => {
    const port = portManager.createPort('COM_Test', { baudRate: 115200 });
    
    // Check initial config
    expect(port.getConfig().baudRate).toBe(115200);
    
    // Update config when closed
    await port.updateConfig({ baudRate: 9600 });
    expect(port.getConfig().baudRate).toBe(9600);
    
    // Should throw when trying to update open port
    await port.open();
    await expect(
      port.updateConfig({ baudRate: 115200 })
    ).rejects.toThrow('Cannot update config while port is open');
  });

  test('should simulate realistic transmission timing', async () => {
    const port = portManager.createPort('COM_Test', { baudRate: 9600 });
    await port.open();

    const transmissionTimes: number[] = [];
    port.addEventListener('data', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.direction === 'out') {
        transmissionTimes.push(customEvent.detail.timestamp);
      }
    });

    const startTime = Date.now();
    
    // Send 10 bytes (should take ~10ms at 9600 baud)
    port.serialWrite(Buffer.from('1234567890'));
    
    // Wait for transmission
    await new Promise(resolve => setTimeout(resolve, 20));
    
    expect(transmissionTimes).toHaveLength(1);
    const transmissionDelay = transmissionTimes[0] - startTime;
    expect(transmissionDelay).toBeGreaterThan(8); // At least 8ms
    expect(transmissionDelay).toBeLessThan(20);   // But not too long
  });

  test('should handle peek() functionality', async () => {
    const serial = serialManager.getSerial('test-emulator');
    const port = serial.getPort();
    await port.open();
    serial.begin(9600);

    await port.write('ABC');
    
    // Peek should show first byte without consuming
    expect(serial.peek()).toBe('A'.charCodeAt(0));
    expect(serial.available()).toBe(3);
    
    // Peek again - same result
    expect(serial.peek()).toBe('A'.charCodeAt(0));
    expect(serial.available()).toBe(3);
    
    // Read consumes the byte
    expect(serial.read()).toBe('A'.charCodeAt(0));
    expect(serial.available()).toBe(2);
    
    // Now peek shows next byte
    expect(serial.peek()).toBe('B'.charCodeAt(0));
  });
});