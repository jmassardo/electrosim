import { Component, Pin, ComponentUpdateContext } from '../../../../../src/simulation/components/base/Component';

// Create a concrete test implementation of the abstract Component class
class TestComponent extends Component {
  public updateCalled = false;
  public resetCalled = false;

  constructor(id: string) {
    super(id, 'test', `TEST_${id}`, [
      { id: 'pin1', name: 'Pin 1', number: 1, type: 'digital', direction: 'input' },
      { id: 'pin2', name: 'Pin 2', number: 2, type: 'analog', direction: 'output' }
    ]);
  }

  update(context: ComponentUpdateContext): void {
    this.updateCalled = true;
  }

  reset(): void {
    this.resetCalled = true;
  }

  getRenderData(): any {
    return { type: this.type, position: this.position };
  }

  validate(): string[] {
    return [];
  }
}

describe('Component Base Class', () => {
  let component: TestComponent;

  beforeEach(() => {
    component = new TestComponent('test-comp');
  });

  describe('Constructor', () => {
    test('should initialize component with basic properties', () => {
      expect(component.id).toBe('test-comp');
      expect(component.type).toBe('test');
      expect(component.name).toBe('TEST_test-comp');
      expect(component.properties).toEqual({});
      expect(component.position).toEqual({ x: 0, y: 0, rotation: 0 });
      expect(component.metadata).toEqual({});
    });

    test('should initialize pins correctly', () => {
      expect(component.pins.size).toBe(2);
      
      const pin1 = component.pins.get('Pin 1');
      expect(pin1).toBeDefined();
      expect(pin1).toEqual({
        id: 'pin1',
        name: 'Pin 1', 
        number: 1,
        type: 'digital',
        direction: 'input',
        voltage: 0,
        current: 0,
        connected: false
      });

      const pin2 = component.pins.get('Pin 2');
      expect(pin2).toBeDefined();
      expect(pin2).toEqual({
        id: 'pin2',
        name: 'Pin 2',
        number: 2,
        type: 'analog',
        direction: 'output',
        voltage: 0,
        current: 0,
        connected: false
      });
    });
  });

  describe('Pin Management', () => {
    test('should get pin by name', () => {
      const pin = component.getPin('Pin 1');
      expect(pin).toBeDefined();
      expect(pin?.name).toBe('Pin 1');
    });

    test('should return undefined for non-existent pin', () => {
      const pin = component.getPin('Non-existent Pin');
      expect(pin).toBeUndefined();
    });

    test('should set and get pin voltage', () => {
      component.setPinVoltage('Pin 1', 3.3);
      expect(component.getPinVoltage('Pin 1')).toBe(3.3);
    });

    test('should return 0 voltage for non-existent pin', () => {
      expect(component.getPinVoltage('Non-existent Pin')).toBe(0);
    });

    test('should set and get pin current', () => {
      component.setPinCurrent('Pin 2', 0.02); // 20mA
      expect(component.getPinCurrent('Pin 2')).toBe(0.02);
    });

    test('should return 0 current for non-existent pin', () => {
      expect(component.getPinCurrent('Non-existent Pin')).toBe(0);
    });
  });

  describe('Pin Connection Management', () => {
    test('should connect pin to another component', () => {
      component.connectPin('Pin 1', 'connection-123');
      
      const pin = component.getPin('Pin 1');
      expect(pin?.connected).toBe(true);
      expect(pin?.connectionId).toBe('connection-123');
    });

    test('should disconnect pin', () => {
      // First connect
      component.connectPin('Pin 1', 'connection-123');
      expect(component.getPin('Pin 1')?.connected).toBe(true);
      
      // Then disconnect
      component.disconnectPin('Pin 1');
      const pin = component.getPin('Pin 1');
      expect(pin?.connected).toBe(false);
      expect(pin?.connectionId).toBeUndefined();
    });

    test('should handle connection operations on non-existent pins gracefully', () => {
      expect(() => component.connectPin('Non-existent Pin', 'conn-1')).not.toThrow();
      expect(() => component.disconnectPin('Non-existent Pin')).not.toThrow();
    });
  });

  describe('Position and Properties', () => {
    test('should allow position modification', () => {
      component.position = { x: 100, y: 200, rotation: 45 };
      expect(component.position).toEqual({ x: 100, y: 200, rotation: 45 });
    });

    test('should allow properties modification', () => {
      component.properties.resistance = '1k';
      component.properties.tolerance = '5%';
      
      expect(component.properties.resistance).toBe('1k');
      expect(component.properties.tolerance).toBe('5%');
    });

    test('should allow metadata modification', () => {
      component.metadata.partNumber = 'ABC123';
      component.metadata.manufacturer = 'Test Corp';
      
      expect(component.metadata.partNumber).toBe('ABC123');
      expect(component.metadata.manufacturer).toBe('Test Corp');
    });
  });

  describe('Abstract Method Implementation', () => {
    test('should call update method', () => {
      const context: ComponentUpdateContext = {
        deltaTime: 16.67,
        currentTime: 1000,
        voltage: 5.0
      };

      component.update(context);
      expect(component.updateCalled).toBe(true);
    });

    test('should call reset method', () => {
      component.reset();
      expect(component.resetCalled).toBe(true);
    });

    test('should provide render data', () => {
      const renderData = component.getRenderData();
      expect(renderData).toEqual({
        type: 'test',
        position: { x: 0, y: 0, rotation: 0 }
      });
    });

    test('should validate component', () => {
      const errors = component.validate();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(0);
    });
  });

  describe('Power Consumption', () => {
    test('should calculate power consumption from pin currents and voltages', () => {
      // Set up some voltage and current values
      component.setPinVoltage('Pin 1', 5.0);
      component.setPinCurrent('Pin 1', 0.01); // 10mA
      
      component.setPinVoltage('Pin 2', 3.3);
      component.setPinCurrent('Pin 2', 0.005); // 5mA

      const power = component.getPowerConsumption();
      
      // Power = V * I for each pin
      // Pin 1: 5V * 0.01A = 0.05W
      // Pin 2: 3.3V * 0.005A = 0.0165W
      // Total: 0.0665W
      expect(power).toBeCloseTo(0.0665, 4);
    });

    test('should return 0 power consumption for no current flow', () => {
      const power = component.getPowerConsumption();
      expect(power).toBe(0);
    });
  });

  describe('Pin State Queries', () => {
    test('should report all pins', () => {
      const allPins = Array.from(component.pins.values());
      expect(allPins).toHaveLength(2);
      expect(allPins[0].name).toBe('Pin 1');
      expect(allPins[1].name).toBe('Pin 2');
    });

    test('should report connected pins', () => {
      component.connectPin('Pin 1', 'conn-1');
      
      const connectedPins = Array.from(component.pins.values()).filter(pin => pin.connected);
      expect(connectedPins).toHaveLength(1);
      expect(connectedPins[0].name).toBe('Pin 1');
    });

    test('should report pins by type', () => {
      const digitalPins = Array.from(component.pins.values()).filter(pin => pin.type === 'digital');
      const analogPins = Array.from(component.pins.values()).filter(pin => pin.type === 'analog');
      
      expect(digitalPins).toHaveLength(1);
      expect(analogPins).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle voltage setting on non-existent pins gracefully', () => {
      expect(() => component.setPinVoltage('Non-existent', 5.0)).not.toThrow();
    });

    test('should handle current setting on non-existent pins gracefully', () => {
      expect(() => component.setPinCurrent('Non-existent', 0.1)).not.toThrow();
    });

    test('should handle extreme voltage values', () => {
      component.setPinVoltage('Pin 1', -100);
      expect(component.getPinVoltage('Pin 1')).toBe(-100);
      
      component.setPinVoltage('Pin 1', 1000);
      expect(component.getPinVoltage('Pin 1')).toBe(1000);
    });

    test('should handle extreme current values', () => {
      component.setPinCurrent('Pin 1', -5);
      expect(component.getPinCurrent('Pin 1')).toBe(-5);
      
      component.setPinCurrent('Pin 1', 100);
      expect(component.getPinCurrent('Pin 1')).toBe(100);
    });
  });
});