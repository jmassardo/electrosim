/**
 * Advanced Selection Manager for Professional Canvas Tools
 */

import { Point, Rectangle, CanvasComponent } from '../types';

export type SelectionMode = 'single' | 'multiple' | 'lasso' | 'rectangular';

export interface SelectionOptions {
  additive?: boolean;
  toggleMode?: boolean;
}

export class SelectionManager {
  private selectedComponents: Set<string> = new Set();
  private selectionMode: SelectionMode = 'single';
  private lassoPath: Point[] = [];
  private selectionRect: Rectangle | null = null;
  private selectionStartPoint: Point | null = null;
  private isSelecting: boolean = false;

  // Visual styling
  private selectionColor: string = '#007acc';
  private selectionFillColor: string = 'rgba(0, 122, 204, 0.1)';
  private lassoColor: string = '#ff6b35';
  private handleColor: string = '#ffffff';
  private handleBorderColor: string = '#007acc';

  startSelection(mode: SelectionMode, startPoint: Point, options: SelectionOptions = {}): void {
    this.selectionMode = mode;
    this.selectionStartPoint = startPoint;
    this.isSelecting = true;

    if (!options.additive && !options.toggleMode) {
      this.clearSelection();
    }

    switch (mode) {
      case 'rectangular':
        this.selectionRect = {
          x: startPoint.x,
          y: startPoint.y,
          width: 0,
          height: 0
        };
        break;
      case 'lasso':
        this.lassoPath = [startPoint];
        break;
    }
  }

  updateSelection(currentPoint: Point): void {
    if (!this.isSelecting || !this.selectionStartPoint) return;

    switch (this.selectionMode) {
      case 'rectangular':
        this.updateRectangularSelection(currentPoint);
        break;
      case 'lasso':
        this.updateLassoSelection(currentPoint);
        break;
    }
  }

  completeSelection(components: CanvasComponent[], options: SelectionOptions = {}): string[] {
    if (!this.isSelecting) return Array.from(this.selectedComponents);

    let selectedIds: string[] = [];

    switch (this.selectionMode) {
      case 'rectangular':
        selectedIds = this.getComponentsInRectangle(components);
        break;
      case 'lasso':
        selectedIds = this.getComponentsInLasso(components);
        break;
    }

    // Apply selection based on options
    if (options.toggleMode) {
      selectedIds.forEach(id => {
        if (this.selectedComponents.has(id)) {
          this.selectedComponents.delete(id);
        } else {
          this.selectedComponents.add(id);
        }
      });
    } else if (options.additive) {
      selectedIds.forEach(id => this.selectedComponents.add(id));
    } else {
      this.selectedComponents.clear();
      selectedIds.forEach(id => this.selectedComponents.add(id));
    }

    this.endSelection();
    return Array.from(this.selectedComponents);
  }

