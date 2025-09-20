/**
 * Simple simulation manager to coordinate components and boards
 * This will eventually be replaced by the full SimulationEngine
 */

import { LEDComponent } from '../components/LED';
import { ArduinoUnoBoard } from '../boards/ArduinoUno';

export interface SimulationComponent {
  id: string;
  type: string;
  component: LEDComponent | ArduinoUnoBoard;
  position: { x: number; y: number };
}

export interface WireConnection {
  id: string;
  fromComponent: string;
  fromPin: string | number;
  toComponent: string;
  toPin: string | number;
}

/**
 * Basic simulation manager for initial testing
 */
export class SimpleSimulationManager {
  private components: Map<string, SimulationComponent>;
  private connections: Map<string, WireConnection>;
  private arduinoBoard?: ArduinoUnoBoard;
  private animationFrameId?: number;
  private isRunning: boolean = false;

  constructor() {
    this.components = new Map();
    this.connections = new Map();
  }

  /**
   * Add an Arduino board
   */
  addArduinoBoard(board: ArduinoUnoBoard, position: { x: number; y: number }): void {
    this.arduinoBoard = board;
    board.position.x = position.x;
    board.position.y = position.y;
    
    this.components.set(board.id, {
      id: board.id,
      type: 'arduino-uno',
      component: board,
      position
    });
  }

  /**
   * Add an LED component
   */
  addLED(led: LEDComponent, position: { x: number; y: number }): void {
    led.position.x = position.x;
    led.position.y = position.y;
    
    this.components.set(led.id, {
      id: led.id,
      type: 'led',
      component: led,
      position
    });
  }

  /**
   * Connect an LED to an Arduino pin
   */
  connectLEDToArduino(ledId: string, arduinoId: string, pin: number): void {
    const connectionId = `${arduinoId}.${pin}-${ledId}.anode`;
    
    this.connections.set(connectionId, {
      id: connectionId,
      fromComponent: arduinoId,
      fromPin: pin,
      toComponent: ledId,
      toPin: 'anode'
    });
  }

  /**
   * Connect LED cathode to ground
   */
  connectLEDToGround(ledId: string, arduinoId: string): void {
    const connectionId = `${arduinoId}.GND-${ledId}.cathode`;
    
    this.connections.set(connectionId, {
      id: connectionId,
      fromComponent: arduinoId,
      fromPin: 'GND',
      toComponent: ledId,
      toPin: 'cathode'
    });
  }

  /**
   * Update simulation - propagate signals
   */
  private updateSimulation(): void {
    if (!this.arduinoBoard) return;

    // Update Arduino board state
    this.arduinoBoard.update();

    // Propagate signals through connections
    this.connections.forEach(connection => {
      const fromComp = this.components.get(connection.fromComponent);
      const toComp = this.components.get(connection.toComponent);
      
      if (!fromComp || !toComp) return;

      // Handle Arduino to LED connections
      if (fromComp.type === 'arduino-uno' && toComp.type === 'led') {
        const arduino = fromComp.component as ArduinoUnoBoard;
        const led = toComp.component as LEDComponent;
        
        if (typeof connection.fromPin === 'number') {
          const pin = arduino.getPin(connection.fromPin);
          if (pin && connection.toPin === 'anode') {
            led.setPinVoltage('anode', pin.voltage);
          }
        } else if (connection.fromPin === 'GND' && connection.toPin === 'cathode') {
          led.setPinVoltage('cathode', 0); // Ground is 0V
        }
      }
    });

    // Update all LED components
    this.components.forEach(comp => {
      if (comp.type === 'led') {
        const led = comp.component as LEDComponent;
        led.update({ currentTime: Date.now(), deltaTime: 16.67, voltage: 5.0 });
      }
    });
  }

  /**
   * Start simulation loop
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.simulationLoop();
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Check if simulation is currently running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Simulation loop
   */
  private simulationLoop = (): void => {
    if (!this.isRunning) return;

    this.updateSimulation();
    this.animationFrameId = requestAnimationFrame(this.simulationLoop);
  };

  /**
   * Set Arduino pin state (for testing)
   */
  setArduinoPin(pin: number, state: boolean): void {
    if (this.arduinoBoard) {
      this.arduinoBoard.setPinMode(pin, 'OUTPUT');
      this.arduinoBoard.digitalWrite(pin, state);
    }
  }

  /**
   * Get all components for rendering
   */
  getAllComponents(): SimulationComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get connections for rendering
   */
  getAllConnections(): WireConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get Arduino board
   */
  getArduinoBoard(): ArduinoUnoBoard | undefined {
    return this.arduinoBoard;
  }
}