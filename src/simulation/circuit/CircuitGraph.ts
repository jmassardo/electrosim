/**
 * Circuit Graph Structure for electrical circuit analysis
 * Implements the graph representation required for circuit solving
 */

import { Component } from '../components/base/Component';

export interface CircuitNode {
  id: string;
  voltage: number;
  connections: Connection[];
  isGround?: boolean;
  isVcc?: boolean;
}

export interface Connection {
  id: string;
  fromNode: string;
  toNode: string;
  component: Component;
  resistance: number;
  current: number;
}

export interface Wire {
  id: string;
  fromPin: { componentId: string; pinName: string };
  toPin: { componentId: string; pinName: string };
  resistance: number; // Wire resistance (typically very small)
}

/**
 * Circuit graph that represents the electrical connections between components
 */
export class CircuitGraph {
  private nodes: Map<string, CircuitNode>;
  private components: Map<string, Component>;
  private connections: Map<string, Connection>;
  private wires: Map<string, Wire>;
  private nodeCounter: number = 0;

  constructor() {
    this.nodes = new Map();
    this.components = new Map();
    this.connections = new Map();
    this.wires = new Map();
    
    // Create ground node (reference voltage = 0V)
    this.addNode('ground', 0, true, false);
    // Create VCC node (power supply = 5V by default)
    this.addNode('vcc', 5.0, false, true);
  }

  /**
   * Add a component to the circuit
   */
  addComponent(component: Component): void {
    if (this.components.has(component.id)) {
      throw new Error(`Component ${component.id} already exists in circuit`);
    }
    
    this.components.set(component.id, component);
    
    // Create nodes for each component pin if they don't exist
    component.pins.forEach((pin, pinName) => {
      const nodeId = this.getNodeId(component.id, pinName);
      if (!this.nodes.has(nodeId)) {
        this.addNode(nodeId, pin.voltage);
      }
    });
  }

  /**
   * Remove a component from the circuit
   */
  removeComponent(componentId: string): void {
    const component = this.components.get(componentId);
    if (!component) {
      return; // Component doesn't exist
    }

    // Remove all connections involving this component
    const connectionsToRemove: string[] = [];
    this.connections.forEach((connection, connectionId) => {
      if (connection.component.id === componentId) {
        connectionsToRemove.push(connectionId);
      }
    });

    connectionsToRemove.forEach(connectionId => {
      this.removeConnection(connectionId);
    });

    // Remove component nodes
    component.pins.forEach((pin, pinName) => {
      const nodeId = this.getNodeId(componentId, pinName);
      this.removeNode(nodeId);
    });

    this.components.delete(componentId);
  }

  /**
   * Add a wire connection between two component pins
   */
  addWire(
    fromComponent: string, 
    fromPin: string, 
    toComponent: string, 
    toPin: string, 
    wireResistance: number = 0.001 // 1mΩ default wire resistance
  ): string {
    const wireId = `wire_${fromComponent}_${fromPin}_to_${toComponent}_${toPin}`;
    
    if (this.wires.has(wireId)) {
      throw new Error(`Wire ${wireId} already exists`);
    }

    const fromComp = this.components.get(fromComponent);
    const toComp = this.components.get(toComponent);
    
    if (!fromComp || !toComp) {
      throw new Error('Cannot wire non-existent components');
    }

    const fromPinObj = fromComp.getPin(fromPin);
    const toPinObj = toComp.getPin(toPin);
    
    if (!fromPinObj || !toPinObj) {
      throw new Error('Cannot wire non-existent pins');
    }

    // Create wire
    const wire: Wire = {
      id: wireId,
      fromPin: { componentId: fromComponent, pinName: fromPin },
      toPin: { componentId: toComponent, pinName: toPin },
      resistance: wireResistance
    };

    this.wires.set(wireId, wire);

    // Connect the pins at component level
    fromComp.connectPin(fromPin, wireId);
    toComp.connectPin(toPin, wireId);

    // Merge nodes or create connection between them
    this.createWireConnection(wire);

    return wireId;
  }

  /**
   * Remove a wire connection
   */
  removeWire(wireId: string): void {
    const wire = this.wires.get(wireId);
    if (!wire) {
      return;
    }

    // Disconnect pins at component level
    const fromComp = this.components.get(wire.fromPin.componentId);
    const toComp = this.components.get(wire.toPin.componentId);
    
    if (fromComp) {
      fromComp.disconnectPin(wire.fromPin.pinName);
    }
    if (toComp) {
      toComp.disconnectPin(wire.toPin.pinName);
    }

    // Remove connection from graph
    this.connections.delete(wireId);
    this.wires.delete(wireId);
  }

  /**
   * Get all nodes in the circuit
   */
  getNodes(): Map<string, CircuitNode> {
    return new Map(this.nodes);
  }

  /**
   * Get all components in the circuit
   */
  getComponents(): Map<string, Component> {
    return new Map(this.components);
  }

