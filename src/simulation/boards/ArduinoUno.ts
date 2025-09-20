/**
 * Arduino Uno R3 board simulation
 */

export interface ArduinoPin {
  number: number;
  name: string;
  type: 'digital' | 'analog' | 'power' | 'ground';
  mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
  digitalValue: boolean; // HIGH/LOW
  analogValue: number;   // 0-1023 for analog pins
  pwmValue?: number;     // 0-255 for PWM capable pins
  voltage: number;       // actual voltage level
  current: number;       // current flow in amperes
}

export interface ArduinoUnoState {
  isRunning: boolean;
  pins: Map<number, ArduinoPin>;
  serialOutput: string[];
  programCounter: number;
  memoryUsage: {
    flash: number;
    sram: number;
    eeprom: number;
  };
}

/**
 * Arduino Uno R3 board simulation with ATmega328P microcontroller
 */
export class ArduinoUnoBoard {
  public readonly id: string;
  public readonly type: string = 'arduino-uno';
  public name: string;
  public position: { x: number; y: number; rotation: number };
  
  private state: ArduinoUnoState;
  private readonly supplyVoltage: number = 5.0; // 5V supply
  private readonly digitalPinCount: number = 14;
  private readonly analogPinCount: number = 6;
  
  // PWM capable pins on Arduino Uno
  private readonly pwmPins: number[] = [3, 5, 6, 9, 10, 11];

  constructor(id: string, name: string = 'Arduino Uno') {
    this.id = id;
    this.name = name;
    this.position = { x: 0, y: 0, rotation: 0 };
    
    this.state = {
      isRunning: false,
      pins: new Map(),
      serialOutput: [],
      programCounter: 0,
      memoryUsage: {
        flash: 0,
        sram: 0,
        eeprom: 0
      }
    };
    
    this.initializePins();
  }

  /**
   * Initialize all Arduino Uno pins
   */
  private initializePins(): void {
    // Digital pins 0-13
    for (let i = 0; i < this.digitalPinCount; i++) {
      const pin: ArduinoPin = {
        number: i,
        name: `D${i}`,
        type: 'digital',
        mode: 'INPUT',
        digitalValue: false,
        analogValue: 0,
        voltage: 0,
        current: 0
      };
      
      // Add PWM capability to specific pins
      if (this.pwmPins.includes(i)) {
        pin.pwmValue = 0;
      }
      
      this.state.pins.set(i, pin);
    }
    
    // Analog pins A0-A5 (also accessible as digital pins 14-19)
    for (let i = 0; i < this.analogPinCount; i++) {
      const digitalNumber = 14 + i;
      const pin: ArduinoPin = {
        number: digitalNumber,
        name: `A${i}`,
        type: 'analog',
        mode: 'INPUT',
        digitalValue: false,
        analogValue: 0,
        voltage: 0,
        current: 0
      };
      
      this.state.pins.set(digitalNumber, pin);
    }
    
    // Power pins
    const powerPins = [
      { number: 100, name: '5V', type: 'power' as const, voltage: 5.0 },
      { number: 101, name: '3.3V', type: 'power' as const, voltage: 3.3 },
      { number: 102, name: 'GND', type: 'ground' as const, voltage: 0 },
      { number: 103, name: 'VIN', type: 'power' as const, voltage: 0 }
    ];
    
    powerPins.forEach(({ number, name, type, voltage }) => {
      const pin: ArduinoPin = {
        number,
        name,
        type,
        mode: 'OUTPUT',
        digitalValue: type === 'power',
        analogValue: 0,
        voltage,
        current: 0
      };
      this.state.pins.set(number, pin);
    });
  }

  /**
   * Set pin mode (pinMode equivalent)
   */
  setPinMode(pinNumber: number, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'): void {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      console.warn(`Invalid pin number: ${pinNumber}`);
      return;
    }
    
    pin.mode = mode;
    
