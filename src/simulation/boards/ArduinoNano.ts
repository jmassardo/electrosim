/**
 * Arduino Nano board simulation
 * Same ATmega328P as Uno but different form factor
 */

import { ArduinoBoard, PinDefinition, PinMode, PinType, PowerModel } from './ArduinoBoard';
import { AVREmulatorConfig } from '../emulator/AVREmulator';

/**
 * Arduino Nano board simulation with ATmega328P microcontroller
 * Functionally identical to Arduino Uno but in a smaller form factor
 */
export class ArduinoNanoBoard extends ArduinoBoard {
  private static readonly DIGITAL_PINS = 20; // 0-13 digital, 14-19 analog as digital
  private static readonly ANALOG_PINS = 8;   // A0-A7 (A6, A7 are analog-only)
  private static readonly PWM_PINS = [3, 5, 6, 9, 10, 11];

  constructor(id: string, name: string = 'Arduino Nano') {
    super(id, name, 'arduino-nano');
  }

  getBoardName(): string {
    return 'Arduino Nano';
  }

  getDigitalPinCount(): number {
    return ArduinoNanoBoard.DIGITAL_PINS;
  }

  getAnalogPinCount(): number {
    return ArduinoNanoBoard.ANALOG_PINS;
  }

  getPWMPins(): number[] {
    return [...ArduinoNanoBoard.PWM_PINS];
  }

  getEmulatorConfig(): AVREmulatorConfig {
    return {
      flashSize: 32768,        // 32KB flash memory
      ramSize: 2048,           // 2KB SRAM  
      eepromSize: 1024,        // 1KB EEPROM
      clockFrequency: 16000000 // 16MHz
    };
  }

  getPowerModel(): PowerModel {
    return {
      activeConsumption: 19,    // ~19mA when active (slightly less than Uno)
      sleepConsumption: 0.007,  // ~7μA in deep sleep (better than Uno)
      supplyVoltage: 5.0        // 5V supply
    };
  }

  /**
   * Setup pin definitions for Arduino Nano
   */
  setupPinDefinitions(): void {
    // Digital pins 0-13 (same as Uno)
    for (let i = 0; i < 14; i++) {
      const pin: PinDefinition = {
        number: i,
        name: `D${i}`,
        type: PinType.DIGITAL,
        mode: PinMode.INPUT,
        digitalValue: false,
        analogValue: 0,
        voltage: 0,
        current: 0,
        isPWMCapable: ArduinoNanoBoard.PWM_PINS.includes(i),
        isInterruptCapable: i === 2 || i === 3
      };
      
      if (pin.isPWMCapable) {
        pin.pwmValue = 0;
      }
      
      this.state.pins.set(i, pin);
    }
    
    // Analog pins A0-A5 (also accessible as digital pins 14-19)
    for (let i = 0; i < 6; i++) {
      const digitalNumber = 14 + i;
      const pin: PinDefinition = {
        number: digitalNumber,
        name: `A${i}`,
        type: PinType.ANALOG,
        mode: PinMode.INPUT,
        digitalValue: false,
        analogValue: 0,
        voltage: 0,
        current: 0,
        isPWMCapable: false,
        isInterruptCapable: false
      };
      
      this.state.pins.set(digitalNumber, pin);
    }

    // Analog-only pins A6, A7 (Nano specific)
    for (let i = 6; i < 8; i++) {
      const pin: PinDefinition = {
        number: 20 + i - 6, // pins 20, 21
        name: `A${i}`,
        type: PinType.ANALOG,
        mode: PinMode.INPUT,
        digitalValue: false,
        analogValue: 0,
        voltage: 0,
        current: 0,
        isPWMCapable: false,
        isInterruptCapable: false
      };
      
      this.state.pins.set(20 + i - 6, pin);
    }
    
    // Power pins
    const powerPins = [
      { number: 100, name: '5V', type: PinType.POWER, voltage: 5.0 },
      { number: 101, name: '3.3V', type: PinType.POWER, voltage: 3.3 },
      { number: 102, name: 'GND1', type: PinType.GROUND, voltage: 0 },
      { number: 103, name: 'GND2', type: PinType.GROUND, voltage: 0 },
      { number: 104, name: 'VIN', type: PinType.POWER, voltage: 0 }
    ];
    
    powerPins.forEach(({ number, name, type, voltage }) => {
      const pin: PinDefinition = {
        number,
        name,
        type,
        mode: PinMode.OUTPUT,
        digitalValue: type === PinType.POWER,
        analogValue: 0,
        voltage,
        current: 0,
        isPWMCapable: false
      };
      this.state.pins.set(number, pin);
    });
  }

