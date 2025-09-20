export interface Point {
  x: number;
  y: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Canvas coordinate transformation utilities
 */
export class CanvasTransform {
  private transform: ViewportTransform;

  constructor(transform: ViewportTransform = { x: 0, y: 0, scale: 1 }) {
    this.transform = { ...transform };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPoint: Point): Point {
    return {
      x: (screenPoint.x - this.transform.x) / this.transform.scale,
      y: (screenPoint.y - this.transform.y) / this.transform.scale
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPoint: Point): Point {
    return {
      x: worldPoint.x * this.transform.scale + this.transform.x,
      y: worldPoint.y * this.transform.scale + this.transform.y
    };
  }

  /**
   * Apply the transform to a canvas context
   */
  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.scale, this.transform.scale);
  }

  /**
   * Restore the canvas context
   */
  restoreContext(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  /**
   * Update the transform
   */
  setTransform(transform: Partial<ViewportTransform>): void {
    this.transform = { ...this.transform, ...transform };
  }

  /**
   * Get the current transform
   */
  getTransform(): ViewportTransform {
    return { ...this.transform };
  }

  /**
   * Zoom to a specific point
   */
  zoomToPoint(point: Point, scaleFactor: number): void {
    const worldPoint = this.screenToWorld(point);
    this.transform.scale *= scaleFactor;
    
    // Keep the point under the mouse cursor
    const newScreenPoint = this.worldToScreen(worldPoint);
    this.transform.x += point.x - newScreenPoint.x;
    this.transform.y += point.y - newScreenPoint.y;
  }

  /**
   * Pan the viewport
   */
  pan(delta: Point): void {
    this.transform.x += delta.x;
    this.transform.y += delta.y;
  }

  /**
   * Reset the transform to default
   */
  reset(): void {
    this.transform = { x: 0, y: 0, scale: 1 };
  }

  /**
   * Fit content to viewport
   */
  fitToViewport(contentBounds: BoundingBox, viewportSize: Point, padding: number = 50): void {
    const contentWidth = contentBounds.width;
    const contentHeight = contentBounds.height;
    
    if (contentWidth === 0 || contentHeight === 0) {
      this.reset();
      return;
    }

    const scaleX = (viewportSize.x - padding * 2) / contentWidth;
    const scaleY = (viewportSize.y - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    this.transform.scale = scale;
    this.transform.x = (viewportSize.x - contentWidth * scale) / 2 - contentBounds.x * scale;
    this.transform.y = (viewportSize.y - contentHeight * scale) / 2 - contentBounds.y * scale;
  }
}

/**
 * Grid utilities
 */
export class GridUtils {
  static snapToGrid(point: Point, gridSize: number): Point {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }

  static drawGrid(
    ctx: CanvasRenderingContext2D,
    transform: ViewportTransform,
    canvasSize: Point,
    gridSize: number = 20,
    color: string = '#e5e7eb',
    lineWidth: number = 1
  ): void {
    const canvasTransform = new CanvasTransform(transform);
    
    // Calculate visible grid bounds with some padding
    const padding = gridSize * 2;
    const topLeft = canvasTransform.screenToWorld({ x: -padding, y: -padding });
    const bottomRight = canvasTransform.screenToWorld({ 
      x: canvasSize.x + padding, 
      y: canvasSize.y + padding 
    });

    const startX = Math.floor(topLeft.x / gridSize) * gridSize;
    const endX = Math.ceil(bottomRight.x / gridSize) * gridSize;
    const startY = Math.floor(topLeft.y / gridSize) * gridSize;
    const endY = Math.ceil(bottomRight.y / gridSize) * gridSize;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth / transform.scale;
    ctx.globalAlpha = Math.min(1, Math.max(0.3, transform.scale));

    canvasTransform.applyToContext(ctx);

    // Draw vertical lines
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    ctx.stroke();

    // Draw horizontal lines
    ctx.beginPath();
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    canvasTransform.restoreContext(ctx);
  }
}

/**
 * Mouse event utilities
 */
export class MouseUtils {
  static getMousePosition(event: MouseEvent, element: HTMLElement): Point {
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  static getWheelDelta(event: WheelEvent): number {
    // Normalize wheel delta across browsers
    if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      return -event.deltaY / 100;
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return -event.deltaY / 3;
    } else {
      return -event.deltaY;
    }
  }
}

/**
 * Distance and collision utilities
 */
export class GeometryUtils {
  static distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static pointInRect(point: Point, rect: BoundingBox): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  static rectIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}