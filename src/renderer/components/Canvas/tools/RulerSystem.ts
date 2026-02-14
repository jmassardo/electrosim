/**
 * Ruler and Measurement System for Professional Canvas Tools
 */

import { Point, Rectangle } from '../types';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

export interface MeasurementResult {
  distance: number;
  angle: number;
  deltaX: number;
  deltaY: number;
  units: 'mm' | 'inches' | 'pixels';
}

export class Ruler {
  private orientation: 'horizontal' | 'vertical';
  private visible: boolean = true;
  private height: number = 30;
  private backgroundColor: string = '#f5f5f5';
  private textColor: string = '#333';
  private tickColor: string = '#666';

  constructor(orientation: 'horizontal' | 'vertical') {
    this.orientation = orientation;
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport, units: 'mm' | 'inches' | 'pixels'): void {
    if (!this.visible) return;

    ctx.save();

    // Set ruler background
    ctx.fillStyle = this.backgroundColor;
    if (this.orientation === 'horizontal') {
      ctx.fillRect(0, 0, viewport.width, this.height);
    } else {
      ctx.fillRect(0, 0, this.height, viewport.height);
    }

    // Draw ticks and labels
    this.drawTicks(ctx, viewport, units);

    ctx.restore();
  }

  private drawTicks(ctx: CanvasRenderingContext2D, viewport: Viewport, units: 'mm' | 'inches' | 'pixels'): void {
    const scale = viewport.scale;
    const tickSpacing = this.getTickSpacing(scale, units);
    
    ctx.strokeStyle = this.tickColor;
    ctx.fillStyle = this.textColor;
    ctx.font = '10px Arial';
    ctx.lineWidth = 1;

    if (this.orientation === 'horizontal') {
      this.drawHorizontalTicks(ctx, viewport, tickSpacing, units);
    } else {
      this.drawVerticalTicks(ctx, viewport, tickSpacing, units);
    }
  }

  private drawHorizontalTicks(ctx: CanvasRenderingContext2D, viewport: Viewport, spacing: number, units: string): void {
    const startX = -viewport.x / viewport.scale;
    const endX = (viewport.width - viewport.x) / viewport.scale;
    
    const firstTick = Math.floor(startX / spacing) * spacing;
    
    for (let x = firstTick; x <= endX; x += spacing) {
      const screenX = x * viewport.scale + viewport.x;
      
      if (screenX >= 0 && screenX <= viewport.width) {
        // Major tick
        if (x % (spacing * 5) === 0) {
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, this.height * 0.8);
          ctx.stroke();
          
          // Label
          const label = this.formatTickLabel(x, units);
          const metrics = ctx.measureText(label);
          ctx.fillText(label, screenX - metrics.width / 2, this.height - 5);
        } else {
          // Minor tick
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, this.height * 0.5);
          ctx.stroke();
        }
      }
    }
  }

  private drawVerticalTicks(ctx: CanvasRenderingContext2D, viewport: Viewport, spacing: number, units: string): void {
    const startY = -viewport.y / viewport.scale;
    const endY = (viewport.height - viewport.y) / viewport.scale;
    
    const firstTick = Math.floor(startY / spacing) * spacing;
    
    for (let y = firstTick; y <= endY; y += spacing) {
      const screenY = y * viewport.scale + viewport.y;
      
      if (screenY >= 0 && screenY <= viewport.height) {
        // Major tick
        if (y % (spacing * 5) === 0) {
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(this.height * 0.8, screenY);
          ctx.stroke();
          
          // Label
          const label = this.formatTickLabel(y, units);
          ctx.save();
          ctx.translate(5, screenY);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(label, -ctx.measureText(label).width / 2, 4);
          ctx.restore();
        } else {
          // Minor tick
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(this.height * 0.5, screenY);
          ctx.stroke();
        }
      }
    }
  }

  private getTickSpacing(scale: number, units: 'mm' | 'inches' | 'pixels'): number {
    const baseSpacing = units === 'mm' ? 10 : units === 'inches' ? 1 : 50;
    const scaledSpacing = baseSpacing * scale;
    
    // Adjust spacing based on zoom level
    if (scaledSpacing < 20) return baseSpacing * 5;
    if (scaledSpacing > 100) return baseSpacing / 5;
    return baseSpacing;
  }

  private formatTickLabel(value: number, units: string): string {
    const precision = units === 'mm' ? 1 : units === 'inches' ? 2 : 0;
    return `${value.toFixed(precision)}${units === 'pixels' ? '' : units}`;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getHeight(): number {
    return this.height;
  }
}

export class MeasurementTool {
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;
  private active: boolean = false;
  private lineColor: string = '#007acc';
  private textColor: string = '#333';
  private backgroundColor: string = 'rgba(255, 255, 255, 0.9)';

  startMeasurement(point: Point): void {
    this.startPoint = point;
    this.endPoint = point;
    this.active = true;
  }

  updateMeasurement(point: Point): void {
    if (this.active) {
      this.endPoint = point;
    }
  }

