/**
 * Smart Wire Routing System with A* Pathfinding
 */

import { Point, Rectangle, CanvasComponent } from '../types';

export interface PathNode {
  point: Point;
  gScore: number;
  fScore: number;
  parent?: PathNode;
}

export interface RoutingOptions {
  gridSize?: number;
  avoidComponents?: boolean;
  preferOrthogonal?: boolean;
  cornerRadius?: number;
  minimumClearance?: number;
}

export class RoutingGrid {
  private gridSize: number;
  private obstacleMap: boolean[][];
  private width: number;
  private height: number;

  constructor(gridSize: number = 10) {
    this.gridSize = gridSize;
    this.obstacleMap = [];
    this.width = 0;
    this.height = 0;
  }

  createGrid(canvasSize: { width: number; height: number }, obstacles: Rectangle[]): void {
    this.width = Math.ceil(canvasSize.width / this.gridSize);
    this.height = Math.ceil(canvasSize.height / this.gridSize);
    
    // Initialize grid as passable
    this.obstacleMap = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
    
    // Mark obstacles
    obstacles.forEach(obstacle => {
      this.markObstacle(obstacle);
    });
  }

  private markObstacle(obstacle: Rectangle): void {
    const startX = Math.max(0, Math.floor(obstacle.x / this.gridSize));
    const startY = Math.max(0, Math.floor(obstacle.y / this.gridSize));
    const endX = Math.min(this.width - 1, Math.ceil((obstacle.x + obstacle.width) / this.gridSize));
    const endY = Math.min(this.height - 1, Math.ceil((obstacle.y + obstacle.height) / this.gridSize));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (this.obstacleMap[y]) {
          this.obstacleMap[y][x] = true;
        }
      }
    }
  }

  isPassable(point: Point): boolean {
    const gridX = Math.floor(point.x / this.gridSize);
    const gridY = Math.floor(point.y / this.gridSize);
    
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return false;
    }
    
    return !this.obstacleMap[gridY][gridX];
  }

  snapToGrid(point: Point): Point {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize
    };
  }

  getNeighbors(point: Point, preferOrthogonal: boolean = true): Point[] {
    const neighbors: Point[] = [];
    const directions = preferOrthogonal 
      ? [
          { x: 0, y: -this.gridSize }, // North
          { x: this.gridSize, y: 0 },  // East
          { x: 0, y: this.gridSize },  // South
          { x: -this.gridSize, y: 0 }, // West
        ]
      : [
          { x: 0, y: -this.gridSize },      // North
          { x: this.gridSize, y: -this.gridSize }, // Northeast
          { x: this.gridSize, y: 0 },       // East
          { x: this.gridSize, y: this.gridSize },  // Southeast
          { x: 0, y: this.gridSize },       // South
          { x: -this.gridSize, y: this.gridSize }, // Southwest
          { x: -this.gridSize, y: 0 },      // West
          { x: -this.gridSize, y: -this.gridSize }, // Northwest
        ];

    directions.forEach(dir => {
      const neighbor = {
        x: point.x + dir.x,
        y: point.y + dir.y
      };
      
      if (this.isPassable(neighbor)) {
        neighbors.push(neighbor);
      }
    });

    return neighbors;
  }

  getGridSize(): number {
    return this.gridSize;
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}

export class AStarRouter {
  private routingGrid: RoutingGrid;

  constructor(routingGrid: RoutingGrid) {
    this.routingGrid = routingGrid;
  }

