import { DigitalComponent } from './base/DigitalComponent';
import { ComponentUpdateContext } from './base/Component';

/**
 * LED (Light Emitting Diode) component implementation
 */
export class LEDComponent extends DigitalComponent {
  private color: string;
  private forwardVoltage: number; // volts
  private maxCurrent: number;     // amperes
  private brightness: number;     // 0-1, calculated based on current
  private isOn: boolean;

  constructor(id: string, color: string = 'red', forwardVoltage: number = 2.0) {
    super(id, 'led', `LED_${color}`, [
      { id: 'anode', name: 'Anode', number: 1, type: 'digital', direction: 'input' },
      { id: 'cathode', name: 'Cathode', number: 2, type: 'digital', direction: 'input' }
    ]);
    
    this.color = color;
    this.forwardVoltage = forwardVoltage;
    this.maxCurrent = 0.025; // 25mA maximum safe current
    this.brightness = 0;
    this.isOn = false;
    
    this.properties = {
      color,
      forwardVoltage,
      maxCurrent: this.maxCurrent,
      typicalCurrent: 0.02 // 20mA typical current
    };
  }

  public getColor(): string {
    return this.color;
  }

  public getBrightness(): number {
    return this.brightness;
  }

  public isLightOn(): boolean {
    return this.isOn;
  }

  public getForwardVoltage(): number {
    return this.forwardVoltage;
  }

  public setForwardVoltage(voltage: number): void {
    this.forwardVoltage = Math.max(0.5, Math.min(5.0, voltage)); // Reasonable range
    this.properties.forwardVoltage = this.forwardVoltage;
  }

  public update(_context: ComponentUpdateContext): void {
    const anodeVoltage = this.getPinVoltage('Anode');
    const cathodeVoltage = this.getPinVoltage('Cathode');
    const voltageDrop = anodeVoltage - cathodeVoltage;
    
    // LED turns on when forward voltage is exceeded
    const wasOn = this.isOn;
    this.isOn = voltageDrop >= this.forwardVoltage;
    
    if (this.isOn) {
      // Calculate current through LED using simplified model
      // In reality, LED current increases exponentially with voltage
      const excessVoltage = voltageDrop - this.forwardVoltage;
      const current = Math.min(this.maxCurrent, excessVoltage * 0.01); // Simplified linear model
      
      // Calculate brightness based on current (linear approximation)
      this.brightness = Math.min(1.0, current / this.properties.typicalCurrent);
      
      // Set current through the LED
      this.setPinCurrent('Anode', current);
      this.setPinCurrent('Cathode', -current);
    } else {
      this.brightness = 0;
      this.setPinCurrent('Anode', 0);
      this.setPinCurrent('Cathode', 0);
    }
    
    // Log state change for debugging
    if (wasOn !== this.isOn) {
      console.log(`LED ${this.id} ${this.isOn ? 'turned ON' : 'turned OFF'} (V=${voltageDrop.toFixed(2)}V)`);
    }
  }

  public reset(): void {
    this.brightness = 0;
    this.isOn = false;
    
    this.pins.forEach(pin => {
      pin.voltage = 0;
      pin.current = 0;
      pin.connected = false;
      pin.connectionId = undefined;
    });
  }

  public getRenderData(): any {
    return {
      type: 'led',
      id: this.id,
      name: this.name,
      position: this.position,
      pins: Array.from(this.pins.values()),
      color: this.color,
      isOn: this.isOn,
      brightness: this.brightness,
      forwardVoltage: this.forwardVoltage,
      width: 20,
      height: 20,
      glowEffect: this.isOn ? this.brightness * 0.8 : 0
    };
  }

  public validate(): string[] {
    const errors: string[] = [];
    
    if (this.forwardVoltage <= 0) {
      errors.push('Forward voltage must be greater than 0');
    }
    
    if (this.forwardVoltage > 5.0) {
      errors.push('Forward voltage seems unusually high (>5V)');
    }
    
    if (this.maxCurrent <= 0) {
      errors.push('Maximum current must be greater than 0');
    }
    
    // Check for overcurrent condition
    const anodeVoltage = this.getPinVoltage('Anode');
    const cathodeVoltage = this.getPinVoltage('Cathode');
    const voltageDrop = anodeVoltage - cathodeVoltage;
    
    if (this.isOn && voltageDrop > this.forwardVoltage + 2.0) {
      errors.push('LED may be damaged by excessive voltage');
    }
    
    const current = Math.abs(this.getPinCurrent('Anode'));
    if (current > this.maxCurrent) {
      errors.push(`Current (${(current * 1000).toFixed(1)}mA) exceeds maximum (${(this.maxCurrent * 1000).toFixed(1)}mA)`);
    }
    
    return errors;
  }

  public getInfo(): Record<string, any> {
    const anodeVoltage = this.getPinVoltage('Anode');
    const cathodeVoltage = this.getPinVoltage('Cathode');
    const voltageDrop = anodeVoltage - cathodeVoltage;
    const current = Math.abs(this.getPinCurrent('Anode'));
    
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      color: this.color,
      state: this.isOn ? 'ON' : 'OFF',
      brightness: `${Math.round(this.brightness * 100)}%`,
      forwardVoltage: `${this.forwardVoltage.toFixed(1)}V`,
      actualVoltage: `${voltageDrop.toFixed(2)}V`,
      current: `${(current * 1000).toFixed(1)}mA`,
      powerConsumption: `${(voltageDrop * current * 1000).toFixed(1)}mW`,
      componentType: 'Output Component',
      description: 'Light-emitting diode for visual output'
    };
  }
}