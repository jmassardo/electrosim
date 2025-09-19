# Virtual Serial Port Specification

## Overview

The Virtual Serial Port feature enables Simudino to expose simulated Arduino UART interfaces as real system COM ports that external applications can access. This allows developers to test Arduino-interfacing applications without requiring physical hardware.

## Use Cases

### Primary Use Case
- **Application Testing**: Test software that communicates with Arduino over serial without physical hardware
- **Development Workflow**: Develop Arduino-interfacing applications while traveling or in environments where carrying hardware is impractical
- **CI/CD Integration**: Automated testing of applications that depend on Arduino communication
- **Educational Scenarios**: Demonstrate Arduino communication protocols in classroom environments

### Example Scenarios
1. **Python Application Testing**: Test a Python script that reads sensor data from Arduino
2. **Desktop Application Development**: Debug a C# application that controls Arduino-based devices
3. **Web Application Testing**: Test a Node.js web app that interfaces with Arduino via serial
4. **Protocol Development**: Test custom communication protocols between PC and Arduino

## Technical Architecture

### High-Level Design

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   External App  │───▶│  Virtual COM Port │───▶│  Arduino Simulator  │
│  (Python, C#,  │    │   (COM3, ttyUSB0) │    │     (AVR UART)      │
│   Node.js...)   │◄───│                  │◄───│                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

### Component Architecture

```
VirtualSerialPort (Abstract)
├── WindowsComPort (Windows Implementation)
├── MacOSPtyPort (macOS Implementation)
├── LinuxPtyPort (Linux Implementation)
└── SerialBridge (Arduino UART Bridge)
```

## Platform-Specific Implementation

### Windows Implementation

#### Approach 1: Named Pipes (Recommended)
```typescript
class WindowsComPort implements VirtualSerialPort {
  private pipeName: string;
  private pipeHandle: Buffer;
  
  async create(config: SerialConfig): Promise<string> {
    // Create named pipe: \\.\pipe\arduino_sim_COM3
    this.pipeName = `\\\\.\\pipe\\arduino_sim_COM${this.portNumber}`;
    this.pipeHandle = await this.createNamedPipe(this.pipeName, config);
    
    // Register virtual COM port in registry
    await this.registerVirtualComPort();
    
    return `COM${this.portNumber}`;
  }
  
  private async createNamedPipe(name: string, config: SerialConfig): Promise<Buffer> {
    // Use CreateNamedPipe Win32 API through node-ffi
    return ffi.createNamedPipe(name, {
      mode: 'PIPE_TYPE_BYTE | PIPE_READMODE_BYTE',
      maxInstances: 1,
      bufferSize: 4096
    });
  }
  
  private async registerVirtualComPort(): Promise<void> {
    // Add registry entry to make port visible in Device Manager
    // HKEY_LOCAL_MACHINE\HARDWARE\DEVICEMAP\SERIALCOMM
  }
}
```

#### Approach 2: Virtual COM Driver (Advanced)
- Use com0com or similar virtual serial port driver
- Requires driver installation and admin privileges
- More compatible but complex deployment

### macOS Implementation

```typescript
class MacOSPtyPort implements VirtualSerialPort {
  private ptyPath: string;
  private symlinkPath: string;
  
  async create(config: SerialConfig): Promise<string> {
    // Create pseudo-terminal pair
    const { master, slave } = await this.createPtyPair();
    this.ptyPath = slave;
    
    // Create symlink to look like USB serial device
    this.symlinkPath = `/dev/cu.usbserial-simudino${this.portNumber}`;
    await fs.symlink(this.ptyPath, this.symlinkPath);
    
    // Configure terminal settings
    await this.configurePty(master, config);
    
    return this.symlinkPath;
  }
  
  private async createPtyPair(): Promise<{master: string, slave: string}> {
    // Use node-pty to create pseudo-terminal
    const pty = require('node-pty');
    const term = pty.spawn('cat', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24
    });
    
    return {
      master: term.pty,
      slave: `/dev/ttys${term.pty.slice(-3)}`
    };
  }
}
```

### Linux Implementation

```typescript
class LinuxPtyPort implements VirtualSerialPort {
  private ptyPath: string;
  private symlinkPath: string;
  
  async create(config: SerialConfig): Promise<string> {
    // Create pseudo-terminal
    const pty = await this.createPseudoTerminal();
    this.ptyPath = pty.slave;
    
    // Create symlink in /dev/
    this.symlinkPath = `/dev/ttyUSB${this.getNextPortNumber()}`;
    await fs.symlink(this.ptyPath, this.symlinkPath);
    
    // Set permissions
    await fs.chmod(this.symlinkPath, 0o666);
    
    return this.symlinkPath;
  }
  
  private async createPseudoTerminal(): Promise<{master: number, slave: string}> {
    // Use posix_openpt, grantpt, unlockpt
    const master = await this.openPty();
    const slaveName = await this.ptsname(master);
    
    return { master, slave: slaveName };
  }
}
```