  /**
   * Get all connections in the circuit
   */
  getConnections(): Map<string, Connection> {
    return new Map(this.connections);
  }

  /**
   * Get all wires in the circuit
   */
  getWires(): Map<string, Wire> {
    return new Map(this.wires);
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId: string): CircuitNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Update node voltage
   */
  setNodeVoltage(nodeId: string, voltage: number): void {
    const node = this.nodes.get(nodeId);
    if (node && !node.isGround && !node.isVcc) {
      node.voltage = voltage;
      
      // Update component pin voltage
      this.updateComponentPinVoltages(nodeId, voltage);
    }
  }

  /**
   * Get total number of nodes (excluding ground)
   */
  getNodeCount(): number {
    return this.nodes.size - 1; // Exclude ground
  }

  /**
   * Get total number of connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Validate circuit integrity
   */
  validate(): string[] {
    const errors: string[] = [];

    // Check for floating nodes (nodes with no connections)
    this.nodes.forEach((node, nodeId) => {
      if (!node.isGround && !node.isVcc && node.connections.length === 0) {
        errors.push(`Floating node detected: ${nodeId}`);
      }
    });

    // Check for short circuits (very low resistance paths)
    this.connections.forEach((connection, connectionId) => {
      if (connection.resistance < 0.0001) { // Less than 0.1mΩ
        const fromNode = this.nodes.get(connection.fromNode);
        const toNode = this.nodes.get(connection.toNode);
        if (fromNode && toNode && Math.abs(fromNode.voltage - toNode.voltage) > 0.1) {
          errors.push(`Potential short circuit detected: ${connectionId}`);
        }
      }
    });

    // Validate components
    this.components.forEach(component => {
      const componentErrors = component.validate();
      errors.push(...componentErrors);
    });

    return errors;
  }

  /**
   * Reset all node voltages and currents
   */
  reset(): void {
    this.nodes.forEach(node => {
      if (!node.isGround && !node.isVcc) {
        node.voltage = 0;
      }
      node.connections.forEach(connection => {
        connection.current = 0;
      });
    });

    this.connections.forEach(connection => {
      connection.current = 0;
    });

    // Reset all components
    this.components.forEach(component => {
      component.reset();
    });
  }

  // Private helper methods

  private addNode(nodeId: string, voltage: number = 0, isGround: boolean = false, isVcc: boolean = false): void {
    if (this.nodes.has(nodeId)) {
      return; // Node already exists
    }

    const node: CircuitNode = {
      id: nodeId,
      voltage,
      connections: [],
      isGround,
      isVcc
    };

    this.nodes.set(nodeId, node);
  }

  private removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node || node.isGround || node.isVcc) {
      return; // Cannot remove ground/VCC or non-existent nodes
    }

    // Remove all connections to this node
    const connectionsToRemove = [...node.connections];
    connectionsToRemove.forEach(connection => {
      this.removeConnection(connection.id);
    });

    this.nodes.delete(nodeId);
  }

  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Remove from nodes' connection lists
    const fromNode = this.nodes.get(connection.fromNode);
    const toNode = this.nodes.get(connection.toNode);

    if (fromNode) {
      fromNode.connections = fromNode.connections.filter(conn => conn.id !== connectionId);
    }
    if (toNode) {
      toNode.connections = toNode.connections.filter(conn => conn.id !== connectionId);
    }

    this.connections.delete(connectionId);
  }

  private createWireConnection(wire: Wire): void {
    const fromNodeId = this.getNodeId(wire.fromPin.componentId, wire.fromPin.pinName);
    const toNodeId = this.getNodeId(wire.toPin.componentId, wire.toPin.pinName);

    const fromComp = this.components.get(wire.fromPin.componentId)!;
    const toComp = this.components.get(wire.toPin.componentId)!;

    // Create connection representing the wire
    const connection: Connection = {
      id: wire.id,
      fromNode: fromNodeId,
      toNode: toNodeId,
      component: fromComp, // Use from component as reference
      resistance: wire.resistance,
      current: 0
    };

    this.connections.set(wire.id, connection);

    // Add connection to both nodes
    const fromNode = this.nodes.get(fromNodeId)!;
    const toNode = this.nodes.get(toNodeId)!;

    fromNode.connections.push(connection);
    if (fromNodeId !== toNodeId) {
      toNode.connections.push(connection);
    }
  }

  private getNodeId(componentId: string, pinName: string): string {
    return `${componentId}_${pinName}`;
  }

  private updateComponentPinVoltages(nodeId: string, voltage: number): void {
    // Extract component ID and pin name from node ID
    const parts = nodeId.split('_');
    if (parts.length < 2) return;
    
    const componentId = parts[0];
    const pinName = parts.slice(1).join('_');
    
    const component = this.components.get(componentId);
    if (component) {
      component.setPinVoltage(pinName, voltage);
    }
  }
}