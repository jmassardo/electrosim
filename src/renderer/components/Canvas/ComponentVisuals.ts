/**
 * Component Visual Renderers
 */
import { ComponentVisual, CanvasComponent, Point, Rectangle, PinDefinition } from './types';

/**
 * Base class for component visuals
 */
abstract class BaseComponentVisual implements ComponentVisual {
  abstract render(ctx: CanvasRenderingContext2D, component: CanvasComponent): void;
  
  hitTest(point: Point, component: CanvasComponent): boolean {
    const bounds = this.getBoundingBox(component);
    return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }

  abstract getPinPosition(pinName: string, component: CanvasComponent): Point;
  abstract getBoundingBox(component: CanvasComponent): Rectangle;

  protected drawSelectionHighlight(ctx: CanvasRenderingContext2D, bounds: Rectangle): void {
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
    
    // Draw selection handles
    const handleSize = 6;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(bounds.x - handleSize/2, bounds.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(bounds.x + bounds.width - handleSize/2, bounds.y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(bounds.x - handleSize/2, bounds.y + bounds.height - handleSize/2, handleSize, handleSize);
    ctx.fillRect(bounds.x + bounds.width - handleSize/2, bounds.y + bounds.height - handleSize/2, handleSize, handleSize);
    ctx.restore();
  }

  protected drawPins(ctx: CanvasRenderingContext2D, component: CanvasComponent): void {
    component.pins.forEach(pin => {
      const pinPos = this.getPinPosition(pin.name, component);
      
      ctx.save();
      ctx.fillStyle = this.getPinColor(pin);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.arc(pinPos.x, pinPos.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  private getPinColor(pin: PinDefinition): string {
    switch (pin.type) {
      case 'power': return '#ef4444';
      case 'ground': return '#374151';
      case 'input': return '#22c55e';
      case 'output': return '#3b82f6';
      default: return '#6b7280';
    }
  }
}

/**
 * Arduino Uno board visual
 */
export class ArduinoUnoVisual extends BaseComponentVisual {
  render(ctx: CanvasRenderingContext2D, component: CanvasComponent): void {
    const { x, y } = component.position;
    const width = 80;
    const height = 50;
    
    ctx.save();
    
    // Board body
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(x - width/2, y - height/2, width, height);
    
    // Board outline
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - width/2, y - height/2, width, height);
    
    // USB connector
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(x - width/2 - 6, y - 8, 8, 16);
    
    // Power jack
    ctx.fillStyle = '#374151';
    ctx.fillRect(x - width/2 - 8, y + 8, 8, 8);
    
    // Reset button
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(x - width/2 + 10, y - height/2 + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Power LED
    const powerLed = component.properties.powerOn ? '#22c55e' : '#374151';
    ctx.fillStyle = powerLed;
    ctx.beginPath();
    ctx.arc(x - width/2 + 20, y - height/2 + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Built-in LED (pin 13)
    const pin13Led = component.properties.pin13 ? '#ef4444' : '#7f1d1d';
    ctx.fillStyle = pin13Led;
    ctx.beginPath();
    ctx.arc(x + width/2 - 10, y - height/2 + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Arduino Uno', x, y + 8);
    
    // Draw pins if component is selected or always show them
    this.drawPins(ctx, component);
    
    // Selection highlight
    if (component.selected) {
      this.drawSelectionHighlight(ctx, this.getBoundingBox(component));
    }
    
    ctx.restore();
  }

  getPinPosition(pinName: string, component: CanvasComponent): Point {
    const { x, y } = component.position;
    const width = 80;
    const height = 50;
    
    // Digital pins on the right side
    if (pinName.startsWith('D')) {
      const pinNum = parseInt(pinName.substring(1));
      const pinY = y - height/2 + 10 + (pinNum * 4);
      return { x: x + width/2, y: Math.min(pinY, y + height/2 - 5) };
    }
    
    // Analog pins on the left side
    if (pinName.startsWith('A')) {
      const pinNum = parseInt(pinName.substring(1));
      const pinY = y - height/2 + 10 + (pinNum * 6);
      return { x: x - width/2, y: Math.min(pinY, y + height/2 - 5) };
    }
    
    // Power pins
    switch (pinName) {
      case 'VCC':
      case '5V':
        return { x: x - width/2, y: y - height/2 + 5 };
      case 'GND':
        return { x: x - width/2, y: y + height/2 - 5 };
      case '3V3':
        return { x: x + width/2, y: y - height/2 + 5 };
      default:
        return { x, y };
    }
  }

  getBoundingBox(component: CanvasComponent): Rectangle {
    const { x, y } = component.position;
    return { x: x - 40, y: y - 25, width: 80, height: 50 };
  }
}

/**
 * LED component visual
 */
export class LEDVisual extends BaseComponentVisual {
  render(ctx: CanvasRenderingContext2D, component: CanvasComponent): void {
    const { x, y } = component.position;
    const radius = 12;
    const color = component.properties.color || 'red';
    const isOn = component.properties.isOn || false;
    const brightness = component.properties.brightness || 1.0;
    
    ctx.save();
    
    // LED body
    ctx.fillStyle = isOn ? color : '#f3f4f6';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Glow effect when on
    if (isOn && brightness > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `${color}${Math.floor(brightness * 100).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Anode and cathode legs
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Anode (positive) - longer leg
    ctx.beginPath();
    ctx.moveTo(x - 3, y + radius);
    ctx.lineTo(x - 3, y + radius + 15);
    ctx.stroke();
    
    // Cathode (negative) - shorter leg
    ctx.beginPath();
    ctx.moveTo(x + 3, y + radius);
    ctx.lineTo(x + 3, y + radius + 10);
    ctx.stroke();
    
    // Pin labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', x - 3, y + radius + 22);
    ctx.fillText('-', x + 3, y + radius + 18);
    
    // Draw pins
    this.drawPins(ctx, component);
    
    // Selection highlight
    if (component.selected) {
      this.drawSelectionHighlight(ctx, this.getBoundingBox(component));
    }
    
    ctx.restore();
  }

  getPinPosition(pinName: string, component: CanvasComponent): Point {
    const { x, y } = component.position;
    switch (pinName) {
      case 'anode':
      case '+':
        return { x: x - 3, y: y + 12 + 15 };
      case 'cathode':
      case '-':
        return { x: x + 3, y: y + 12 + 10 };
      default:
        return { x, y };
    }
  }

  getBoundingBox(component: CanvasComponent): Rectangle {
    const { x, y } = component.position;
    return { x: x - 15, y: y - 15, width: 30, height: 40 };
  }
}

/**
 * Resistor component visual
 */
export class ResistorVisual extends BaseComponentVisual {
  render(ctx: CanvasRenderingContext2D, component: CanvasComponent): void {
    const { x, y } = component.position;
    const width = 40;
    const height = 12;
    const value = component.properties.value || '220';
    const unit = component.properties.unit || 'Ω';
    
    ctx.save();
    
    // Resistor body
    ctx.fillStyle = '#f3e8ff';
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.fillRect(x - width/2, y - height/2, width, height);
    ctx.strokeRect(x - width/2, y - height/2, width, height);
    
    // Color bands (simplified)
    this.drawColorBands(ctx, x, y, width, height, value);
    
    // Leads
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x - width/2, y);
    ctx.lineTo(x - width/2 - 10, y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + width/2, y);
    ctx.lineTo(x + width/2 + 10, y);
    ctx.stroke();
    
    // Value label
    ctx.fillStyle = '#374151';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${value}${unit}`, x, y - height/2 - 2);
    
    // Draw pins
    this.drawPins(ctx, component);
    
    // Selection highlight
    if (component.selected) {
      this.drawSelectionHighlight(ctx, this.getBoundingBox(component));
    }
    
    ctx.restore();
  }

  private drawColorBands(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, value: string): void {
    // Simplified color band representation
    const bands = ['#8B4513', '#FF0000', '#000000', '#FFD700']; // Brown, Red, Black, Gold
    const bandWidth = 3;
    const startX = x - width/2 + 8;
    
    bands.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(startX + index * 6, y - height/2, bandWidth, height);
    });
  }

  getPinPosition(pinName: string, component: CanvasComponent): Point {
    const { x, y } = component.position;
    switch (pinName) {
      case 'pin1':
      case 'left':
        return { x: x - 30, y };
      case 'pin2':
      case 'right':
        return { x: x + 30, y };
      default:
        return { x, y };
    }
  }

  getBoundingBox(component: CanvasComponent): Rectangle {
    const { x, y } = component.position;
    return { x: x - 30, y: y - 8, width: 60, height: 16 };
  }
}

/**
 * Push button component visual
 */
export class PushButtonVisual extends BaseComponentVisual {
  render(ctx: CanvasRenderingContext2D, component: CanvasComponent): void {
    const { x, y } = component.position;
    const size = 20;
    const isPressed = component.properties.isPressed || false;
    
    ctx.save();
    
    // Button body
    ctx.fillStyle = isPressed ? '#e5e7eb' : '#f9fafb';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.fillRect(x - size/2, y - size/2, size, size);
    ctx.strokeRect(x - size/2, y - size/2, size, size);
    
    // Button top
    const buttonTop = isPressed ? 2 : 0;
    ctx.fillStyle = isPressed ? '#d1d5db' : '#ffffff';
    ctx.fillRect(x - size/2 + 3, y - size/2 + 3 + buttonTop, size - 6, size - 6);
    ctx.strokeRect(x - size/2 + 3, y - size/2 + 3 + buttonTop, size - 6, size - 6);
    
    // Pins
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Four pins
    const pinLength = 8;
    const positions = [
      { x: x - size/2, y: y - 5, dx: -pinLength, dy: 0 }, // Left top
      { x: x - size/2, y: y + 5, dx: -pinLength, dy: 0 }, // Left bottom
      { x: x + size/2, y: y - 5, dx: pinLength, dy: 0 },  // Right top
      { x: x + size/2, y: y + 5, dx: pinLength, dy: 0 }   // Right bottom
    ];
    
    positions.forEach(pos => {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + pos.dx, pos.y + pos.dy);
      ctx.stroke();
    });
    
    // Draw pins
    this.drawPins(ctx, component);
    
    // Selection highlight
    if (component.selected) {
      this.drawSelectionHighlight(ctx, this.getBoundingBox(component));
    }
    
    ctx.restore();
  }

  getPinPosition(pinName: string, component: CanvasComponent): Point {
    const { x, y } = component.position;
    const size = 20;
    
    switch (pinName) {
      case 'pin1':
        return { x: x - size/2 - 8, y: y - 5 };
      case 'pin2':
        return { x: x - size/2 - 8, y: y + 5 };
      case 'pin3':
        return { x: x + size/2 + 8, y: y - 5 };
      case 'pin4':
        return { x: x + size/2 + 8, y: y + 5 };
      default:
        return { x, y };
    }
  }

  getBoundingBox(component: CanvasComponent): Rectangle {
    const { x, y } = component.position;
    return { x: x - 18, y: y - 12, width: 36, height: 24 };
  }
}

/**
 * Component visual factory
 */
export class ComponentVisualFactory {
  private static visuals: Map<string, ComponentVisual> = new Map();

  static {
    ComponentVisualFactory.visuals.set('arduino-uno', new ArduinoUnoVisual());
    ComponentVisualFactory.visuals.set('led', new LEDVisual());
    ComponentVisualFactory.visuals.set('resistor', new ResistorVisual());
    ComponentVisualFactory.visuals.set('button', new PushButtonVisual());
  }

  static getVisual(componentType: string): ComponentVisual | null {
    return ComponentVisualFactory.visuals.get(componentType) || null;
  }

  static registerVisual(componentType: string, visual: ComponentVisual): void {
    ComponentVisualFactory.visuals.set(componentType, visual);
  }
}