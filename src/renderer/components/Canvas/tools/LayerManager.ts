/**
 * Layer Management System for Professional Canvas Tools
 */

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  components: string[];
  wires: string[];
  color?: string;
  order: number;
}

export interface LayerEvent {
  type: 'created' | 'deleted' | 'updated' | 'reordered';
  layerId: string;
  layer?: Layer;
}

export type LayerEventListener = (event: LayerEvent) => void;

export class LayerManager {
  private layers: Map<string, Layer> = new Map();
  private activeLayerId: string = 'default';
  private nextLayerId: number = 1;
  private eventListeners: LayerEventListener[] = [];

  constructor() {
    // Create default layer
    this.createLayer('Components', true);
    this.activeLayerId = 'default';
  }

  // Layer creation and management
  createLayer(name: string, setAsActive: boolean = false): Layer {
    const layer: Layer = {
      id: this.activeLayerId === 'default' ? 'default' : `layer_${this.nextLayerId++}`,
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      components: [],
      wires: [],
      color: this.generateLayerColor(),
      order: this.layers.size
    };

    this.layers.set(layer.id, layer);

    if (setAsActive) {
      this.activeLayerId = layer.id;
    }

    this.notifyListeners({
      type: 'created',
      layerId: layer.id,
      layer
    });

    return layer;
  }

  deleteLayer(layerId: string): boolean {
    if (layerId === 'default') {
      throw new Error('Cannot delete default layer');
    }

    const layer = this.layers.get(layerId);
    if (!layer) return false;

    // Move components and wires to default layer
    const defaultLayer = this.layers.get('default');
    if (defaultLayer) {
      defaultLayer.components.push(...layer.components);
      defaultLayer.wires.push(...layer.wires);
    }

    this.layers.delete(layerId);

    // If deleted layer was active, switch to default
    if (this.activeLayerId === layerId) {
      this.activeLayerId = 'default';
    }

    // Reorder remaining layers
    this.reorderLayers();

    this.notifyListeners({
      type: 'deleted',
      layerId
    });

    return true;
  }

  duplicateLayer(layerId: string): Layer | null {
    const sourceLayer = this.layers.get(layerId);
    if (!sourceLayer) return null;

    const newLayer = this.createLayer(`${sourceLayer.name} Copy`);
    
    // Copy properties (but not components/wires)
    newLayer.opacity = sourceLayer.opacity;
    if (sourceLayer.color !== undefined) {
      newLayer.color = sourceLayer.color;
    }
    
    return newLayer;
  }

  // Layer properties
  updateLayer(layerId: string, updates: Partial<Omit<Layer, 'id' | 'components' | 'wires'>>): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    Object.assign(layer, updates);

    this.notifyListeners({
      type: 'updated',
      layerId,
      layer
    });

