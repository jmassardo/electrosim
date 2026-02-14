/**
 * Circuit Solver Engine - Implements Kirchhoff's laws for circuit analysis
 * Uses Modified Nodal Analysis (MNA) for DC circuit solving
 */

import { CircuitGraph, CircuitNode, Connection } from './CircuitGraph';
import { Component } from '../components/base/Component';

export interface CircuitSolution {
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  powerConsumption: Map<string, number>;
  isStable: boolean;
  convergenceIterations: number;
  totalPower: number;
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Circuit solver using Modified Nodal Analysis (MNA)
 */
export class CircuitSolver {
  private static readonly MAX_ITERATIONS = 50;
  private static readonly CONVERGENCE_TOLERANCE = 1e-6; // 1 microVolt
  private static readonly MIN_RESISTANCE = 1e-6; // 1 microOhm minimum to prevent division by zero
  private static readonly MAX_VOLTAGE = 50.0; // Safety limit: 50V
  private static readonly MAX_CURRENT = 10.0; // Safety limit: 10A

  /**
   * Solve circuit using Kirchhoff's laws and Modified Nodal Analysis
   */
  solveKirchhoff(graph: CircuitGraph): CircuitSolution {
    const solution: CircuitSolution = {
      nodeVoltages: new Map(),
      branchCurrents: new Map(),
      powerConsumption: new Map(),
      isStable: false,
      convergenceIterations: 0,
      totalPower: 0,
      errors: []
    };

    try {
      // Validate circuit before solving
      const validation = this.validateCircuit(graph);
      if (!validation.isValid) {
        solution.errors = validation.errors;
        return solution;
      }

      // Get nodes and connections for analysis
      const nodes = graph.getNodes();
      const connections = graph.getConnections();
      const components = graph.getComponents();

      // Build list of non-ground nodes for analysis
      const analysisNodes: CircuitNode[] = [];
      nodes.forEach(node => {
        if (!node.isGround) {
          analysisNodes.push(node);
        }
      });

      if (analysisNodes.length === 0) {
        solution.errors.push('No analysis nodes found');
        return solution;
      }

      // Perform iterative solving for nonlinear components
      let voltages = this.calculateNodeVoltages(analysisNodes, connections);
      let previousVoltages: number[] = new Array(voltages.length).fill(0);
      
      for (let iteration = 0; iteration < CircuitSolver.MAX_ITERATIONS; iteration++) {
        solution.convergenceIterations = iteration + 1;

        // Update component states based on current voltages
        this.updateComponentStates(components, nodes, voltages, analysisNodes);

        // Recalculate with updated component resistances
        const newVoltages = this.calculateNodeVoltages(analysisNodes, connections);

        // Check for convergence
        let maxChange = 0;
        for (let i = 0; i < newVoltages.length; i++) {
          const change = Math.abs(newVoltages[i] - voltages[i]);
          maxChange = Math.max(maxChange, change);
        }

        voltages = newVoltages;

        if (maxChange < CircuitSolver.CONVERGENCE_TOLERANCE) {
          solution.isStable = true;
          break;
        }

        previousVoltages = [...voltages];
      }

      // Apply voltages to circuit graph
      this.applyVoltages(graph, analysisNodes, voltages);

      // Calculate currents and power
      const currents = this.calculateBranchCurrents(connections);
      const power = this.calculatePowerConsumption(components);

      // Populate solution
      solution.nodeVoltages = this.buildNodeVoltageMap(analysisNodes, voltages);
      solution.branchCurrents = currents;
      solution.powerConsumption = power;
      solution.totalPower = Array.from(power.values()).reduce((sum, p) => sum + p, 0);

      // Final safety checks
      this.performSafetyChecks(solution);

    } catch (error) {
      solution.errors.push(`Solver error: ${error instanceof Error ? error.message : String(error)}`);
      solution.isStable = false;
    }

    return solution;
  }