  findPath(start: Point, goal: Point, options: RoutingOptions = {}): Point[] {
    const snappedStart = this.routingGrid.snapToGrid(start);
    const snappedGoal = this.routingGrid.snapToGrid(goal);
    
    if (this.isEqual(snappedStart, snappedGoal)) {
      return [start, goal];
    }

    const openSet: PathNode[] = [{
      point: snappedStart,
      gScore: 0,
      fScore: this.heuristic(snappedStart, snappedGoal, options.preferOrthogonal)
    }];
    
    const closedSet: Set<string> = new Set();
    const gScoreMap: Map<string, number> = new Map();
    gScoreMap.set(this.pointToKey(snappedStart), 0);

    while (openSet.length > 0) {
      // Get node with lowest fScore
      const current = openSet.reduce((min, node) => 
        node.fScore < min.fScore ? node : min
      );

      if (this.isEqual(current.point, snappedGoal)) {
        return this.reconstructPath(current, start, goal);
      }

      // Remove current from open set
      const currentIndex = openSet.indexOf(current);
      openSet.splice(currentIndex, 1);
      closedSet.add(this.pointToKey(current.point));

      // Check neighbors
      const neighbors = this.routingGrid.getNeighbors(
        current.point, 
        options.preferOrthogonal ?? true
      );
      
      for (const neighbor of neighbors) {
        const neighborKey = this.pointToKey(neighbor);
        
        if (closedSet.has(neighborKey)) {
          continue;
        }

        const tentativeGScore = current.gScore + this.distance(current.point, neighbor, options.preferOrthogonal);
        const currentGScore = gScoreMap.get(neighborKey) ?? Infinity;

        if (tentativeGScore < currentGScore) {
          gScoreMap.set(neighborKey, tentativeGScore);
          
          let neighborNode = openSet.find(n => this.isEqual(n.point, neighbor));
          if (!neighborNode) {
            neighborNode = {
              point: neighbor,
              gScore: tentativeGScore,
              fScore: tentativeGScore + this.heuristic(neighbor, snappedGoal, options.preferOrthogonal),
              parent: current
            };
            openSet.push(neighborNode);
          } else {
            neighborNode.gScore = tentativeGScore;
            neighborNode.fScore = tentativeGScore + this.heuristic(neighbor, snappedGoal, options.preferOrthogonal);
            neighborNode.parent = current;
          }
        }
      }
    }

    // No path found, return direct line
    return [start, goal];
  }

  private heuristic(a: Point, b: Point, preferOrthogonal: boolean = true): number {
    if (preferOrthogonal) {
      // Manhattan distance for orthogonal routing
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    } else {
      // Euclidean distance
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  private distance(a: Point, b: Point, preferOrthogonal: boolean = true): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    
    if (preferOrthogonal) {
      // Penalize diagonal movement
      if (dx > 0 && dy > 0) {
        return dx + dy + 0.4 * Math.min(dx, dy); // Slight diagonal penalty
      }
      return dx + dy;
    } else {
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  private reconstructPath(goalNode: PathNode, originalStart: Point, originalGoal: Point): Point[] {
    const path: Point[] = [];
    let current: PathNode | undefined = goalNode;
    
    while (current) {
      path.unshift(current.point);
      current = current.parent;
    }
    
    // Replace first and last points with original positions
    if (path.length > 0) {
      path[0] = originalStart;
      path[path.length - 1] = originalGoal;
    }
    
    return path;
  }

  private pointToKey(point: Point): string {
    return `${point.x},${point.y}`;
  }

  private isEqual(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }
}

export class WireOptimizer {
  optimizePath(path: Point[], options: RoutingOptions = {}): Point[] {
    if (path.length < 3) return path;
    
    let optimized = this.removeCollinearPoints(path);
    
    if (options.preferOrthogonal) {
      optimized = this.addOrthogonalPoints(optimized);
    }
    
    if (options.cornerRadius && options.cornerRadius > 0) {
      optimized = this.addCornerRounding(optimized, options.cornerRadius);
    }
    
    return optimized;
  }

  private removeCollinearPoints(path: Point[]): Point[] {
    if (path.length < 3) return path;
    
    const optimized: Point[] = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = optimized[optimized.length - 1];
      const current = path[i];
      const next = path[i + 1];
      
      if (!this.isCollinear(prev, current, next)) {
        optimized.push(current);
      }
    }
    
    optimized.push(path[path.length - 1]);
    return optimized;
  }

  private isCollinear(a: Point, b: Point, c: Point): boolean {
    const epsilon = 1e-10;
    const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y));
    return area < epsilon;
  }

  private addOrthogonalPoints(path: Point[]): Point[] {
    if (path.length < 2) return path;
    
    const orthogonal: Point[] = [path[0]];
    
    for (let i = 1; i < path.length; i++) {
      const prev = orthogonal[orthogonal.length - 1];
      const current = path[i];
      
      // If not orthogonal, add intermediate point
      if (prev.x !== current.x && prev.y !== current.y) {
        // Choose intermediate point to minimize total length
        const option1 = { x: prev.x, y: current.y };
        const option2 = { x: current.x, y: prev.y };
        
        const dist1 = this.calculateDistance(prev, option1) + this.calculateDistance(option1, current);
        const dist2 = this.calculateDistance(prev, option2) + this.calculateDistance(option2, current);
        
        orthogonal.push(dist1 <= dist2 ? option1 : option2);
      }
      
      orthogonal.push(current);
    }
    
    return orthogonal;
  }

