/**
 * Component Alignment Tools for Professional Canvas Design
 */

import { Point, Rectangle, CanvasComponent } from '../types';

export interface AlignmentOptions {
  includeWires?: boolean;
  preserveSpacing?: boolean;
  alignToGrid?: boolean;
}

export class AlignmentTools {
  private gridSize: number = 10;

  setGridSize(size: number): void {
    this.gridSize = size;
  }

  // Alignment methods
  alignLeft(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 2) return;

    const leftmostX = Math.min(...components.map(c => c.position.x));
    
    components.forEach(component => {
      component.position.x = options.alignToGrid ? 
        this.snapToGrid(leftmostX) : leftmostX;
    });
  }

  alignCenter(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 2) return;

    const bounds = this.getBoundingBox(components);
    const centerX = bounds.x + bounds.width / 2;
    
    components.forEach(component => {
      const componentBounds = component.boundingBox;
      const targetX = centerX - componentBounds.width / 2;
      component.position.x = options.alignToGrid ? 
        this.snapToGrid(targetX) : targetX;
    });
  }

  alignRight(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 2) return;

    const rightmostX = Math.max(...components.map(c => c.position.x + c.boundingBox.width));
    
    components.forEach(component => {
      const targetX = rightmostX - component.boundingBox.width;
      component.position.x = options.alignToGrid ? 
        this.snapToGrid(targetX) : targetX;
    });
  }

  alignTop(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 2) return;

    const topmostY = Math.min(...components.map(c => c.position.y));
    
    components.forEach(component => {
      component.position.y = options.alignToGrid ? 
        this.snapToGrid(topmostY) : topmostY;
    });
  }

  alignMiddle(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 2) return;

    const bounds = this.getBoundingBox(components);
    const centerY = bounds.y + bounds.height / 2;
    
    components.forEach(component => {
      const componentBounds = component.boundingBox;
      const targetY = centerY - componentBounds.height / 2;
      component.position.y = options.alignToGrid ? 
        this.snapToGrid(targetY) : targetY;
    });
  }

  alignBottom(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 2) return;

    const bottommostY = Math.max(...components.map(c => c.position.y + c.boundingBox.height));
    
    components.forEach(component => {
      const targetY = bottommostY - component.boundingBox.height;
      component.position.y = options.alignToGrid ? 
        this.snapToGrid(targetY) : targetY;
    });
  }

  // Distribution methods
  distributeHorizontally(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 3) return;

    const sorted = this.sortComponentsByPosition(components, 'x');
    const leftmost = sorted[0];
    const rightmost = sorted[sorted.length - 1];
    
    const totalSpace = (rightmost.position.x + rightmost.boundingBox.width) - leftmost.position.x;
    const totalComponentWidth = sorted.reduce((sum, c) => sum + c.boundingBox.width, 0);
    const availableSpace = totalSpace - totalComponentWidth;
    const spacing = availableSpace / (sorted.length - 1);

    let currentX = leftmost.position.x + leftmost.boundingBox.width;

    for (let i = 1; i < sorted.length - 1; i++) {
      const component = sorted[i];
      const targetX = currentX + spacing;
      component.position.x = options.alignToGrid ? 
        this.snapToGrid(targetX) : targetX;
      currentX = targetX + component.boundingBox.width;
    }
  }

  distributeVertically(components: CanvasComponent[], options: AlignmentOptions = {}): void {
    if (components.length < 3) return;

    const sorted = this.sortComponentsByPosition(components, 'y');
    const topmost = sorted[0];
    const bottommost = sorted[sorted.length - 1];
    
    const totalSpace = (bottommost.position.y + bottommost.boundingBox.height) - topmost.position.y;
    const totalComponentHeight = sorted.reduce((sum, c) => sum + c.boundingBox.height, 0);
    const availableSpace = totalSpace - totalComponentHeight;
    const spacing = availableSpace / (sorted.length - 1);

    let currentY = topmost.position.y + topmost.boundingBox.height;

    for (let i = 1; i < sorted.length - 1; i++) {
      const component = sorted[i];
      const targetY = currentY + spacing;
      component.position.y = options.alignToGrid ? 
        this.snapToGrid(targetY) : targetY;
      currentY = targetY + component.boundingBox.height;
    }
  }

  // Advanced alignment methods
  alignToGrid(components: CanvasComponent[]): void {
    components.forEach(component => {
      component.position.x = this.snapToGrid(component.position.x);
      component.position.y = this.snapToGrid(component.position.y);
    });
  }

  distributeSpacing(components: CanvasComponent[], spacing: number, axis: 'x' | 'y'): void {
    if (components.length < 2) return;

    const sorted = this.sortComponentsByPosition(components, axis);
    
    if (axis === 'x') {
      let currentX = sorted[0].position.x;
      sorted.forEach((component, index) => {
        if (index > 0) {
          currentX += spacing;
          component.position.x = currentX;
        }
        currentX += component.boundingBox.width;
      });
    } else {
      let currentY = sorted[0].position.y;
      sorted.forEach((component, index) => {
        if (index > 0) {
          currentY += spacing;
          component.position.y = currentY;
        }
        currentY += component.boundingBox.height;
      });
    }
  }

  // Utility methods
  private getBoundingBox(components: CanvasComponent[]): Rectangle {
    if (components.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    components.forEach(component => {
      const bounds = component.boundingBox;
      const left = component.position.x;
      const top = component.position.y;
      const right = left + bounds.width;
      const bottom = top + bounds.height;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private sortComponentsByPosition(components: CanvasComponent[], axis: 'x' | 'y'): CanvasComponent[] {
    return [...components].sort((a, b) => {
      if (axis === 'x') {
        return a.position.x - b.position.x;
      } else {
        return a.position.y - b.position.y;
      }
    });
  }

  private snapToGrid(value: number): number {
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  // Preview methods for UI feedback
  getAlignmentPreview(components: CanvasComponent[], operation: AlignmentOperation): Point[] {
    const preview: Point[] = [];
    const tempComponents = components.map(c => ({ ...c }));

    switch (operation) {
      case 'align-left':
        this.alignLeft(tempComponents);
        break;
      case 'align-center':
        this.alignCenter(tempComponents);
        break;
      case 'align-right':
        this.alignRight(tempComponents);
        break;
      case 'align-top':
        this.alignTop(tempComponents);
        break;
      case 'align-middle':
        this.alignMiddle(tempComponents);
        break;
      case 'align-bottom':
        this.alignBottom(tempComponents);
        break;
      case 'distribute-horizontal':
        this.distributeHorizontally(tempComponents);
        break;
      case 'distribute-vertical':
        this.distributeVertically(tempComponents);
        break;
    }

    return tempComponents.map(c => c.position);
  }

  renderAlignmentGuides(ctx: CanvasRenderingContext2D, components: CanvasComponent[], operation: AlignmentOperation): void {
    if (components.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#007acc';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const bounds = this.getBoundingBox(components);

    switch (operation) {
      case 'align-left':
        this.drawVerticalLine(ctx, bounds.x);
        break;
      case 'align-center':
        this.drawVerticalLine(ctx, bounds.x + bounds.width / 2);
        break;
      case 'align-right':
        this.drawVerticalLine(ctx, bounds.x + bounds.width);
        break;
      case 'align-top':
        this.drawHorizontalLine(ctx, bounds.y);
        break;
      case 'align-middle':
        this.drawHorizontalLine(ctx, bounds.y + bounds.height / 2);
        break;
      case 'align-bottom':
        this.drawHorizontalLine(ctx, bounds.y + bounds.height);
        break;
    }

    ctx.restore();
  }

  private drawVerticalLine(ctx: CanvasRenderingContext2D, x: number): void {
    ctx.beginPath();
    ctx.moveTo(x, -10000);
    ctx.lineTo(x, 10000);
    ctx.stroke();
  }

  private drawHorizontalLine(ctx: CanvasRenderingContext2D, y: number): void {
    ctx.beginPath();
    ctx.moveTo(-10000, y);
    ctx.lineTo(10000, y);
    ctx.stroke();
  }
}

export type AlignmentOperation = 
  | 'align-left'
  | 'align-center' 
  | 'align-right'
  | 'align-top'
  | 'align-middle'
  | 'align-bottom'
  | 'distribute-horizontal'
  | 'distribute-vertical';