  /**
   * Calculate node voltages using matrix methods (Modified Nodal Analysis)
   */
  calculateNodeVoltages(nodes: CircuitNode[], connections: Map<string, Connection>): number[] {
    const n = nodes.length;
    if (n === 0) return [];

    // Create conductance matrix G and current vector I
    const G = Array(n).fill(0).map(() => Array(n).fill(0));
    const I = Array(n).fill(0);

    // Build conductance matrix using Modified Nodal Analysis
    nodes.forEach((node, i) => {
      node.connections.forEach(connection => {
        const conductance = this.calculateConductance(connection);
        
        // Find the other node in the connection
        const otherNodeId = connection.fromNode === node.id ? connection.toNode : connection.fromNode;
        const otherNodeIndex = nodes.findIndex(n => n.id === otherNodeId);
        
        if (otherNodeIndex >= 0 && otherNodeIndex < n) {
          // Off-diagonal: -G
          G[i][otherNodeIndex] -= conductance;
          G[otherNodeIndex][i] -= conductance;
          
          // Diagonal: sum of conductances connected to this node
          G[i][i] += conductance;
          G[otherNodeIndex][otherNodeIndex] += conductance;
        } else if (otherNodeId === 'ground') {
          // Connection to ground
          G[i][i] += conductance;
        } else if (otherNodeId === 'vcc') {
          // Connection to VCC: treat as current source
          const vccNode = nodes.find(n => n.id === 'vcc');
          const vccVoltage = vccNode ? vccNode.voltage : 5.0;
          G[i][i] += conductance;
          I[i] += conductance * vccVoltage;
        }
      });
    });

    // Solve the linear system G * V = I using Gaussian elimination
    return this.solveLinearSystem(G, I);
  }

  /**
   * Calculate branch currents using Ohm's law
   */
  calculateBranchCurrents(connections: Map<string, Connection>): Map<string, number> {
    const currents = new Map<string, number>();

    connections.forEach((connection, connectionId) => {
      const resistance = Math.max(connection.resistance, CircuitSolver.MIN_RESISTANCE);
      const voltageDrop = connection.component.getPinVoltage(connection.fromNode.split('_')[1] || 'pin1') - 
                         connection.component.getPinVoltage(connection.toNode.split('_')[1] || 'pin2');
      
      const current = voltageDrop / resistance;
      
      // Apply safety limits
      const safeCurrent = Math.max(-CircuitSolver.MAX_CURRENT, 
                                   Math.min(CircuitSolver.MAX_CURRENT, current));
      
      currents.set(connectionId, safeCurrent);
      connection.current = safeCurrent;
    });

    return currents;
  }

  /**
   * Validate circuit for analysis readiness
   */
  validateCircuit(graph: CircuitGraph): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const nodes = graph.getNodes();
    const components = graph.getComponents();
    const connections = graph.getConnections();

    // Check for basic circuit requirements
    if (components.size === 0) {
      result.errors.push('Circuit contains no components');
      result.isValid = false;
    }

    // Check for ground reference
    const hasGround = Array.from(nodes.values()).some(node => node.isGround);
    if (!hasGround) {
      result.errors.push('Circuit must have a ground reference');
      result.isValid = false;
    }

    // Check for isolated components
    components.forEach((component, id) => {
      const componentConnections = Array.from(connections.values())
        .filter(conn => conn.component.id === id);
      
      if (componentConnections.length === 0) {
        result.warnings.push(`Component ${id} has no electrical connections`);
      }
    });

    // Check for zero/negative resistances
    connections.forEach((connection, id) => {
      if (connection.resistance <= 0) {
        result.errors.push(`Connection ${id} has zero or negative resistance`);
        result.isValid = false;
      }
    });

    // Component-specific validation
    components.forEach(component => {
      const componentErrors = component.validate();
      result.errors.push(...componentErrors);
      if (componentErrors.length > 0) {
        result.isValid = false;
      }
    });

    return result;
  }

