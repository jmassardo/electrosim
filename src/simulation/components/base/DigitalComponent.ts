/**
 * Base class for digital components (components that work with HIGH/LOW signals)
 */

import { Component, Pin } from './Component';

export abstract class DigitalComponent extends Component {
  protected readonly logicHighThreshold: number = 2.0; // volts
  protected readonly logicLowThreshold: number = 0.8;  // volts

  constructor(
    id: string,
    type: string,
    name: string,
    pinDefinitions: Omit<Pin, 'voltage' | 'current' | 'connected' | 'connectionId'>[]
  ) {
    super(id, type, name, pinDefinitions);
  }

  /**
   * Convert voltage to digital logic level
   */
  protected voltageToLogic(voltage: number): boolean {
    if (voltage >= this.logicHighThreshold) {
      return true; // HIGH
    } else if (voltage <= this.logicLowThreshold) {
      return false; // LOW
    } else {
      // Undefined region - maintain previous state or use default
      return voltage > (this.logicHighThreshold + this.logicLowThreshold) / 2;
    }
  }

  /**
   * Convert digital logic level to voltage
   */
  protected logicToVoltage(logic: boolean, vcc: number = 5.0): number {
    return logic ? vcc : 0;
  }

  /**
   * Get digital state of a pin
   */
  protected getPinLogicState(pinName: string): boolean {
    const voltage = this.getPinVoltage(pinName);
    return this.voltageToLogic(voltage);
  }

  /**
   * Set digital state of an output pin
   */
  protected setPinLogicState(pinName: string, state: boolean, vcc: number = 5.0): void {
    const voltage = this.logicToVoltage(state, vcc);
    this.setPinVoltage(pinName, voltage);
  }

  /**
   * Handle digital state change - override in subclasses
   */
  protected onDigitalChange(_pinName: string, _previousState: boolean, _currentState: boolean): void {
    // Default implementation - can be overridden
  }
}