## Serial Bridge Implementation

### Arduino UART to System Port Bridge

```typescript
class SerialBridge {
  private virtualPort: VirtualSerialPort;
  private arduinoUART: UARTInterface;
  private rxBuffer: Buffer;
  private txBuffer: Buffer;
  
  constructor(virtualPort: VirtualSerialPort, arduinoUART: UARTInterface) {
    this.virtualPort = virtualPort;
    this.arduinoUART = arduinoUART;
    this.rxBuffer = Buffer.alloc(1024);
    this.txBuffer = Buffer.alloc(1024);
  }
  
  start(): void {
    // Bridge data from virtual port to Arduino UART
    this.virtualPort.on('data', (data: Buffer) => {
      this.arduinoUART.write(data);
    });
    
    // Bridge data from Arduino UART to virtual port
    this.arduinoUART.on('data', (data: Buffer) => {
      this.virtualPort.write(data);
    });
    
    // Handle flow control and configuration changes
    this.virtualPort.on('configChange', (config: SerialConfig) => {
      this.arduinoUART.configure({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity
      });
    });
  }
  
  stop(): void {
    this.virtualPort.removeAllListeners();
    this.arduinoUART.removeAllListeners();
  }
}
```

## Configuration and Management

### Virtual Port Manager

```typescript
class VirtualPortManager {
  private activePorts: Map<string, VirtualSerialPort>;
  private portCounter: number;
  
  constructor() {
    this.activePorts = new Map();
    this.portCounter = 0;
  }
  
  async createVirtualPort(arduinoUART: UARTInterface, config: SerialConfig): Promise<string> {
    const portFactory = this.getPortFactory();
    const virtualPort = portFactory.create(config);
    
    const portName = await virtualPort.create(config);
    const bridge = new SerialBridge(virtualPort, arduinoUART);
    
    bridge.start();
    this.activePorts.set(portName, virtualPort);
    
    return portName;
  }
  
  async destroyVirtualPort(portName: string): Promise<void> {
    const virtualPort = this.activePorts.get(portName);
    if (virtualPort) {
      await virtualPort.destroy();
      this.activePorts.delete(portName);
    }
  }
  
  listActivePorts(): string[] {
    return Array.from(this.activePorts.keys());
  }
  
  private getPortFactory(): VirtualPortFactory {
    switch (process.platform) {
      case 'win32': return new WindowsPortFactory();
      case 'darwin': return new MacOSPortFactory();
      case 'linux': return new LinuxPortFactory();
      default: throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }
}
```

### User Interface Integration

```typescript
// React component for virtual port management
const VirtualPortPanel: React.FC = () => {
  const [activePorts, setActivePorts] = useState<string[]>([]);
  const [isPortEnabled, setIsPortEnabled] = useState(false);
  
  const handleCreatePort = async () => {
    try {
      const portName = await ipcRenderer.invoke('create-virtual-port', {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });
      
      setActivePorts([...activePorts, portName]);
      setIsPortEnabled(true);
      
      // Show success notification
      showNotification(`Virtual port created: ${portName}`);
    } catch (error) {
      showError(`Failed to create virtual port: ${error.message}`);
    }
  };
  
  const handleDestroyPort = async (portName: string) => {
    try {
      await ipcRenderer.invoke('destroy-virtual-port', portName);
      setActivePorts(activePorts.filter(p => p !== portName));
      
      if (activePorts.length === 1) {
        setIsPortEnabled(false);
      }
    } catch (error) {
      showError(`Failed to destroy virtual port: ${error.message}`);
    }
  };
  
  return (
    <div className="virtual-port-panel">
      <h3>Virtual Serial Ports</h3>
      
      <button onClick={handleCreatePort} disabled={isPortEnabled}>
        Create Virtual Port
      </button>
      
      {activePorts.map(port => (
        <div key={port} className="port-item">
          <span>{port}</span>
          <span className="port-status">Active</span>
          <button onClick={() => handleDestroyPort(port)}>
            Disconnect
          </button>
        </div>
      ))}
      
      {isPortEnabled && (
        <div className="port-instructions">
          <p>Your simulated Arduino is now available at:</p>
          <code>{activePorts[0]}</code>
          <p>External applications can connect using standard serial libraries.</p>
        </div>
      )}
    </div>
  );
};
```

## Security Considerations

### Permission Requirements

#### Windows
- **Named Pipes**: No special permissions required
- **Registry Access**: May require elevated privileges for COM port registration
- **Firewall**: Virtual ports are local-only, no network access

