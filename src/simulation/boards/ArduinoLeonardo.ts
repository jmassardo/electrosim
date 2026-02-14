/**
 * Arduino Leonardo board simulation
 * ATmega32u4 microcontroller with native USB HID capability
 */

import { ArduinoBoard, PinDefinition, PinMode, PinType, PowerModel } from './ArduinoBoard';
import { AVREmulatorConfig } from '../emulator/AVREmulator';

/**
 * USB HID Emulation for Leonardo board
 * Simulates Keyboard and Mouse libraries functionality
 */
export class USBHIDEmulation {
  private keyboardEnabled: boolean = false;
  private mouseEnabled: boolean = false;
  private keyboardState: Set<string> = new Set();
  private mouseState = { x: 0, y: 0, buttons: 0 };

  enableKeyboard(): void {
    this.keyboardEnabled = true;
  }

  enableMouse(): void {
    this.mouseEnabled = true;
  }

  isKeyboardEnabled(): boolean {
    return this.keyboardEnabled;
  }

  isMouseEnabled(): boolean {
    return this.mouseEnabled;
  }

  keyboardPress(key: string): void {
    if (!this.keyboardEnabled) {
      throw new Error('Keyboard not enabled. Call Keyboard.begin() first.');
    }
    this.keyboardState.add(key);
    this.sendKeyboardReport(this.getKeyCode(key), true);
  }

  keyboardRelease(key: string): void {
    if (!this.keyboardEnabled) return;
    this.keyboardState.delete(key);
    this.sendKeyboardReport(this.getKeyCode(key), false);
  }

  keyboardReleaseAll(): void {
    if (!this.keyboardEnabled) return;
    this.keyboardState.clear();
    // Send empty report
    this.sendKeyboardReport(0, false);
  }

  mouseMove(deltaX: number, deltaY: number): void {
    if (!this.mouseEnabled) {
      throw new Error('Mouse not enabled. Call Mouse.begin() first.');
    }
    this.mouseState.x += deltaX;
    this.mouseState.y += deltaY;
    this.sendMouseReport({
      buttons: this.mouseState.buttons,
      deltaX: deltaX,
      deltaY: deltaY,
      wheel: 0
    });
  }

  mouseClick(button: 'left' | 'right' | 'middle'): void {
    if (!this.mouseEnabled) return;
    const buttonMask = this.getButtonMask(button);
    this.mouseState.buttons |= buttonMask;
    this.sendMouseReport({ 
      buttons: this.mouseState.buttons, 
      deltaX: 0, 
      deltaY: 0, 
      wheel: 0 
    });
    
    // Auto-release after short delay (simulated)
    setTimeout(() => {
      this.mouseState.buttons &= ~buttonMask;
      this.sendMouseReport({ 
        buttons: this.mouseState.buttons, 
        deltaX: 0, 
        deltaY: 0, 
        wheel: 0 
      });
    }, 10);
  }

  mousePress(button: 'left' | 'right' | 'middle'): void {
    if (!this.mouseEnabled) return;
    const buttonMask = this.getButtonMask(button);
    this.mouseState.buttons |= buttonMask;
    this.sendMouseReport({ 
      buttons: this.mouseState.buttons, 
      deltaX: 0, 
      deltaY: 0, 
      wheel: 0 
    });
  }

  mouseRelease(button: 'left' | 'right' | 'middle'): void {
    if (!this.mouseEnabled) return;
    const buttonMask = this.getButtonMask(button);
    this.mouseState.buttons &= ~buttonMask;
    this.sendMouseReport({ 
      buttons: this.mouseState.buttons, 
      deltaX: 0, 
      deltaY: 0, 
      wheel: 0 
    });
  }

