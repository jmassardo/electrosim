/**
 * Arduino Mega 2560 board simulation
 * ATmega2560 microcontroller with extended pins and capabilities
 */

import { ArduinoBoard, PinDefinition, PinMode, PinType, PowerModel, Timer, TimerMode } from './ArduinoBoard';
import { AVREmulatorConfig } from '../emulator/AVREmulator';

/**
 * Arduino Mega 2560 board simulation with ATmega2560 microcontroller
 * 54 digital pins, 16 analog pins, multiple serial ports
 */
export class ArduinoMegaBoard extends ArduinoBoard {
  private static readonly DIGITAL_PINS = 54;
  private static readonly ANALOG_PINS = 16;   // A0-A15
  private static readonly PWM_PINS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46];
  private static readonly SERIAL_PORTS = 4;  // Serial, Serial1, Serial2, Serial3

  constructor(id: string, name: string = 'Arduino Mega') {
    super(id, name, 'arduino-mega');
  }

  getBoardName(): string {
    return 'Arduino Mega 2560';
  }

  getDigitalPinCount(): number {
    return ArduinoMegaBoard.DIGITAL_PINS;
  }

  getAnalogPinCount(): number {
    return ArduinoMegaBoard.ANALOG_PINS;
  }

  getPWMPins(): number[] {
    return [...ArduinoMegaBoard.PWM_PINS];
  }

  getEmulatorConfig(): AVREmulatorConfig {
    return {
      flashSize: 262144,       // 256KB flash memory
      ramSize: 8192,           // 8KB SRAM
      eepromSize: 4096,        // 4KB EEPROM
      clockFrequency: 16000000 // 16MHz
    };
  }

  getPowerModel(): PowerModel {
    return {
      activeConsumption: 50,    // ~50mA when active (more than Uno due to size)
      sleepConsumption: 0.025,  // ~25μA in deep sleep
      supplyVoltage: 5.0        // 5V supply
    };
  }

  /**
   * Setup pin definitions for Arduino Mega
   */
  setupPinDefinitions(): void {
    // Digital pins 0-53
    for (let i = 0; i < ArduinoMegaBoard.DIGITAL_PINS; i++) {
      const pin: PinDefinition = {
        number: i,
        name: `D${i}`,
        type: PinType.DIGITAL,
        mode: PinMode.INPUT,
        digitalValue: false,
        analogValue: 0,
        voltage: 0,
        current: 0,
        isPWMCapable: ArduinoMegaBoard.PWM_PINS.includes(i),
        isInterruptCapable: this.isInterruptPin(i)
      };
      
      if (pin.isPWMCapable) {
        pin.pwmValue = 0;
      }
      
      this.state.pins.set(i, pin);
    }
    
    // Analog pins A0-A15 (also accessible as digital pins 54-69)
    for (let i = 0; i < ArduinoMegaBoard.ANALOG_PINS; i++) {
      const digitalNumber = 54 + i;
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
    
    // Power pins
    const powerPins = [
      { number: 100, name: '5V', type: PinType.POWER, voltage: 5.0 },
      { number: 101, name: '3.3V', type: PinType.POWER, voltage: 3.3 },
      { number: 102, name: 'GND1', type: PinType.GROUND, voltage: 0 },
      { number: 103, name: 'GND2', type: PinType.GROUND, voltage: 0 },
      { number: 104, name: 'GND3', type: PinType.GROUND, voltage: 0 },
      { number: 105, name: 'GND4', type: PinType.GROUND, voltage: 0 },
      { number: 106, name: 'VIN', type: PinType.POWER, voltage: 0 }
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
   * Check if pin supports external interrupts
   */
  private isInterruptPin(pinNumber: number): boolean {
    // ATmega2560 interrupt pins: 2, 3, 18, 19, 20, 21
    return [2, 3, 18, 19, 20, 21].includes(pinNumber);
  }

  /**
   * Get port mapping for Arduino Mega pins to ATmega2560 ports
   * ATmega2560 has ports A, B, C, D, E, F, G, H, J, K, L
   */
  protected getPortMapping(pinNumber: number): { port: number; bit: number } | null {
    // Simplified mapping for ATmega2560
    // This is a complex mapping - in real implementation would need full port mapping
    
    if (pinNumber >= 0 && pinNumber <= 7) {
      // Digital pins 0-7 -> PORTE
      return { port: 4, bit: pinNumber };
    } else if (pinNumber >= 8 && pinNumber <= 13) {
      // Digital pins 8-13 -> PORTH
      return { port: 7, bit: pinNumber - 8 };
    } else if (pinNumber >= 14 && pinNumber <= 21) {
      // Digital pins 14-21 -> PORTJ
      return { port: 9, bit: pinNumber - 14 };
    } else if (pinNumber >= 22 && pinNumber <= 29) {
      // Digital pins 22-29 -> PORTA
      return { port: 0, bit: pinNumber - 22 };
    } else if (pinNumber >= 30 && pinNumber <= 37) {
      // Digital pins 30-37 -> PORTC
      return { port: 2, bit: pinNumber - 30 };
    } else if (pinNumber >= 38 && pinNumber <= 45) {
      // Digital pins 38-45 -> PORTD
      return { port: 3, bit: pinNumber - 38 };
    } else if (pinNumber >= 46 && pinNumber <= 53) {
      // Digital pins 46-53 -> PORTL
      return { port: 11, bit: pinNumber - 46 };
    } else if (pinNumber >= 54 && pinNumber <= 69) {
      // Analog pins A0-A15 -> PORTF/PORTK
      const analogIndex = pinNumber - 54;
      if (analogIndex < 8) {
        // A0-A7 -> PORTF
        return { port: 5, bit: analogIndex };
      } else {
        // A8-A15 -> PORTK
        return { port: 10, bit: analogIndex - 8 };
      }
    }
    
    return null; // Invalid pin or power/ground pins
  }

  /**
   * Get digital pins (0-53)
   */
  getDigitalPins(): PinDefinition[] {
    return Array.from({ length: ArduinoMegaBoard.DIGITAL_PINS }, (_, i) => this.state.pins.get(i)!);
  }

  /**
   * Get analog pins (A0-A15)
   */
  getAnalogPins(): PinDefinition[] {
    return Array.from({ length: ArduinoMegaBoard.ANALOG_PINS }, (_, i) => this.state.pins.get(54 + i)!);
  }

  /**
   * Override analogRead to handle extended analog pins
   */
  public readAnalogPin(analogPinNumber: number): number {
    let actualPinNumber: number;
    
    if (analogPinNumber >= 0 && analogPinNumber <= 15) {
      // A0-A15 -> pins 54-69
      actualPinNumber = 54 + analogPinNumber;
    } else if (analogPinNumber >= 54 && analogPinNumber <= 69) {
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
   * Get serial port pins
   * Mega has 4 hardware serial ports
   */
  getSerialPorts(): { [key: string]: { rx: number; tx: number } } {
    return {
      Serial: { rx: 0, tx: 1 },     // Serial (USB)
      Serial1: { rx: 19, tx: 18 },  // Serial1
      Serial2: { rx: 17, tx: 16 },  // Serial2
      Serial3: { rx: 15, tx: 14 }   // Serial3
    };
  }

  /**
   * Get I2C pins (SDA, SCL)
   */
  getI2CPins(): { sda: number; scl: number } {
    return {
      sda: 20, // SDA
      scl: 21  // SCL
    };
  }

  /**
   * Get SPI pins
   */
  getSPIPins(): { miso: number; mosi: number; sck: number; ss: number } {
    return {
      miso: 50, // MISO
      mosi: 51, // MOSI
      sck: 52,  // SCK
      ss: 53    // SS
    };
  }

  /**
   * Initialize extended timers for ATmega2560
   */
  protected initializeTimers(): void {
    // ATmega2560 has 6 timers (Timer0-Timer5)
    const timers: Timer[] = [
      {
        id: 0,
        name: 'Timer0',
        prescaler: 64,
        compareValue: 255,
        currentValue: 0,
        mode: TimerMode.FAST_PWM,
        frequency: 976.5625,
      },
      {
        id: 1,
        name: 'Timer1',
        prescaler: 64,
        compareValue: 65535,
        currentValue: 0,
        mode: TimerMode.NORMAL,
        frequency: 244.14,
      },
      {
        id: 2,
        name: 'Timer2',
        prescaler: 64,
        compareValue: 255,
        currentValue: 0,
        mode: TimerMode.FAST_PWM,
        frequency: 976.5625,
      },
      {
        id: 3,
        name: 'Timer3',
        prescaler: 64,
        compareValue: 65535,
        currentValue: 0,
        mode: TimerMode.NORMAL,
        frequency: 244.14,
      },
      {
        id: 4,
        name: 'Timer4',
        prescaler: 64,
        compareValue: 65535,
        currentValue: 0,
        mode: TimerMode.NORMAL,
        frequency: 244.14,
      },
      {
        id: 5,
        name: 'Timer5',
        prescaler: 64,
        compareValue: 65535,
        currentValue: 0,
        mode: TimerMode.NORMAL,
        frequency: 244.14,
      }
    ];

    this.state.timers = timers;
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
      size: { width: 150, height: 80 } // Larger than Uno/Nano
    };
  }

  /**
   * Get extended features specific to Mega
   */
  getExtendedFeatures() {
    return {
      serialPorts: this.getSerialPorts(),
      i2cPins: this.getI2CPins(),
      spiPins: this.getSPIPins(),
      interruptPins: [2, 3, 18, 19, 20, 21],
      pwmPins: this.getPWMPins(),
      flashSize: this.emulatorConfig.flashSize,
      ramSize: this.emulatorConfig.ramSize,
      eepromSize: this.emulatorConfig.eepromSize
    };
  }
}