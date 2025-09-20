/**
 * Core simulation engine that manages the entire circuit simulation
 */

import { Component, ComponentUpdateContext } from '../components/base/Component';
import { EventEmitter } from 'events';

export interface SimulationConfig {
  targetFPS: number;
  maxComponents: number;
  enableProfiling: boolean;
  enableDebugging: boolean;
}

export interface SimulationStats {
  fps: number;
  frameTime: number;
  componentCount: number;
  totalTime: number;
  cycleCount: number;
  memoryUsage: number;
}

export interface CircuitConnection {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
  voltage: number;
  current: number;
}

/**
 * Main simulation engine that orchestrates all components and manages timing
 */
export class SimulationEngine extends EventEmitter {
  private components: Map<string, Component>;
  private connections: Map<string, CircuitConnection>;
  private isRunning: boolean;
  private isPaused: boolean;
  private animationFrameId?: number | undefined;
  private lastFrameTime: number;
  private totalTime: number;
  private cycleCount: number;
  private config: SimulationConfig;
  private stats: SimulationStats;
  private targetFrameTime: number;

  constructor(config: Partial<SimulationConfig> = {}) {
    super();
    
    this.components = new Map();
    this.connections = new Map();
    this.isRunning = false;
    this.isPaused = false;
    this.lastFrameTime = 0;
    this.totalTime = 0;
    this.cycleCount = 0;
    
    // Default configuration
    this.config = {
      targetFPS: 60,
      maxComponents: 100,
      enableProfiling: false,
      enableDebugging: false,
      ...config
    };
    
    this.targetFrameTime = 1000 / this.config.targetFPS;
    
    // Use targetFrameTime for potential frame rate limiting in the future
    console.log(`Simulation engine initialized with target frame time: ${this.targetFrameTime}ms`);
    
    this.stats = {
      fps: 0,
      frameTime: 0,
      componentCount: 0,
      totalTime: 0,
      cycleCount: 0,
      memoryUsage: 0
    };
  }

  /**
   * Add a component to the simulation
   */
  addComponent(component: Component): void {
    if (this.components.size >= this.config.maxComponents) {
      throw new Error(`Maximum component limit (${this.config.maxComponents}) exceeded`);
    }
    
    this.components.set(component.id, component);
    this.emit('componentAdded', component);
  }

  /**
   * Remove a component from the simulation
   */
  removeComponent(componentId: string): boolean {
    const component = this.components.get(componentId);
    if (!component) {
      return false;
    }

    // Remove all connections involving this component
    const connectionsToRemove: string[] = [];
    this.connections.forEach((connection, id) => {
      if (connection.fromComponent === componentId || connection.toComponent === componentId) {
        connectionsToRemove.push(id);
      }
    });
    
    connectionsToRemove.forEach(id => this.removeConnection(id));
    
    this.components.delete(componentId);
    this.emit('componentRemoved', component);
    return true;
  }

  /**
   * Get a component by ID
   */
  getComponent(componentId: string): Component | undefined {
    return this.components.get(componentId);
  }

  /**
   * Get all components
   */
  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Connect two component pins
   */
  connectPins(
    fromComponentId: string,
    fromPin: string,
    toComponentId: string,
    toPin: string
  ): string {
    const fromComponent = this.components.get(fromComponentId);
    const toComponent = this.components.get(toComponentId);
    
    if (!fromComponent || !toComponent) {
      throw new Error('One or both components not found');
    }
    
    const fromPinObj = fromComponent.getPin(fromPin);
    const toPinObj = toComponent.getPin(toPin);
    
    if (!fromPinObj || !toPinObj) {
      throw new Error('One or both pins not found');
    }
    
    const connectionId = `${fromComponentId}.${fromPin}-${toComponentId}.${toPin}`;
    
    const connection: CircuitConnection = {
      id: connectionId,
      fromComponent: fromComponentId,
      fromPin,
      toComponent: toComponentId,
      toPin,
      voltage: 0,
      current: 0
    };
    
    this.connections.set(connectionId, connection);
    
    // Update component pin connections
    fromComponent.connectPin(fromPin, connectionId);
    toComponent.connectPin(toPin, connectionId);
    
    this.emit('connectionAdded', connection);
    return connectionId;
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }
    