  private getKeyCode(key: string): number {
    // Simplified key code mapping
    const keyMap: { [key: string]: number } = {
      'a': 4, 'b': 5, 'c': 6, 'd': 7, 'e': 8, 'f': 9, 'g': 10, 'h': 11,
      'i': 12, 'j': 13, 'k': 14, 'l': 15, 'm': 16, 'n': 17, 'o': 18, 'p': 19,
      'q': 20, 'r': 21, 's': 22, 't': 23, 'u': 24, 'v': 25, 'w': 26, 'x': 27,
      'y': 28, 'z': 29, '1': 30, '2': 31, '3': 32, '4': 33, '5': 34, '6': 35,
      '7': 36, '8': 37, '9': 38, '0': 39, ' ': 44, 'enter': 40, 'esc': 41,
      'backspace': 42, 'tab': 43, 'capslock': 57, 'f1': 58, 'f2': 59, 'f3': 60,
      'f4': 61, 'f5': 62, 'f6': 63, 'f7': 64, 'f8': 65, 'f9': 66, 'f10': 67,
      'f11': 68, 'f12': 69
    };
    return keyMap[key.toLowerCase()] || 0;
  }

  private getButtonMask(button: 'left' | 'right' | 'middle'): number {
    switch (button) {
      case 'left': return 1;
      case 'right': return 2;
      case 'middle': return 4;
      default: return 0;
    }
  }

  private sendKeyboardReport(keyCode: number, pressed: boolean): void {
    // In a real implementation, this would send HID reports to the host
    // For simulation, we just log the action
    console.log(`HID Keyboard: ${pressed ? 'Press' : 'Release'} key ${keyCode}`);
  }

  private sendMouseReport(report: { buttons: number; deltaX: number; deltaY: number; wheel: number }): void {
    // In a real implementation, this would send HID reports to the host
    // For simulation, we just log the action
    console.log(`HID Mouse: buttons=${report.buttons}, dx=${report.deltaX}, dy=${report.deltaY}`);
  }

  getState() {
    return {
      keyboardEnabled: this.keyboardEnabled,
      mouseEnabled: this.mouseEnabled,
      keyboardState: Array.from(this.keyboardState),
      mouseState: { ...this.mouseState }
    };
  }
}

/**
 * Arduino Leonardo board simulation with ATmega32u4 microcontroller
 * Features native USB HID capability for Keyboard and Mouse libraries
 */
export class ArduinoLeonardoBoard extends ArduinoBoard {
  private static readonly DIGITAL_PINS = 20; // 0-13 + A0-A5 as digital (14-19)
  private static readonly ANALOG_PINS = 12;  // A0-A5 dedicated + A6-A11 (shared with digital 4,6,8,9,10,12)
  private static readonly PWM_PINS = [3, 5, 6, 9, 10, 11, 13];
  private static readonly USB_HID_CAPABLE = true;

  private usbHID: USBHIDEmulation;

  constructor(id: string, name: string = 'Arduino Leonardo') {
    super(id, name, 'arduino-leonardo');
    this.usbHID = new USBHIDEmulation();
  }

  getBoardName(): string {
    return 'Arduino Leonardo';
  }

  getDigitalPinCount(): number {
    return ArduinoLeonardoBoard.DIGITAL_PINS;
  }

  getAnalogPinCount(): number {
    return ArduinoLeonardoBoard.ANALOG_PINS;
  }

  getPWMPins(): number[] {
    return [...ArduinoLeonardoBoard.PWM_PINS];
  }

  getEmulatorConfig(): AVREmulatorConfig {
    return {
      flashSize: 32768,        // 32KB flash memory
      ramSize: 2560,           // 2.5KB SRAM
      eepromSize: 1024,        // 1KB EEPROM
      clockFrequency: 16000000 // 16MHz
    };
  }

  getPowerModel(): PowerModel {
    return {
      activeConsumption: 25,    // ~25mA when active (USB controller adds consumption)
      sleepConsumption: 0.020,  // ~20μA in deep sleep
      supplyVoltage: 5.0        // 5V supply
    };
  }

