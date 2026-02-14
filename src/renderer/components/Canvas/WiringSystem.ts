/**
 * Visual Wiring System for Canvas Components
 */
import { Point, Wire, PinLocation, CanvasComponent } from './types';

export interface WiringSystemEvents {
  onWireStart?: (fromPin: PinLocation) => void;
  onWireComplete?: (wire: Wire) => void;
  onWireDelete?: (wireId: string) => void;
}

export class WiringSystem {
  private isWiring: boolean = false;
  private currentWireStart: PinLocation | null = null;
  private previewPath: Point[] = [];
  private events: WiringSystemEvents;

  constructor(events: WiringSystemEvents = {}) {
    this.events = events;
  }

  /**
   * Start creating a wire from a pin
   */
  startWire(fromPin: PinLocation): void {
    this.isWiring = true;
    this.currentWireStart = fromPin;
    this.previewPath = [fromPin.position];
    this.events.onWireStart?.(fromPin);
  }

  /**
   * Update the wire preview as mouse moves
   */
  updateWirePreview(mousePos: Point, components: CanvasComponent[]): void {
    if (!this.isWiring || !this.currentWireStart) return;

    // Find optimal path from start pin to current mouse position
    const startPos = this.currentWireStart.position;
    const endPos = mousePos;

    // Simple orthogonal routing for now
    this.previewPath = this.calculateOrthogonalPath(startPos, endPos, components);
  }

  /**
   * Attempt to complete the wire at the current position
   */
  completeWire(toPin: PinLocation): Wire | null {
    if (!this.isWiring || !this.currentWireStart) return null;

    // Validate connection
    if (!this.isValidConnection(this.currentWireStart, toPin)) {
      this.cancelWire();
      return null;
    }

    // Create the wire
    const wire: Wire = {
      id: this.generateWireId(),
      fromComponent: this.currentWireStart.componentId,
      fromPin: this.currentWireStart.pinName,
      toComponent: toPin.componentId,
      toPin: toPin.pinName,
      path: this.calculateOrthogonalPath(this.currentWireStart.position, toPin.position, [])
    };

    this.isWiring = false;
    this.currentWireStart = null;
    this.previewPath = [];

    this.events.onWireComplete?.(wire);
    return wire;
  }

  /**
   * Cancel the current wire creation
   */
  cancelWire(): void {
    this.isWiring = false;
    this.currentWireStart = null;
    this.previewPath = [];
  }

  /**
   * Delete a wire
   */
  deleteWire(wireId: string): void {
    this.events.onWireDelete?.(wireId);
  }

  /**
   * Find the pin at a given position
   */
  findPinAt(position: Point, components: CanvasComponent[], tolerance: number = 10): PinLocation | null {
    for (const component of components) {
      for (const pin of component.pins) {
        const pinWorldPos = {
          x: component.position.x + pin.position.x,
          y: component.position.y + pin.position.y
        };

        const distance = Math.sqrt(
          Math.pow(position.x - pinWorldPos.x, 2) + 
          Math.pow(position.y - pinWorldPos.y, 2)
        );

        if (distance <= tolerance) {
          return {
            componentId: component.id,
            pinName: pin.name,
            position: pinWorldPos,
            type: pin.type
          };
        }
      }
    }
    return null;
  }

  /**
   * Get the current wire preview path
   */
  getPreviewPath(): Point[] {
    return [...this.previewPath];
  }

  /**
   * Check if currently wiring
   */
  isWiringActive(): boolean {
    return this.isWiring;
  }

  /**
   * Get the current wire start pin
   */
  getWireStartPin(): PinLocation | null {
    return this.currentWireStart;
  }

  /**
   * Render wire on canvas
   */
  renderWire(ctx: CanvasRenderingContext2D, wire: Wire): void {
    if (wire.path.length < 2) return;

    ctx.save();
    
    // Set wire appearance based on electrical state
    ctx.strokeStyle = this.getWireColor(wire.voltage);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the wire path
    ctx.beginPath();
    ctx.moveTo(wire.path[0].x, wire.path[0].y);
    
    for (let i = 1; i < wire.path.length; i++) {
      ctx.lineTo(wire.path[i].x, wire.path[i].y);
    }
    
    ctx.stroke();

    // Draw electrical state labels if available
    if (wire.voltage !== undefined || wire.current !== undefined) {
      this.drawElectricalLabels(ctx, wire);
    }

    ctx.restore();
  }

  /**
   * Render wire preview
   */
  renderWirePreview(ctx: CanvasRenderingContext2D): void {
    if (!this.isWiring || this.previewPath.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(this.previewPath[0].x, this.previewPath[0].y);
    
    for (let i = 1; i < this.previewPath.length; i++) {
      ctx.lineTo(this.previewPath[i].x, this.previewPath[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Calculate orthogonal path between two points
   */
  private calculateOrthogonalPath(start: Point, end: Point, obstacles: CanvasComponent[]): Point[] {
    // Simple orthogonal routing - more sophisticated routing can be added later
    const midX = start.x + (end.x - start.x) * 0.5;
    
    return [
      start,
      { x: midX, y: start.y },
      { x: midX, y: end.y },
      end
    ];
  }

  /**
   * Validate if two pins can be connected
   */
  private isValidConnection(fromPin: PinLocation, toPin: PinLocation): boolean {
    // Can't connect to the same component
    if (fromPin.componentId === toPin.componentId) return false;

    // Can't connect same pin types (except power/ground)
    if (fromPin.type === toPin.type && fromPin.type !== 'power' && fromPin.type !== 'ground') {
      return false;
    }

    // Output pins can connect to input pins
    if (fromPin.type === 'output' && toPin.type === 'input') return true;
    if (fromPin.type === 'input' && toPin.type === 'output') return true;

    // Power and ground can connect to anything
    if (fromPin.type === 'power' || fromPin.type === 'ground') return true;
    if (toPin.type === 'power' || toPin.type === 'ground') return true;

    return false;
  }

  /**
   * Generate a unique wire ID
   */
  private generateWireId(): string {
    return `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get wire color based on voltage
   */
  private getWireColor(voltage?: number): string {
    if (voltage === undefined) return '#666666';
    if (voltage > 4) return '#ef4444'; // High voltage - red
    if (voltage > 0.5) return '#f97316'; // Medium voltage - orange
    return '#22c55e'; // Low voltage - green
  }

  /**
   * Draw electrical state labels on wire
   */
  private drawElectricalLabels(ctx: CanvasRenderingContext2D, wire: Wire): void {
    if (wire.path.length < 2) return;

    // Find midpoint of wire for label placement
    const midIndex = Math.floor(wire.path.length / 2);
    const labelPos = wire.path[midIndex];

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let label = '';
    if (wire.voltage !== undefined) {
      label += `${wire.voltage.toFixed(2)}V`;
    }
    if (wire.current !== undefined) {
      if (label) label += ' ';
      label += `${(wire.current * 1000).toFixed(1)}mA`;
    }

    if (label) {
      // Draw label background
      const metrics = ctx.measureText(label);
      const padding = 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(
        labelPos.x - metrics.width/2 - padding,
        labelPos.y - 8,
        metrics.width + padding * 2,
        16
      );

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(label, labelPos.x, labelPos.y);
    }

    ctx.restore();
  }
}