  /**
   * Get port mapping for Arduino Nano pins to ATmega328P ports
   * Same as Uno since they use the same microcontroller
   */
  protected getPortMapping(pinNumber: number): { port: number; bit: number } | null {
    // Arduino pin mapping for ATmega328P:
    // - Digital pins 0-7: PORTD bits 0-7
    // - Digital pins 8-13: PORTB bits 0-5
    // - Analog pins A0-A5 (14-19): PORTC bits 0-5
    // - Analog pins A6-A7 (20-21): ADC6, ADC7 (no digital I/O)

    if (pinNumber >= 0 && pinNumber <= 7) {
      // Digital pins 0-7 -> PORTD
      return { port: 3, bit: pinNumber };
    } else if (pinNumber >= 8 && pinNumber <= 13) {
      // Digital pins 8-13 -> PORTB
      return { port: 1, bit: pinNumber - 8 };
    } else if (pinNumber >= 14 && pinNumber <= 19) {
      // Analog pins A0-A5 -> PORTC
      return { port: 2, bit: pinNumber - 14 };
    } else if (pinNumber >= 20 && pinNumber <= 21) {
      // A6, A7 are analog-only pins, no digital I/O mapping
      return null;
    }
    
    return null; // Invalid pin or power/ground pins
  }

  /**
   * Get digital pins (0-13)
   */
  getDigitalPins(): PinDefinition[] {
    return Array.from({ length: 14 }, (_, i) => this.state.pins.get(i)!);
  }

  /**
   * Get analog pins (A0-A7)
   */
  getAnalogPins(): PinDefinition[] {
    const analogPins: PinDefinition[] = [];
    
    // A0-A5 (pins 14-19)
    for (let i = 0; i < 6; i++) {
      analogPins.push(this.state.pins.get(14 + i)!);
    }
    
    // A6-A7 (pins 20-21) - analog only
    for (let i = 0; i < 2; i++) {
      analogPins.push(this.state.pins.get(20 + i)!);
    }
    
    return analogPins;
  }

  /**
   * Override analogRead to handle A6, A7 analog-only pins
   */
  public readAnalogPin(analogPinNumber: number): number {
    let actualPinNumber: number;
    
    if (analogPinNumber >= 0 && analogPinNumber <= 5) {
      // A0-A5 -> pins 14-19
      actualPinNumber = 14 + analogPinNumber;
    } else if (analogPinNumber === 6) {
      // A6 -> pin 20
      actualPinNumber = 20;
    } else if (analogPinNumber === 7) {
      // A7 -> pin 21
      actualPinNumber = 21;
    } else if (analogPinNumber >= 14 && analogPinNumber <= 21) {
      // Direct pin number access
      actualPinNumber = analogPinNumber;
    } else {
      throw new Error(`Invalid analog pin number: ${analogPinNumber}`);
    }

    const pin = this.state.pins.get(actualPinNumber);
    if (!pin || pin.type !== PinType.ANALOG) {
      throw new Error(`Pin ${actualPinNumber} is not an analog pin`);
    }

    // Convert voltage to 10-bit ADC value (0-1023)
    return Math.round((pin.voltage / this.state.powerModel.supplyVoltage) * 1023);
  }

  /**
   * Legacy compatibility methods
   */
  analogRead(analogPinNumber: number): number {
    return this.readAnalogPin(analogPinNumber);
  }

  /**
   * Get render data for visual representation
   */
  getRenderData() {
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
      size: { width: 80, height: 40 } // Smaller than Uno
    };
  }
}