  /**
   * Setup pin definitions for Arduino Leonardo
   */
  setupPinDefinitions(): void {
    // Digital pins 0-13
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
        isPWMCapable: ArduinoLeonardoBoard.PWM_PINS.includes(i),
        isInterruptCapable: this.isInterruptPin(i)
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

    // Additional analog pins A6-A11 (shared with some digital pins)
    // These are mapped to digital pins 4, 6, 8, 9, 10, 12 respectively
    const analogExtendedMapping = [
      { analogPin: 6, digitalPin: 4 },
      { analogPin: 7, digitalPin: 6 },
      { analogPin: 8, digitalPin: 8 },
      { analogPin: 9, digitalPin: 9 },
      { analogPin: 10, digitalPin: 10 },
      { analogPin: 11, digitalPin: 12 }
    ];

    analogExtendedMapping.forEach(({ analogPin, digitalPin }) => {
      const pin = this.state.pins.get(digitalPin);
      if (pin) {
        // Make the digital pin also function as an analog pin
        pin.name = `D${digitalPin}/A${analogPin}`;
        // Note: In reality, these pins can function as both digital and analog
      }
    });
    
    // Power pins
    const powerPins = [
      { number: 100, name: '5V', type: PinType.POWER, voltage: 5.0 },
      { number: 101, name: '3.3V', type: PinType.POWER, voltage: 3.3 },
      { number: 102, name: 'GND1', type: PinType.GROUND, voltage: 0 },
      { number: 103, name: 'GND2', type: PinType.GROUND, voltage: 0 },
      { number: 104, name: 'GND3', type: PinType.GROUND, voltage: 0 },
      { number: 105, name: 'VIN', type: PinType.POWER, voltage: 0 },
      { number: 106, name: 'RESET', type: PinType.DIGITAL, voltage: 5.0 }
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
   * Leonardo supports interrupts on pins 0, 1, 2, 3, 7
   */
  private isInterruptPin(pinNumber: number): boolean {
    return [0, 1, 2, 3, 7].includes(pinNumber);
  }

  /**
   * Get port mapping for Arduino Leonardo pins to ATmega32u4 ports
   * ATmega32u4 has ports B, C, D, E, F
   */
  protected getPortMapping(pinNumber: number): { port: number; bit: number } | null {
    // Leonardo pin mapping for ATmega32u4 (simplified)
    // This is a complex mapping specific to the Leonardo layout
    
    const pinMapping: { [pin: number]: { port: number; bit: number } } = {
      // Digital pins
      0: { port: 3, bit: 2 },  // PD2 (RX, INT2)
      1: { port: 3, bit: 3 },  // PD3 (TX, INT3)  
      2: { port: 3, bit: 1 },  // PD1 (SDA, INT1)
      3: { port: 3, bit: 0 },  // PD0 (SCL, PWM, INT0)
      4: { port: 3, bit: 4 },  // PD4 (A6)
      5: { port: 2, bit: 6 },  // PC6 (PWM)
      6: { port: 3, bit: 7 },  // PD7 (PWM, A7)
      7: { port: 4, bit: 6 },  // PE6 (INT6)
      8: { port: 1, bit: 4 },  // PB4 (A8)
      9: { port: 1, bit: 5 },  // PB5 (PWM, A9)
      10: { port: 1, bit: 6 }, // PB6 (PWM, A10)
      11: { port: 1, bit: 7 }, // PB7 (PWM)
      12: { port: 3, bit: 6 }, // PD6 (A11)
      13: { port: 2, bit: 7 }, // PC7 (PWM)
      
      // Analog pins (when used as digital)
      14: { port: 5, bit: 7 }, // A0 - PF7
      15: { port: 5, bit: 6 }, // A1 - PF6
      16: { port: 5, bit: 5 }, // A2 - PF5
      17: { port: 5, bit: 4 }, // A3 - PF4
      18: { port: 5, bit: 1 }, // A4 - PF1
      19: { port: 5, bit: 0 }  // A5 - PF0
    };

    return pinMapping[pinNumber] || null;
  }

  /**
   * Get digital pins (0-13)
   */
  getDigitalPins(): PinDefinition[] {
    return Array.from({ length: 14 }, (_, i) => this.state.pins.get(i)!);
  }

  /**
   * Get analog pins (A0-A5 dedicated)
   */
  getAnalogPins(): PinDefinition[] {
    return Array.from({ length: 6 }, (_, i) => this.state.pins.get(14 + i)!);
  }

  /**
   * Get all analog-capable pins (A0-A11)
   */
  getAllAnalogPins(): PinDefinition[] {
    const analogPins: PinDefinition[] = [];
    
    // A0-A5 (pins 14-19)
    for (let i = 0; i < 6; i++) {
      analogPins.push(this.state.pins.get(14 + i)!);
    }
    
    // A6-A11 (shared with digital pins 4, 6, 8, 9, 10, 12)
    const sharedPins = [4, 6, 8, 9, 10, 12];
    sharedPins.forEach(pin => {
      analogPins.push(this.state.pins.get(pin)!);
    });
    
    return analogPins;
  }

  /**
   * Get I2C pins (SDA, SCL) - Different from Uno!
   */
  getI2CPins(): { sda: number; scl: number } {
    return {
      sda: 2, // SDA on pin 2
      scl: 3  // SCL on pin 3
    };
  }

  /**
   * Get SPI pins
   */
  getSPIPins(): { miso: number; mosi: number; sck: number; ss: number } {
    return {
      miso: 14, // MISO on ICSP header (also on pin 14)
      mosi: 16, // MOSI on ICSP header (also on pin 16)
      sck: 15,  // SCK on ICSP header (also on pin 15)
      ss: 17    // Not a dedicated pin, can use any digital pin
    };
  }

  /**
   * USB HID Functions - Leonardo specific
   */
  
  keyboardBegin(): void {
    this.usbHID.enableKeyboard();
  }

  keyboardEnd(): void {
    this.usbHID.keyboardReleaseAll();
  }

  keyboardPress(key: string): void {
    this.usbHID.keyboardPress(key);
  }

  keyboardRelease(key: string): void {
    this.usbHID.keyboardRelease(key);
  }

  keyboardReleaseAll(): void {
    this.usbHID.keyboardReleaseAll();
  }

  mouseBegin(): void {
    this.usbHID.enableMouse();
  }

  mouseMove(deltaX: number, deltaY: number): void {
    this.usbHID.mouseMove(deltaX, deltaY);
  }

  mouseClick(button: 'left' | 'right' | 'middle' = 'left'): void {
    this.usbHID.mouseClick(button);
  }

  mousePress(button: 'left' | 'right' | 'middle' = 'left'): void {
    this.usbHID.mousePress(button);
  }

  mouseRelease(button: 'left' | 'right' | 'middle' = 'left'): void {
    this.usbHID.mouseRelease(button);
  }

  /**
   * Get USB HID state
   */
  getUSBHIDState() {
    return this.usbHID.getState();
  }

  /**
   * Override analogRead to handle extended analog pins
   */
  public readAnalogPin(analogPinNumber: number): number {
    let actualPinNumber: number;
    
    if (analogPinNumber >= 0 && analogPinNumber <= 5) {
      // A0-A5 -> pins 14-19
      actualPinNumber = 14 + analogPinNumber;
    } else if (analogPinNumber >= 6 && analogPinNumber <= 11) {
      // A6-A11 -> shared digital pins
      const sharedMapping = [4, 6, 8, 9, 10, 12];
      actualPinNumber = sharedMapping[analogPinNumber - 6];
    } else if (analogPinNumber >= 14 && analogPinNumber <= 19) {
      // Direct pin number access for A0-A5
      actualPinNumber = analogPinNumber;
    } else {
      throw new Error(`Invalid analog pin number: ${analogPinNumber}`);
    }

    const pin = this.state.pins.get(actualPinNumber);
    if (!pin) {
      throw new Error(`Pin ${actualPinNumber} not found`);
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
      usbHID: this.getUSBHIDState(),
      size: { width: 90, height: 50 } // Between Nano and Uno size
    };
  }

  /**
   * Get Leonardo-specific features
   */
  getLeonardoFeatures() {
    return {
      usbHID: true,
      keyboardSupported: true,
      mouseSupported: true,
      i2cPins: this.getI2CPins(),
      spiPins: this.getSPIPins(),
      interruptPins: [0, 1, 2, 3, 7],
      pwmPins: this.getPWMPins(),
      analogExtendedPins: [4, 6, 8, 9, 10, 12], // A6-A11 shared pins
      microcontroller: 'ATmega32u4',
      flashSize: this.emulatorConfig.flashSize,
      ramSize: this.emulatorConfig.ramSize,
      eepromSize: this.emulatorConfig.eepromSize
    };
  }
}