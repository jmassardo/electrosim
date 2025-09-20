import { DigitalComponent } from './base/DigitalComponent';
import { ComponentUpdateContext } from './base/Component';

/**
 * Push button component - momentary switch for user input
 */
export class ButtonComponent extends DigitalComponent {
  private isPressed: boolean;
  private normallyOpen: boolean;
  private debounceTime: number; // in milliseconds
  private lastPressTime: number;

  constructor(id: string, normallyOpen: boolean = true) {
    super(id, 'button', `BTN_${id}`, [
      { id: 'pin1', name: 'Pin 1', number: 1, type: 'digital', direction: 'bidirectional' },
      { id: 'pin2', name: 'Pin 2', number: 2, type: 'digital', direction: 'bidirectional' }
    ]);
    
    this.isPressed = false;
    this.normallyOpen = normallyOpen;
    this.debounceTime = 50; // 50ms debounce by default
    this.lastPressTime = 0;
    
    this.properties.normallyOpen = normallyOpen;
    this.properties.debounceTime = this.debounceTime;
    this.properties.type = 'momentary';
  }

  public press(): void {
    const currentTime = Date.now();
    
    // Debounce the button press
    if (currentTime - this.lastPressTime >= this.debounceTime) {
      this.isPressed = true;
      this.lastPressTime = currentTime;
      this.updatePinStates();
    }
  }

  public release(): void {
    this.isPressed = false;
    this.updatePinStates();
  }

  public toggle(): void {
    if (this.isPressed) {
      this.release();
    } else {
      this.press();
    }
  }

  public isCurrentlyPressed(): boolean {
    return this.isPressed;
  }

  public setNormallyOpen(normallyOpen: boolean): void {
    this.normallyOpen = normallyOpen;
    this.properties.normallyOpen = normallyOpen;
    this.updatePinStates();
  }

  public setDebounceTime(debounceTime: number): void {
    this.debounceTime = Math.max(0, debounceTime);
    this.properties.debounceTime = this.debounceTime;
  }

  private updatePinStates(): void {
    // Determine if the switch is closed
    const isClosed = this.normallyOpen ? this.isPressed : !this.isPressed;
    
    if (isClosed) {
      // Switch is closed - create connection between pins
      // Both pins will have the same voltage (determined by external circuit)
      const pin1Voltage = this.getPinVoltage('Pin 1');
      const pin2Voltage = this.getPinVoltage('Pin 2');
      
      // In a real circuit, the voltage would equalize
      // For simulation purposes, we'll use the higher voltage
      const targetVoltage = Math.max(pin1Voltage, pin2Voltage);
      
      this.setPinVoltage('Pin 1', targetVoltage);
      this.setPinVoltage('Pin 2', targetVoltage);
    }
    // When switch is open, pins are isolated (no change to voltages)
  }

  public update(_context: ComponentUpdateContext): void {
    // Check for automatic release after some time for momentary buttons
    if (this.isPressed && this.properties.type === 'momentary') {
      const currentTime = Date.now();
      // Auto-release after 100ms if no manual release (simulates quick press)
      if (currentTime - this.lastPressTime >= 100) {
        this.isPressed = false;
        this.updatePinStates();
      }
    }
    
    this.updatePinStates();
  }

  public reset(): void {
    this.isPressed = false;
    this.lastPressTime = 0;
    
    this.pins.forEach(pin => {
      pin.voltage = 0;
      pin.current = 0;
      pin.connected = false;
      pin.connectionId = undefined;
    });
  }

  public getRenderData(): any {
    return {
      type: 'button',
      id: this.id,
      name: this.name,
      position: this.position,
      pins: Array.from(this.pins.values()),
      isPressed: this.isPressed,
      normallyOpen: this.normallyOpen,
      buttonType: this.properties.type,
      width: 25,
      height: 25,
      color: this.isPressed ? '#ff6b6b' : '#4ecdc4'
    };
  }

  public validate(): string[] {
    const errors: string[] = [];
    
    if (this.debounceTime < 0) {
      errors.push('Debounce time cannot be negative');
    }
    
    if (this.debounceTime > 1000) {
      errors.push('Debounce time seems unusually high (>1000ms)');
    }
    
    return errors;
  }

  public getInfo(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      state: this.isPressed ? 'Pressed' : 'Released',
      configuration: this.normallyOpen ? 'Normally Open' : 'Normally Closed',
      debounceTime: `${this.debounceTime}ms`,
      buttonType: this.properties.type,
      componentType: 'Input Component',
      description: 'Momentary switch for user input'
    };
  }
}