    // Disconnect pins
    const fromComponent = this.components.get(connection.fromComponent);
    const toComponent = this.components.get(connection.toComponent);
    
    if (fromComponent) {
      fromComponent.disconnectPin(connection.fromPin);
    }
    if (toComponent) {
      toComponent.disconnectPin(connection.toPin);
    }
    
    this.connections.delete(connectionId);
    this.emit('connectionRemoved', connection);
    return true;
  }

  /**
   * Start the simulation
   */
  start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    
    // Start the simulation loop
    this.scheduleNextFrame();
    
    this.emit('started');
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    this.isPaused = true;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    
    this.emit('paused');
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) {
      return;
    }
    
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.scheduleNextFrame();
    
    this.emit('resumed');
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    
    // Reset all components
    this.components.forEach(component => component.reset());
    
    this.totalTime = 0;
    this.cycleCount = 0;
    
    this.emit('stopped');
  }

  /**
   * Reset the simulation to initial state
   */
  reset(): void {
    const wasRunning = this.isRunning;
    this.stop();
    
    // Reset all components
    this.components.forEach(component => component.reset());
    
    if (wasRunning) {
      this.start();
    }
    
    this.emit('reset');
  }

  /**
   * Get current simulation statistics
   */
  getStats(): SimulationStats {
    return { ...this.stats };
  }

  /**
   * Main simulation loop
   */
  private simulationLoop = (): void => {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Update stats
    this.stats.frameTime = deltaTime;
    this.stats.fps = 1000 / deltaTime;
    this.stats.componentCount = this.components.size;
    this.stats.totalTime = this.totalTime;
    this.stats.cycleCount = this.cycleCount;
    
    // Create update context
    const updateContext: ComponentUpdateContext = {
      deltaTime,
      currentTime: this.totalTime,
      voltage: 5.0 // Default Arduino supply voltage
    };
    
    // Update all components
    this.components.forEach(component => {
      try {
        component.update(updateContext);
      } catch (error) {
        console.error(`Error updating component ${component.id}:`, error);
        this.emit('componentError', component, error);
      }
    });
    
    // Propagate electrical signals through connections
    this.propagateSignals();
    
    // Update counters
    this.totalTime += deltaTime;
    this.cycleCount++;
    this.lastFrameTime = currentTime;
    
    // Emit frame update
    this.emit('frameUpdate', this.stats);
    
    // Schedule next frame
    this.scheduleNextFrame();
  };

  /**
   * Schedule the next simulation frame
   */
  private scheduleNextFrame(): void {
    if (this.isRunning && !this.isPaused) {
      this.animationFrameId = requestAnimationFrame(this.simulationLoop);
    }
  }

  /**
   * Propagate electrical signals through all connections
   */
  private propagateSignals(): void {
    this.connections.forEach(connection => {
      const fromComponent = this.components.get(connection.fromComponent);
      const toComponent = this.components.get(connection.toComponent);
      
      if (fromComponent && toComponent) {
        const fromPin = fromComponent.getPin(connection.fromPin);
        const toPin = toComponent.getPin(connection.toPin);
        
        if (fromPin && toPin) {
          // Simple voltage propagation (can be enhanced with more sophisticated circuit analysis)
          if (fromPin.direction === 'output' && toPin.direction === 'input') {
            toComponent.setPinVoltage(connection.toPin, fromPin.voltage);
            connection.voltage = fromPin.voltage;
            // Current calculation would go here (simplified for now)
            connection.current = 0;
          }
        }
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    this.components.clear();
    this.connections.clear();
    this.removeAllListeners();
  }
}