  private addCornerRounding(path: Point[], radius: number): Point[] {
    if (path.length < 3) return path;
    
    const rounded: Point[] = [];
    
    for (let i = 0; i < path.length; i++) {
      if (i === 0 || i === path.length - 1) {
        // Keep first and last points unchanged
        rounded.push(path[i]);
      } else {
        const prev = path[i - 1];
        const current = path[i];
        const next = path[i + 1];
        
        // Add rounded corner
        const cornerPoints = this.createRoundedCorner(prev, current, next, radius);
        rounded.push(...cornerPoints);
      }
    }
    
    return rounded;
  }

  private createRoundedCorner(prev: Point, corner: Point, next: Point, radius: number): Point[] {
    // Simplified corner rounding - creates a small arc
    const d1 = this.calculateDistance(prev, corner);
    const d2 = this.calculateDistance(corner, next);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    
    if (r < 1) return [corner];
    
    // Calculate points before and after the corner
    const t1 = r / d1;
    const t2 = r / d2;
    
    const p1 = {
      x: corner.x + t1 * (prev.x - corner.x),
      y: corner.y + t1 * (prev.y - corner.y)
    };
    
    const p2 = {
      x: corner.x + t2 * (next.x - corner.x),
      y: corner.y + t2 * (next.y - corner.y)
    };
    
    // For simplicity, return the corner points
    // In a full implementation, you'd add arc points between p1 and p2
    return [p1, p2];
  }

  private calculateDistance(a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class SmartWireRouter {
  private routingGrid: RoutingGrid;
  private aStarRouter: AStarRouter;
  private wireOptimizer: WireOptimizer;
  private obstacles: Rectangle[] = [];

  constructor(gridSize: number = 10) {
    this.routingGrid = new RoutingGrid(gridSize);
    this.aStarRouter = new AStarRouter(this.routingGrid);
    this.wireOptimizer = new WireOptimizer();
  }

  updateObstacles(components: CanvasComponent[], minimumClearance: number = 5): void {
    this.obstacles = components.map(component => ({
      x: component.position.x - minimumClearance,
      y: component.position.y - minimumClearance,
      width: component.boundingBox.width + 2 * minimumClearance,
      height: component.boundingBox.height + 2 * minimumClearance
    }));
  }

  findOptimalPath(from: Point, to: Point, options: RoutingOptions = {}): Point[] {
    // Update routing grid with current obstacles
    const canvasSize = { width: 2000, height: 2000 }; // Should be passed from canvas
    this.routingGrid.createGrid(canvasSize, this.obstacles);
    
    // Find path using A*
    const path = this.aStarRouter.findPath(from, to, options);
    
    // Optimize the path
    return this.wireOptimizer.optimizePath(path, options);
  }

  optimizeExistingWires(wires: Array<{ path: Point[] }>, options: RoutingOptions = {}): Array<Point[]> {
    return wires.map(wire => this.wireOptimizer.optimizePath(wire.path, options));
  }

  avoidComponents(components: CanvasComponent[]): void {
    this.updateObstacles(components, 10);
  }

  // Utility methods for wire management
  calculateWireLength(path: Point[]): number {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  findWireIntersections(paths: Point[][]): Array<{ path1: number; path2: number; point: Point }> {
    const intersections: Array<{ path1: number; path2: number; point: Point }> = [];
    
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const pathIntersections = this.findPathIntersections(paths[i], paths[j]);
        pathIntersections.forEach(point => {
          intersections.push({ path1: i, path2: j, point });
        });
      }
    }
    
    return intersections;
  }

  private findPathIntersections(path1: Point[], path2: Point[]): Point[] {
    const intersections: Point[] = [];
    
    for (let i = 0; i < path1.length - 1; i++) {
      for (let j = 0; j < path2.length - 1; j++) {
        const intersection = this.lineIntersection(
          path1[i], path1[i + 1],
          path2[j], path2[j + 1]
        );
        
        if (intersection) {
          intersections.push(intersection);
        }
      }
    }
    
    return intersections;
  }

  private lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denominator) < 1e-10) {
      return null; // Lines are parallel
    }
    
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denominator;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denominator;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      };
    }
    
    return null; // No intersection
  }

  // Grid management
  setGridSize(size: number): void {
    this.routingGrid = new RoutingGrid(size);
    this.aStarRouter = new AStarRouter(this.routingGrid);
  }

  getGridSize(): number {
    return this.routingGrid.getGridSize();
  }
}