    // Set pull-up voltage for INPUT_PULLUP
    if (mode === 'INPUT_PULLUP') {
      pin.voltage = this.supplyVoltage;
      pin.digitalValue = true;
    } else if (mode === 'INPUT') {
      pin.voltage = 0;
      pin.digitalValue = false;
    }
  }

  /**
   * Write digital value to pin (digitalWrite equivalent)
   */
  digitalWrite(pinNumber: number, value: boolean): void {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      console.warn(`Invalid pin number: ${pinNumber}`);
      return;
    }
    
    if (pin.mode !== 'OUTPUT') {
      console.warn(`Pin ${pinNumber} is not set to OUTPUT mode`);
      return;
    }
    
    pin.digitalValue = value;
    pin.voltage = value ? this.supplyVoltage : 0;
  }

  /**
   * Read digital value from pin (digitalRead equivalent)
   */
  digitalRead(pinNumber: number): boolean {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      console.warn(`Invalid pin number: ${pinNumber}`);
      return false;
    }
    
    return pin.digitalValue;
  }

  /**
   * Read analog value from pin (analogRead equivalent)
   */
  analogRead(analogPinNumber: number): number {
    // Convert analog pin number (0-5) to actual pin number (14-19)
    const actualPinNumber = analogPinNumber < 6 ? 14 + analogPinNumber : analogPinNumber;
    const pin = this.state.pins.get(actualPinNumber);
    
    if (!pin) {
      console.warn(`Invalid analog pin number: ${analogPinNumber}`);
      return 0;
    }
    
    // Convert voltage to 10-bit ADC value (0-1023)
    return Math.round((pin.voltage / this.supplyVoltage) * 1023);
  }

  /**
   * Write PWM value to pin (analogWrite equivalent)
   */
  analogWrite(pinNumber: number, value: number): void {
    const pin = this.state.pins.get(pinNumber);
    if (!pin) {
      console.warn(`Invalid pin number: ${pinNumber}`);
      return;
    }
    
    if (!this.pwmPins.includes(pinNumber)) {
      console.warn(`Pin ${pinNumber} does not support PWM`);
      return;
    }
    
    if (pin.mode !== 'OUTPUT') {
      console.warn(`Pin ${pinNumber} is not set to OUTPUT mode`);
      return;
    }
    
    // Clamp PWM value to 0-255 range
    const pwmValue = Math.max(0, Math.min(255, value));
    pin.pwmValue = pwmValue;
    
    // Convert PWM to average voltage (simplified)
    pin.voltage = (pwmValue / 255) * this.supplyVoltage;
  }

  /**
   * Get pin state
   */
  getPin(pinNumber: number): ArduinoPin | undefined {
    return this.state.pins.get(pinNumber);
  }

  /**
   * Get all pins
   */
  getAllPins(): ArduinoPin[] {
    return Array.from(this.state.pins.values());
  }

  /**
   * Get digital pins (0-13)
   */
  getDigitalPins(): ArduinoPin[] {
    return Array.from({ length: this.digitalPinCount }, (_, i) => this.state.pins.get(i)!);
  }

  /**
   * Get analog pins (A0-A5)
   */
  getAnalogPins(): ArduinoPin[] {
    return Array.from({ length: this.analogPinCount }, (_, i) => this.state.pins.get(14 + i)!);
  }

  /**
   * Update board state - called each simulation frame
   */
  update(): void {
    // Update pin voltages based on external connections
    this.state.pins.forEach(pin => {
      // Update digital value based on voltage threshold
      if (pin.type === 'digital' || pin.type === 'analog') {
        pin.digitalValue = pin.voltage >= 2.5; // 2.5V threshold for HIGH
        
        // Update analog value for analog pins
        if (pin.type === 'analog') {
          pin.analogValue = Math.round((pin.voltage / this.supplyVoltage) * 1023);
        }
      }
    });
  }

  /**
   * Reset board to initial state
   */
  reset(): void {
    this.state.isRunning = false;
    this.state.serialOutput = [];
    this.state.programCounter = 0;
    this.state.memoryUsage = { flash: 0, sram: 0, eeprom: 0 };
    
    // Reset all pins
    this.state.pins.forEach(pin => {
      if (pin.type === 'power') {
        // Power pins maintain their voltage
        return;
      } else if (pin.type === 'ground') {
        pin.voltage = 0;
        pin.digitalValue = false;
      } else {
        pin.mode = 'INPUT';
        pin.voltage = 0;
        pin.digitalValue = false;
        pin.analogValue = 0;
        pin.current = 0;
        if (pin.pwmValue !== undefined) {
          pin.pwmValue = 0;
        }
      }
    });
  }

  /**
   * Get board state
   */
  getState(): ArduinoUnoState {
    return {
      ...this.state,
      pins: new Map(this.state.pins) // Create a copy
    };
  }

  /**
   * Get render data for visual representation
   */
  getRenderData() {
    // Only include digital and analog pins in render data (for UI display)
    const ioPins = [...this.getDigitalPins(), ...this.getAnalogPins()];
    
    return {
      position: this.position,
      type: this.type,
      name: this.name,
      isRunning: this.state.isRunning,
      pins: ioPins.map(pin => ({
        number: pin.number,
        name: pin.name,
        type: pin.type,
        mode: pin.mode,
        voltage: pin.voltage,
        digitalValue: pin.digitalValue,
        analogValue: pin.analogValue,
        pwmValue: pin.pwmValue
      })),
      size: { width: 100, height: 60 } // Size in pixels
    };
  }

  /**
   * Serialize board state
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      position: { ...this.position }
    };
  }
}