    return true;
  }

  setLayerVisibility(layerId: string, visible: boolean): boolean {
    return this.updateLayer(layerId, { visible });
  }

  setLayerLocked(layerId: string, locked: boolean): boolean {
    return this.updateLayer(layerId, { locked });
  }

  setLayerOpacity(layerId: string, opacity: number): boolean {
    return this.updateLayer(layerId, { opacity: Math.max(0, Math.min(1, opacity)) });
  }

  setLayerName(layerId: string, name: string): boolean {
    return this.updateLayer(layerId, { name });
  }

  setLayerColor(layerId: string, color: string): boolean {
    return this.updateLayer(layerId, { color });
  }

  // Component and wire management
  moveToLayer(itemId: string, targetLayerId: string, itemType: 'component' | 'wire' = 'component'): boolean {
    const targetLayer = this.layers.get(targetLayerId);
    if (!targetLayer) return false;

    // Remove from current layer
    this.layers.forEach(layer => {
      if (itemType === 'component') {
        const index = layer.components.indexOf(itemId);
        if (index !== -1) {
          layer.components.splice(index, 1);
        }
      } else {
        const index = layer.wires.indexOf(itemId);
        if (index !== -1) {
          layer.wires.splice(index, 1);
        }
      }
    });

    // Add to target layer
    if (itemType === 'component') {
      targetLayer.components.push(itemId);
    } else {
      targetLayer.wires.push(itemId);
    }

    return true;
  }

  addComponentToLayer(componentId: string, layerId?: string): boolean {
    const targetLayerId = layerId || this.activeLayerId;
    return this.moveToLayer(componentId, targetLayerId, 'component');
  }

  addWireToLayer(wireId: string, layerId?: string): boolean {
    const targetLayerId = layerId || this.activeLayerId;
    return this.moveToLayer(wireId, targetLayerId, 'wire');
  }

  removeComponentFromLayer(componentId: string): boolean {
    let removed = false;
    this.layers.forEach(layer => {
      const index = layer.components.indexOf(componentId);
      if (index !== -1) {
        layer.components.splice(index, 1);
        removed = true;
      }
    });
    return removed;
  }

  removeWireFromLayer(wireId: string): boolean {
    let removed = false;
    this.layers.forEach(layer => {
      const index = layer.wires.indexOf(wireId);
      if (index !== -1) {
        layer.wires.splice(index, 1);
        removed = true;
      }
    });
    return removed;
  }

  // Layer ordering
  moveLayerUp(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer || layer.order === 0) return false;

    // Find layer above
    const layerAbove = Array.from(this.layers.values())
      .find(l => l.order === layer.order - 1);

    if (layerAbove) {
      layerAbove.order = layer.order;
      layer.order = layer.order - 1;
      this.notifyReorder();
      return true;
    }

    return false;
  }

  moveLayerDown(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    const maxOrder = Math.max(...Array.from(this.layers.values()).map(l => l.order));
    
    if (!layer || layer.order === maxOrder) return false;

    // Find layer below
    const layerBelow = Array.from(this.layers.values())
      .find(l => l.order === layer.order + 1);

    if (layerBelow) {
      layerBelow.order = layer.order;
      layer.order = layer.order + 1;
      this.notifyReorder();
      return true;
    }

    return false;
  }

  moveLayerToOrder(layerId: string, newOrder: number): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const oldOrder = layer.order;
    const layers = Array.from(this.layers.values()).sort((a, b) => a.order - b.order);

    // Adjust orders
    layers.forEach(l => {
      if (l.id === layerId) {
        l.order = newOrder;
      } else if (oldOrder < newOrder && l.order > oldOrder && l.order <= newOrder) {
        l.order--;
      } else if (oldOrder > newOrder && l.order >= newOrder && l.order < oldOrder) {
        l.order++;
      }
    });

    this.notifyReorder();
    return true;
  }

  private reorderLayers(): void {
    const layers = Array.from(this.layers.values()).sort((a, b) => a.order - b.order);
    layers.forEach((layer, index) => {
      layer.order = index;
    });
  }

  // Active layer management
  getActiveLayer(): Layer | null {
    return this.layers.get(this.activeLayerId) || null;
  }

  setActiveLayer(layerId: string): boolean {
    if (this.layers.has(layerId)) {
      this.activeLayerId = layerId;
      return true;
    }
    return false;
  }

  getActiveLayerId(): string {
    return this.activeLayerId;
  }

  // Query methods
  getLayer(layerId: string): Layer | null {
    return this.layers.get(layerId) || null;
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.order - b.order);
  }

  getVisibleLayers(): Layer[] {
    return this.getAllLayers().filter(layer => layer.visible);
  }

  getLayerByComponent(componentId: string): Layer | null {
    for (const layer of this.layers.values()) {
      if (layer.components.includes(componentId)) {
        return layer;
      }
    }
    return null;
  }

  getLayerByWire(wireId: string): Layer | null {
    for (const layer of this.layers.values()) {
      if (layer.wires.includes(wireId)) {
        return layer;
      }
    }
    return null;
  }

  getLayersContaining(itemIds: string[], itemType: 'component' | 'wire' = 'component'): Layer[] {
    return Array.from(this.layers.values()).filter(layer => {
      const items = itemType === 'component' ? layer.components : layer.wires;
      return itemIds.some(id => items.includes(id));
    });
  }

  // Batch operations
  setMultipleLayersVisibility(layerIds: string[], visible: boolean): void {
    layerIds.forEach(layerId => {
      this.setLayerVisibility(layerId, visible);
    });
  }

  lockMultipleLayers(layerIds: string[], locked: boolean): void {
    layerIds.forEach(layerId => {
      this.setLayerLocked(layerId, locked);
    });
  }

  // Utility methods
  private generateLayerColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#10AC84', '#EE5A6F', '#C44569', '#F8B500', '#786FA6'
    ];
    
    const usedColors = Array.from(this.layers.values()).map(l => l.color);
    const availableColors = colors.filter(color => !usedColors.includes(color));
    
    return availableColors.length > 0 
      ? availableColors[0] 
      : colors[Math.floor(Math.random() * colors.length)];
  }

  isLayerEmpty(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    return layer ? layer.components.length === 0 && layer.wires.length === 0 : true;
  }

  getLayerStats(): { [layerId: string]: { components: number; wires: number } } {
    const stats: { [layerId: string]: { components: number; wires: number } } = {};
    
    this.layers.forEach((layer, layerId) => {
      stats[layerId] = {
        components: layer.components.length,
        wires: layer.wires.length
      };
    });
    
    return stats;
  }

  // Event management
  addEventListener(listener: LayerEventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: LayerEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private notifyListeners(event: LayerEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Layer event listener error:', error);
      }
    });
  }

  private notifyReorder(): void {
    this.notifyListeners({
      type: 'reordered',
      layerId: ''
    });
  }

  // Serialization
  exportLayers(): any {
    return {
      layers: Array.from(this.layers.entries()).map(([, layer]) => layer),
      activeLayerId: this.activeLayerId
    };
  }

  importLayers(data: any): boolean {
    try {
      this.layers.clear();
      
      data.layers.forEach((layerData: any) => {
        const { id, ...layer } = layerData;
        this.layers.set(id, layer);
      });
      
      this.activeLayerId = data.activeLayerId || 'default';
      
      // Ensure default layer exists
      if (!this.layers.has('default')) {
        this.createLayer('Components');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import layers:', error);
      return false;
    }
  }

  // Cleanup
  dispose(): void {
    this.eventListeners.length = 0;
    this.layers.clear();
  }
}