#### macOS
- **Pseudo-terminals**: Standard user permissions sufficient
- **Symlink Creation**: May require `/dev` write permissions
- **Security Framework**: Comply with macOS app sandboxing if distributed via App Store

#### Linux
- **Pseudo-terminals**: Standard user permissions sufficient
- **Device Nodes**: May require udev rules for `/dev` symlinks
- **SELinux/AppArmor**: Configure security policies for pseudo-terminal access

### Data Safety
- **Input Validation**: Validate all serial data before passing to Arduino simulation
- **Buffer Overflow Protection**: Implement bounds checking on serial buffers
- **Resource Limits**: Limit number of simultaneous virtual ports
- **Cleanup**: Ensure virtual ports are properly cleaned up on application exit

## Testing Strategy

### Unit Tests
```typescript
describe('VirtualSerialPort', () => {
  it('should create virtual port on each platform', async () => {
    const config: SerialConfig = {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: false
    };
    
    const virtualPort = createVirtualPort();
    const portName = await virtualPort.create(config);
    
    expect(portName).toMatch(/^(COM\d+|\/dev\/tty\w+)$/);
  });
  
  it('should bridge data between external app and Arduino UART', async () => {
    const mockUART = new MockArduinoUART();
    const virtualPort = createVirtualPort();
    const bridge = new SerialBridge(virtualPort, mockUART);
    
    bridge.start();
    
    // Simulate external app writing to virtual port
    virtualPort.write(Buffer.from('Hello Arduino'));
    
    // Verify Arduino UART received the data
    expect(mockUART.receivedData).toBe('Hello Arduino');
  });
});
```

### Integration Tests
```typescript
describe('Virtual Port Integration', () => {
  it('should be accessible by external Python script', async () => {
    const portName = await createTestVirtualPort();
    
    // Run external Python script that connects to virtual port
    const pythonScript = `
import serial
ser = serial.Serial('${portName}', 9600)
ser.write(b'test message')
response = ser.readline()
print(response.decode())
ser.close()
    `;
    
    const result = await exec(`python -c "${pythonScript}"`);
    expect(result.stdout).toContain('test message');
  });
  
  it('should handle multiple simultaneous connections', async () => {
    const port1 = await createTestVirtualPort();
    const port2 = await createTestVirtualPort();
    
    // Test concurrent access
    const connection1 = new SerialConnection(port1);
    const connection2 = new SerialConnection(port2);
    
    await Promise.all([
      connection1.sendMessage('test1'),
      connection2.sendMessage('test2')
    ]);
    
    expect(connection1.receivedMessage).toBe('test1');
    expect(connection2.receivedMessage).toBe('test2');
  });
});
```

### Platform-Specific Tests
- **Windows**: Test with PuTTY, Arduino IDE Serial Monitor, Python pyserial
- **macOS**: Test with screen, minicom, Python pyserial, Arduino IDE
- **Linux**: Test with screen, minicom, cutecom, Python pyserial

## Performance Considerations

### Latency Requirements
- **Target Latency**: < 1ms for data transmission between virtual port and Arduino UART
- **Buffer Size**: Configurable buffer sizes (default 1KB, max 64KB)
- **Flow Control**: Implement XON/XOFF and RTS/CTS flow control

### Resource Usage
- **Memory**: Each virtual port should use < 1MB RAM
- **CPU**: Virtual port overhead should be < 1% CPU usage during active communication
- **File Descriptors**: Properly manage file descriptor usage on Unix systems

### Optimization Strategies
- **Buffer Pooling**: Reuse buffer objects to reduce garbage collection
- **Batched I/O**: Batch small writes to improve throughput
- **Asynchronous Processing**: Use non-blocking I/O for all platform operations

## Future Enhancements

### Advanced Features
1. **Multiple UART Support**: Support Arduino Mega's 4 serial ports simultaneously
2. **Hardware Flow Control**: Full RTS/CTS and DTR/DSR signal emulation
3. **Break Signal**: Support serial break signal generation and detection
4. **Modem Control**: Emulate modem control signals for compatibility

### Integration Improvements
1. **Auto-Discovery**: External applications can auto-discover simulated Arduino ports
2. **Configuration Sync**: Automatically sync baud rate changes between app and simulation
3. **Port Naming**: Configurable port names and descriptions
4. **Hot-Plugging**: Simulate USB device connect/disconnect events

### Development Tools
1. **Serial Monitor**: Enhanced built-in serial monitor with protocol analysis
2. **Traffic Logging**: Log all serial communication for debugging
3. **Protocol Analyzer**: Built-in protocol decoder for common Arduino protocols
4. **Load Testing**: Tools to test high-throughput serial communication

This specification provides a comprehensive foundation for implementing the virtual serial port feature that will make Simudino an invaluable tool for Arduino application development and testing.