  private updateRectangularSelection(currentPoint: Point): void {
    if (!this.selectionStartPoint || !this.selectionRect) return;

    const minX = Math.min(this.selectionStartPoint.x, currentPoint.x);
    const minY = Math.min(this.selectionStartPoint.y, currentPoint.y);
    const maxX = Math.max(this.selectionStartPoint.x, currentPoint.x);
    const maxY = Math.max(this.selectionStartPoint.y, currentPoint.y);

    this.selectionRect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private updateLassoSelection(currentPoint: Point): void {
    this.lassoPath.push(currentPoint);
  }

  private getComponentsInRectangle(components: CanvasComponent[]): string[] {
    if (!this.selectionRect) return [];

    return components
      .filter(component => this.isComponentInRectangle(component, this.selectionRect!))
      .map(component => component.id);
  }

  private getComponentsInLasso(components: CanvasComponent[]): string[] {
    if (this.lassoPath.length < 3) return [];

    return components
      .filter(component => this.isComponentInLasso(component))
      .map(component => component.id);
  }

  private isComponentInRectangle(component: CanvasComponent, rect: Rectangle): boolean {
    const compRect = {
      x: component.position.x,
      y: component.position.y,
      width: component.boundingBox.width,
      height: component.boundingBox.height
    };

    return (
      compRect.x < rect.x + rect.width &&
      compRect.x + compRect.width > rect.x &&
      compRect.y < rect.y + rect.height &&
      compRect.y + compRect.height > rect.y
    );
  }

  private isComponentInLasso(component: CanvasComponent): boolean {
    const center = {
      x: component.position.x + component.boundingBox.width / 2,
      y: component.position.y + component.boundingBox.height / 2
    };

    return this.isPointInPolygon(center, this.lassoPath);
  }

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Selection manipulation methods
  addToSelection(componentId: string): void {
    this.selectedComponents.add(componentId);
  }

  removeFromSelection(componentId: string): void {
    this.selectedComponents.delete(componentId);
  }

  toggleSelection(componentId: string): void {
    if (this.selectedComponents.has(componentId)) {
      this.selectedComponents.delete(componentId);
    } else {
      this.selectedComponents.add(componentId);
    }
  }

  clearSelection(): void {
    this.selectedComponents.clear();
  }

  selectAll(components: CanvasComponent[]): void {
    this.selectedComponents.clear();
    components.forEach(component => {
      this.selectedComponents.add(component.id);
    });
  }

  selectByType(components: CanvasComponent[], type: string): void {
    components
      .filter(component => component.type === type)
      .forEach(component => this.selectedComponents.add(component.id));
  }

  invertSelection(components: CanvasComponent[]): void {
    const newSelection = new Set<string>();
    components.forEach(component => {
      if (!this.selectedComponents.has(component.id)) {
        newSelection.add(component.id);
      }
    });
    this.selectedComponents = newSelection;
  }

  // Query methods
  isSelected(componentId: string): boolean {
    return this.selectedComponents.has(componentId);
  }

  getSelectedComponents(): string[] {
    return Array.from(this.selectedComponents);
  }

  getSelectionCount(): number {
    return this.selectedComponents.size;
  }

  hasSelection(): boolean {
    return this.selectedComponents.size > 0;
  }

  getSelectionBounds(components: CanvasComponent[]): Rectangle | null {
    const selectedComponents = components.filter(c => this.isSelected(c.id));
    if (selectedComponents.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedComponents.forEach(component => {
      const left = component.position.x;
      const top = component.position.y;
      const right = left + component.boundingBox.width;
      const bottom = top + component.boundingBox.height;

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

  // Rendering methods
  renderSelectionIndicators(ctx: CanvasRenderingContext2D, components: CanvasComponent[]): void {
    const selectedComponents = components.filter(c => this.isSelected(c.id));
    
    selectedComponents.forEach(component => {
      this.renderComponentSelection(ctx, component);
    });

    // Render group selection handles if multiple components selected
    if (selectedComponents.length > 1) {
      this.renderGroupSelectionHandles(ctx, selectedComponents);
    }
  }

  renderSelectionBox(ctx: CanvasRenderingContext2D): void {
    if (!this.selectionRect || this.selectionMode !== 'rectangular') return;

    ctx.save();
    ctx.strokeStyle = this.selectionColor;
    ctx.fillStyle = this.selectionFillColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    ctx.fillRect(this.selectionRect.x, this.selectionRect.y, this.selectionRect.width, this.selectionRect.height);
    ctx.strokeRect(this.selectionRect.x, this.selectionRect.y, this.selectionRect.width, this.selectionRect.height);

    ctx.restore();
  }

  renderLassoSelection(ctx: CanvasRenderingContext2D): void {
    if (this.lassoPath.length < 2 || this.selectionMode !== 'lasso') return;

    ctx.save();
    ctx.strokeStyle = this.lassoColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(this.lassoPath[0].x, this.lassoPath[0].y);
    
    for (let i = 1; i < this.lassoPath.length; i++) {
      ctx.lineTo(this.lassoPath[i].x, this.lassoPath[i].y);
    }

    if (this.lassoPath.length > 2) {
      ctx.closePath();
      ctx.fillStyle = this.selectionFillColor.replace('0.1', '0.05');
      ctx.fill();
    }

    ctx.stroke();
    ctx.restore();
  }

  private renderComponentSelection(ctx: CanvasRenderingContext2D, component: CanvasComponent): void {
    ctx.save();
    ctx.strokeStyle = this.selectionColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    const bounds = {
      x: component.position.x - 2,
      y: component.position.y - 2,
      width: component.boundingBox.width + 4,
      height: component.boundingBox.height + 4
    };

    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Render selection handles for single selection
    if (this.selectedComponents.size === 1) {
      this.renderSelectionHandles(ctx, bounds);
    }

    ctx.restore();
  }

  private renderSelectionHandles(ctx: CanvasRenderingContext2D, bounds: Rectangle): void {
    const handleSize = 6;
    const handles = [
      { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2 }, // top-left
      { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2 }, // top-center
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2 }, // top-right
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2 }, // middle-right
      { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2 }, // bottom-right
      { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2 }, // bottom-center
      { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2 }, // bottom-left
      { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2 } // middle-left
    ];

    ctx.fillStyle = this.handleColor;
    ctx.strokeStyle = this.handleBorderColor;
    ctx.lineWidth = 1;

    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  }

  private renderGroupSelectionHandles(ctx: CanvasRenderingContext2D, components: CanvasComponent[]): void {
    const bounds = this.getSelectionBounds(components);
    if (!bounds) return;

    ctx.save();
    ctx.strokeStyle = this.selectionColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Draw group bounding box
    ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);

    // Draw corner handles only for group selection
    const handleSize = 8;
    const handles = [
      { x: bounds.x - 5 - handleSize/2, y: bounds.y - 5 - handleSize/2 },
      { x: bounds.x + bounds.width + 5 - handleSize/2, y: bounds.y - 5 - handleSize/2 },
      { x: bounds.x + bounds.width + 5 - handleSize/2, y: bounds.y + bounds.height + 5 - handleSize/2 },
      { x: bounds.x - 5 - handleSize/2, y: bounds.y + bounds.height + 5 - handleSize/2 }
    ];

    ctx.fillStyle = this.handleColor;
    ctx.strokeStyle = this.handleBorderColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });

    ctx.restore();
  }

  private endSelection(): void {
    this.isSelecting = false;
    this.selectionStartPoint = null;
    this.selectionRect = null;
    this.lassoPath = [];
  }

  // State query methods
  isCurrentlySelecting(): boolean {
    return this.isSelecting;
  }

  getSelectionMode(): SelectionMode {
    return this.selectionMode;
  }

  getLassoPath(): Point[] {
    return [...this.lassoPath];
  }

  getSelectionRect(): Rectangle | null {
    return this.selectionRect ? { ...this.selectionRect } : null;
  }

  // Cleanup
  dispose(): void {
    this.clearSelection();
    this.endSelection();
  }
}