  /**
   * Calculate power consumption for each component
   */
  private calculatePowerConsumption(components: Map<string, Component>): Map<string, number> {
    const power = new Map<string, number>();

    components.forEach((component, id) => {
      let totalPower = 0;

      component.pins.forEach(pin => {
        const voltage = Math.abs(pin.voltage);
        const current = Math.abs(pin.current);
        
        // Only count power for input pins to avoid double counting
        if (pin.direction === 'input' || pin.direction === 'bidirectional') {
          totalPower += voltage * current;
        }
      });

      power.set(id, totalPower);
    });

    return power;
  }

  /**
   * Calculate conductance (1/R) with safety checks
   */
  private calculateConductance(connection: Connection): number {
    const resistance = Math.max(connection.resistance, CircuitSolver.MIN_RESISTANCE);
    return 1.0 / resistance;
  }

  /**
   * Solve linear system Ax = b using Gaussian elimination with partial pivoting
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      }

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        throw new Error(`Singular matrix detected at row ${i}`);
      }

      // Eliminate
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
      
      // Apply safety voltage limit
      x[i] = Math.max(-CircuitSolver.MAX_VOLTAGE, Math.min(CircuitSolver.MAX_VOLTAGE, x[i]));
    }

    return x;
  }

  /**
   * Update component states based on calculated voltages
   */
  private updateComponentStates(
    components: Map<string, Component>,
    nodes: Map<string, CircuitNode>,
    voltages: number[],
    analysisNodes: CircuitNode[]
  ): void {
    // Apply voltage solutions to nodes
    voltages.forEach((voltage, index) => {
      if (index < analysisNodes.length) {
        const node = analysisNodes[index];
        node.voltage = voltage;
      }
    });

    // Update component pin voltages from their associated nodes
    components.forEach(component => {
      component.pins.forEach((pin, pinName) => {
        const nodeId = `${component.id}_${pinName}`;
        const node = nodes.get(nodeId);
        if (node) {
          component.setPinVoltage(pinName, node.voltage);
        }
      });

      // Let component update its internal state
      component.update({
        deltaTime: 16.67, // ~60 FPS
        currentTime: Date.now(),
        voltage: 5.0 // Supply voltage
      });
    });
  }

  /**
   * Apply calculated voltages to the circuit graph
   */
  private applyVoltages(graph: CircuitGraph, nodes: CircuitNode[], voltages: number[]): void {
    voltages.forEach((voltage, index) => {
      if (index < nodes.length) {
        const node = nodes[index];
        graph.setNodeVoltage(node.id, voltage);
      }
    });
  }

  /**
   * Build node voltage map for solution
   */
  private buildNodeVoltageMap(nodes: CircuitNode[], voltages: number[]): Map<string, number> {
    const voltageMap = new Map<string, number>();
    
    nodes.forEach((node, index) => {
      if (index < voltages.length) {
        voltageMap.set(node.id, voltages[index]);
      }
    });

    // Always include ground reference
    voltageMap.set('ground', 0);

    return voltageMap;
  }

  /**
   * Perform safety checks on the solution
   */
  private performSafetyChecks(solution: CircuitSolution): void {
    // Check for dangerous voltages
    solution.nodeVoltages.forEach((voltage, nodeId) => {
      if (Math.abs(voltage) > CircuitSolver.MAX_VOLTAGE) {
        solution.errors.push(`Dangerous voltage detected at node ${nodeId}: ${voltage.toFixed(2)}V`);
      }
    });

    // Check for dangerous currents
    solution.branchCurrents.forEach((current, connectionId) => {
      if (Math.abs(current) > CircuitSolver.MAX_CURRENT) {
        solution.errors.push(`Dangerous current detected in ${connectionId}: ${(current * 1000).toFixed(1)}mA`);
      }
    });

    // Check for excessive power consumption
    if (solution.totalPower > 25.0) { // 25W limit for typical Arduino circuits
      solution.errors.push(`Excessive power consumption: ${solution.totalPower.toFixed(2)}W`);
    }
  }
}