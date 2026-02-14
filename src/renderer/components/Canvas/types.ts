/**
 * Type definitions for canvas component integration
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface PinLocation {
  componentId: string;
  pinName: string;
  position: Point;
  type: 'input' | 'output' | 'power' | 'ground';
}

export interface Wire {
  id: string;
  fromComponent: string;
  fromPin: string;
  toComponent: string;
  toPin: string;
  path: Point[];
  voltage?: number;
  current?: number;
}

export interface CanvasComponent {
  id: string;
  type: string;
  position: Point;
  rotation: number;
  properties: { [key: string]: any };
  pins: PinDefinition[];
  boundingBox: Rectangle;
  selected: boolean;
}

export interface PinDefinition {
  name: string;
  position: Point;
  type: 'input' | 'output' | 'power' | 'ground';
  voltage?: number;
  current?: number;
}

export interface ComponentVisual {
  render(ctx: CanvasRenderingContext2D, component: CanvasComponent): void;
  hitTest(point: Point, component: CanvasComponent): boolean;
  getPinPosition(pinName: string, component: CanvasComponent): Point;
  getBoundingBox(component: CanvasComponent): Rectangle;
}

export interface DragData {
  componentType: string;
  sourceLibrary: boolean;
  originalPosition?: Point;
}

export interface CanvasState {
  components: CanvasComponent[];
  wires: Wire[];
  selectedItems: string[];
  viewTransform: Transform;
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  isDragging: boolean;
  lastMousePos: Point | null;
  isWiring: boolean;
  wireStartPin?: PinLocation;
  previewWire?: Point[];
}

export interface CircuitSolution {
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  timestamp: number;
}