  completeMeasurement(): MeasurementResult | null {
    if (!this.startPoint || !this.endPoint) return null;

    const deltaX = this.endPoint.x - this.startPoint.x;
    const deltaY = this.endPoint.y - this.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    this.active = false;
    
    return {
      distance,
      angle,
      deltaX,
      deltaY,
      units: 'pixels' // This will be converted by the parent system
    };
  }

  cancel(): void {
    this.startPoint = null;
    this.endPoint = null;
    this.active = false;
  }

  render(ctx: CanvasRenderingContext2D, units: 'mm' | 'inches' | 'pixels'): void {
    if (!this.active || !this.startPoint || !this.endPoint) return;

    ctx.save();

    // Draw measurement line
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(this.startPoint.x, this.startPoint.y);
    ctx.lineTo(this.endPoint.x, this.endPoint.y);
    ctx.stroke();

    // Draw measurement info
    this.drawMeasurementInfo(ctx, units);

    ctx.restore();
  }

  private drawMeasurementInfo(ctx: CanvasRenderingContext2D, units: 'mm' | 'inches' | 'pixels'): void {
    if (!this.startPoint || !this.endPoint) return;

    const deltaX = this.endPoint.x - this.startPoint.x;
    const deltaY = this.endPoint.y - this.startPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Convert to appropriate units
    const convertedDistance = this.convertPixelsToUnits(distance, units);
    const convertedDeltaX = this.convertPixelsToUnits(Math.abs(deltaX), units);
    const convertedDeltaY = this.convertPixelsToUnits(Math.abs(deltaY), units);

    const midPoint = {
      x: (this.startPoint.x + this.endPoint.x) / 2,
      y: (this.startPoint.y + this.endPoint.y) / 2
    };

    // Draw info box
    ctx.fillStyle = this.backgroundColor;
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const text = `${convertedDistance.toFixed(2)}${units} (${convertedDeltaX.toFixed(2)} × ${convertedDeltaY.toFixed(2)}) ${angle.toFixed(1)}°`;
    const metrics = ctx.measureText(text);
    const boxWidth = metrics.width + 20;
    const boxHeight = 30;

    const boxX = midPoint.x - boxWidth / 2;
    const boxY = midPoint.y - boxHeight / 2;

    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Draw text
    ctx.fillStyle = this.textColor;
    ctx.font = '12px Arial';
    ctx.fillText(text, boxX + 10, boxY + boxHeight / 2 + 4);
  }

  private convertPixelsToUnits(pixels: number, units: 'mm' | 'inches' | 'pixels'): number {
    // Assuming 96 DPI and 1 pixel = 1 unit at 100% zoom
    switch (units) {
      case 'mm':
        return pixels * 0.264583; // 96 DPI to mm conversion
      case 'inches':
        return pixels / 96; // 96 DPI
      case 'pixels':
      default:
        return pixels;
    }
  }

  isActive(): boolean {
    return this.active;
  }
}

export class RulerSystem {
  private horizontalRuler: Ruler;
  private verticalRuler: Ruler;
  private measurementTool: MeasurementTool;
  private units: 'mm' | 'inches' | 'pixels' = 'mm';
  private visible: boolean = true;

  constructor() {
    this.horizontalRuler = new Ruler('horizontal');
    this.verticalRuler = new Ruler('vertical');
    this.measurementTool = new MeasurementTool();
  }

  render(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
    if (!this.visible) return;

    // Render rulers
    this.horizontalRuler.render(ctx, viewport, this.units);
    this.verticalRuler.render(ctx, viewport, this.units);

    // Render measurement tool
    this.measurementTool.render(ctx, this.units);
  }

  showMeasurement(from: Point, to: Point): void {
    this.measurementTool.startMeasurement(from);
    this.measurementTool.updateMeasurement(to);
  }

  startMeasurement(point: Point): void {
    this.measurementTool.startMeasurement(point);
  }

  updateMeasurement(point: Point): void {
    this.measurementTool.updateMeasurement(point);
  }

  completeMeasurement(): MeasurementResult | null {
    return this.measurementTool.completeMeasurement();
  }

  cancelMeasurement(): void {
    this.measurementTool.cancel();
  }

  setUnits(units: 'mm' | 'inches' | 'pixels'): void {
    this.units = units;
  }

  getUnits(): 'mm' | 'inches' | 'pixels' {
    return this.units;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.horizontalRuler.setVisible(visible);
    this.verticalRuler.setVisible(visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  isMeasuring(): boolean {
    return this.measurementTool.isActive();
  }

  getRulerHeight(): number {
    return this.horizontalRuler.getHeight();
  }

  // Unit conversion utilities
  pixelsToMM(pixels: number): number {
    return pixels * 0.264583; // 96 DPI to mm conversion
  }

  pixelsToInches(pixels: number): number {
    return pixels / 96; // 96 DPI
  }

  mmToPixels(mm: number): number {
    return mm / 0.264583;
  }

  inchesToPixels(inches: number): number {
    return inches * 96;
  }
}