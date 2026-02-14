/**
 * Drag and Drop Handler for Canvas Components
 */
import { Point, DragData, CanvasComponent } from './types';

export interface DragDropEvents {
  onComponentDragStart?: (componentType: string, mousePos: Point) => void;
  onComponentDrop?: (componentType: string, position: Point) => CanvasComponent | null;
  onComponentMove?: (componentId: string, newPos: Point) => void;
}

export class DragDropHandler {
  private isDragging: boolean = false;
  private dragData: DragData | null = null;
  private dragOffset: Point = { x: 0, y: 0 };
  private events: DragDropEvents;

  constructor(events: DragDropEvents = {}) {
    this.events = events;
  }

  /**
   * Start dragging a component from the library
   */
  onLibraryComponentDragStart(componentType: string, mousePos: Point): void {
    this.isDragging = true;
    this.dragData = {
      componentType,
      sourceLibrary: true
    };
    
    this.events.onComponentDragStart?.(componentType, mousePos);
  }

  /**
   * Start dragging an existing component on the canvas
   */
  onCanvasComponentDragStart(componentId: string, component: CanvasComponent, mousePos: Point): void {
    this.isDragging = true;
    this.dragData = {
      componentType: component.type,
      sourceLibrary: false,
      originalPosition: { ...component.position }
    };
    
    // Calculate drag offset to maintain relative position
    this.dragOffset = {
      x: mousePos.x - component.position.x,
      y: mousePos.y - component.position.y
    };
  }

  /**
   * Update drag position
   */
  onDragMove(mousePos: Point): Point {
    if (!this.isDragging || !this.dragData) {
      return mousePos;
    }

    // Return adjusted position accounting for drag offset
    return {
      x: mousePos.x - this.dragOffset.x,
      y: mousePos.y - this.dragOffset.y
    };
  }

  /**
   * Handle drag over canvas
   */
  onDragOver(mousePos: Point): boolean {
    return this.isDragging;
  }

  /**
   * Complete the drag operation
   */
  onDrop(mousePos: Point): CanvasComponent | null {
    if (!this.isDragging || !this.dragData) {
      return null;
    }

    let result: CanvasComponent | null = null;
    const dropPosition = this.onDragMove(mousePos);

    if (this.dragData.sourceLibrary) {
      // Dropping from component library
      result = this.events.onComponentDrop?.(this.dragData.componentType, dropPosition) || null;
    } else {
      // Moving existing component
      // This will be handled by the canvas component management
      result = null;
    }

    this.isDragging = false;
    this.dragData = null;
    this.dragOffset = { x: 0, y: 0 };

    return result;
  }

  /**
   * Cancel the current drag operation
   */
  cancelDrag(): void {
    this.isDragging = false;
    this.dragData = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  /**
   * Check if currently dragging
   */
  isDraggingComponent(): boolean {
    return this.isDragging;
  }

  /**
   * Get current drag data
   */
  getDragData(): DragData | null {
    return this.dragData;
  }

  /**
   * Set up HTML5 drag and drop events for component palette items
   */
  setupLibraryComponentDrag(element: HTMLElement, componentType: string): void {
    element.draggable = true;
    
    element.addEventListener('dragstart', (event) => {
      if (event.dataTransfer) {
        event.dataTransfer.setData('application/component', componentType);
        event.dataTransfer.effectAllowed = 'copy';
      }
      
      const mousePos = { x: event.clientX, y: event.clientY };
      this.onLibraryComponentDragStart(componentType, mousePos);
    });

    element.addEventListener('dragend', () => {
      this.cancelDrag();
    });
  }

  /**
   * Set up drop zone for canvas
   */
  setupCanvasDropZone(canvasElement: HTMLElement, onComponentDrop: (type: string, pos: Point) => void): void {
    canvasElement.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'copy';
    });

    canvasElement.addEventListener('drop', (event) => {
      event.preventDefault();
      
      const componentType = event.dataTransfer!.getData('application/component');
      if (componentType) {
        const rect = canvasElement.getBoundingClientRect();
        const dropPosition = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        
        onComponentDrop(componentType, dropPosition);
      }
      
      this.cancelDrag();
    });
  }
}