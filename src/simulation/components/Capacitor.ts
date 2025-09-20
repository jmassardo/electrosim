import { DigitalComponent } from './base/DigitalComponent';
import { ComponentUpdateContext } from './base/Component';

/**
 * Capacitor component - stores electrical energy in an electric field
 */
export class CapacitorComponent extends DigitalComponent {
  private capacitance: number; // in Farads - clamped safe value
  private rawCapacitance: number; // raw value for validation
  private storedCharge: number; // in Coulombs
  private previousVoltage: number;

  constructor(id: string, capacitance: number = 0.0001) { // Default 100μF
    super(id, 'capacitor', `C_${capacitance * 1000000}μF`, [
      { id: 'positive', name: 'Positive', number: 1, type: 'analog', direction: 'bidirectional' },
      { id: 'negative', name: 'Negative', number: 2, type: 'analog', direction: 'bidirectional' }
    ]);
    
    this.rawCapacitance = capacitance;
    this.capacitance = Math.max(1e-12, capacitance); // Minimum 1pF for calculations
    this.storedCharge = 0;
    this.previousVoltage = 0;
    
    this.properties.capacitance = capacitance; // Store original for validation
    this.properties.voltage_rating = '25V'; // Default voltage rating
    this.properties.type = 'electrolytic'; // Default type
  }

  public getCapacitance(): number {
    return this.capacitance; // Return clamped value
  }

  public setCapacitance(capacitance: number): void {
    this.rawCapacitance = capacitance;
    this.capacitance = Math.max(1e-12, capacitance); // Minimum 1pF
    this.properties.capacitance = capacitance; // Store original for validation
  }

  public getStoredCharge(): number {
    return this.storedCharge;
  }

  public getStoredEnergy(): number {
    const voltage = this.getVoltageAcross();
    return 0.5 * this.capacitance * voltage * voltage; // E = 1/2 * C * V²
  }

  public getVoltageAcross(): number {
    const positiveVoltage = this.getPinVoltage('Positive');
    const negativeVoltage = this.getPinVoltage('Negative');
    return positiveVoltage - negativeVoltage;
  }

  public update(context: ComponentUpdateContext): void {
    const currentVoltage = this.getVoltageAcross();
    const deltaTime = context.deltaTime / 1000; // Convert to seconds
    
    // Calculate current using I = C * (dV/dt)
    const voltageChange = currentVoltage - this.previousVoltage;
    const current = this.capacitance * (voltageChange / deltaTime);
    
    // Update stored charge: Q = C * V
    this.storedCharge = this.capacitance * currentVoltage;
    
    // Set current on pins (current flows into positive pin during charging)
    if (voltageChange > 0) {
      // Charging
      this.setPinCurrent('Positive', current);
      this.setPinCurrent('Negative', -current);
    } else if (voltageChange < 0) {
      // Discharging
      this.setPinCurrent('Positive', current);
      this.setPinCurrent('Negative', -current);
    } else {
      // No voltage change, no current
      this.setPinCurrent('Positive', 0);
      this.setPinCurrent('Negative', 0);
    }
    
    this.previousVoltage = currentVoltage;
  }

  public reset(): void {
    this.storedCharge = 0;
    this.previousVoltage = 0;
    
    this.pins.forEach(pin => {
      pin.voltage = 0;
      pin.current = 0;
      pin.connected = false;
      pin.connectionId = undefined;
    });
  }

  public getRenderData(): any {
    return {
      type: 'capacitor',
      id: this.id,
      name: this.name,
      position: this.position,
      pins: Array.from(this.pins.values()),
      capacitance: this.capacitance,
      capacitanceFormatted: this.formatCapacitance(),
      voltageRating: this.properties.voltage_rating,
      capacitorType: this.properties.type,
      storedCharge: this.storedCharge,
      storedEnergy: this.getStoredEnergy(),
      width: 30,
      height: 40,
      polarized: this.properties.type === 'electrolytic'
    };
  }

  public validate(): string[] {
    const errors: string[] = [];
    
    if (this.rawCapacitance <= 0) {
      errors.push('Capacitance must be greater than 0');
    }
    
    if (this.rawCapacitance < 1e-12 || this.rawCapacitance > 1) {
      errors.push('Capacitance value out of practical range (1pF - 1F)');
    }
    
    // Check voltage rating for polarized capacitors
    if (this.properties.type === 'electrolytic') {
      const voltage = Math.abs(this.getVoltageAcross());
      const rating = parseFloat(this.properties.voltage_rating.replace('V', ''));
      if (voltage > rating) {
        errors.push(`Voltage (${voltage.toFixed(1)}V) exceeds rating (${rating}V)`);
      }
      
      // Check polarity
      if (this.getVoltageAcross() < 0) {
        errors.push('Electrolytic capacitor reverse biased - may be damaged');
      }
    }
    
    return errors;
  }

  private formatCapacitance(): string {
    if (this.capacitance >= 1) {
      return `${this.capacitance.toFixed(3)}F`;
    } else if (this.capacitance >= 0.001) {
      return `${(this.capacitance * 1000).toFixed(1)}mF`;
    } else if (this.capacitance >= 0.000001) {
      return `${(this.capacitance * 1000000).toFixed(1)}μF`;
    } else if (this.capacitance >= 0.000000001) {
      return `${(this.capacitance * 1000000000).toFixed(1)}nF`;
    } else {
      return `${(this.capacitance * 1000000000000).toFixed(1)}pF`;
    }
  }

  public getInfo(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      capacitance: this.formatCapacitance(),
      voltageRating: this.properties.voltage_rating,
      capacitorType: this.properties.type,
      storedCharge: `${this.storedCharge.toExponential(3)}C`,
      storedEnergy: `${this.getStoredEnergy().toExponential(3)}J`,
      voltage: `${this.getVoltageAcross().toFixed(3)}V`,
      componentType: 'Passive Component',
      description: 'Stores electrical energy in an electric field'
    };
  }
}