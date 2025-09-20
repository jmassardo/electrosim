/**
 * Base component class for all electronic components in the simulation
 */

export interface Pin {
  id: string;
  name: string;
  number: number;
  type: 'digital' | 'analog' | 'power' | 'ground';
  direction: 'input' | 'output' | 'bidirectional';
  voltage: number;
  current: number;
  connected: boolean;
  connectionId?: string | undefined;
}

export interface ComponentUpdateContext {
  deltaTime: number; // milliseconds since last update
  currentTime: number; // total simulation time
  voltage: number; // supply voltage (typically 5V for Arduino)
}

/**
 * Abstract base class for all electronic components
 */
export abstract class Component {
  public readonly id: string;
  public readonly type: string;
  public name: string;
  public pins: Map<string, Pin>;
  public properties: Record<string, any>;
  public position: { x: number; y: number; rotation: number };
  public metadata: Record<string, any>;

  constructor(
    id: string,
    type: string,
    name: string,
    pinDefinitions: Omit<Pin, 'voltage' | 'current' | 'connected' | 'connectionId'>[]
  ) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.pins = new Map();
    this.properties = {};
    this.position = { x: 0, y: 0, rotation: 0 };
    this.metadata = {};

    // Initialize pins
    pinDefinitions.forEach(pinDef => {
      const pin: Pin = {
        ...pinDef,
        voltage: 0,
        current: 0,
        connected: false
      };
      this.pins.set(pin.name, pin);
    });
  }

  /**
   * Get a pin by name
   */
  getPin(pinName: string): Pin | undefined {
    return this.pins.get(pinName);
  }

  /**
   * Set the voltage on a pin
   */
  setPinVoltage(pinName: string, voltage: number): void {
    const pin = this.pins.get(pinName);
    if (pin) {
      pin.voltage = voltage;
    }
  }

  /**
   * Get the voltage on a pin
   */
  getPinVoltage(pinName: string): number {
    const pin = this.pins.get(pinName);
    return pin ? pin.voltage : 0;
  }

  /**
   * Set pin current flow
   */
  setPinCurrent(pinName: string, current: number): void {
    const pin = this.pins.get(pinName);
    if (pin) {
      pin.current = current;
    }
  }

  /**
   * Get the current on a pin
   */
  getPinCurrent(pinName: string): number {
    const pin = this.pins.get(pinName);
    return pin ? pin.current : 0;
  }

  /**
   * Connect a pin to another component's pin
   */
  connectPin(pinName: string, connectionId: string): void {
    const pin = this.pins.get(pinName);
    if (pin) {
      pin.connected = true;
      pin.connectionId = connectionId;
    }
  }

  /**
   * Disconnect a pin
   */
  disconnectPin(pinName: string): void {
    const pin = this.pins.get(pinName);
    if (pin) {
      pin.connected = false;
      pin.connectionId = undefined;
    }
  }

  /**
   * Update component state - called each simulation frame
   * Subclasses must implement this method
   */
  abstract update(context: ComponentUpdateContext): void;

  /**
   * Reset component to initial state
   */
  abstract reset(): void;

  /**
   * Get component's visual representation data for rendering
   */
  abstract getRenderData(): any;

  /**
   * Validate component configuration
   */
  abstract validate(): string[];

  /**
   * Calculate power consumption
   */
  getPowerConsumption(): number {
    let totalPower = 0;
    this.pins.forEach(pin => {
      if (pin.direction === 'input' && pin.voltage > 0 && pin.current > 0) {
        totalPower += pin.voltage * pin.current;
      }
    });
    return totalPower; // watts
  }

  /**
   * Serialize component state for saving
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      properties: { ...this.properties },
      position: { ...this.position },
      metadata: { ...this.metadata }
    };
  }

  /**
   * Deserialize component state from saved data
   */
  deserialize(data: any) {
    this.name = data.name || this.name;
    this.properties = { ...data.properties };
    this.position = { ...data.position };
    this.metadata = { ...data.metadata };
  }
}