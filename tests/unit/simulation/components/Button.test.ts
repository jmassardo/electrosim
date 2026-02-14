import { ButtonComponent } from '../../../../src/simulation/components/Button';

describe('ButtonComponent', () => {
  let button: ButtonComponent;

  beforeEach(() => {
    button = new ButtonComponent('test-btn');
  });

  describe('Constructor', () => {
    test('should create button with default normally open configuration', () => {
      expect(button.id).toBe('test-btn');
      expect(button.type).toBe('button');
      expect(button.name).toBe('BTN_test-btn');
      expect(button.properties.normallyOpen).toBe(true);
      expect(button.properties.debounceTime).toBe(50);
      expect(button.properties.type).toBe('momentary');
    });

    test('should create normally closed button when specified', () => {
      const ncButton = new ButtonComponent('test-nc', false);
      expect(ncButton.properties.normallyOpen).toBe(false);
    });

    test('should have correct pin configuration', () => {
      const pins = Array.from(button.pins.values());
      expect(pins).toHaveLength(2);
      
      expect(pins[0]).toEqual({
        id: 'pin1',
        name: 'Pin 1',
        number: 1,
        type: 'digital',
        direction: 'bidirectional',
        voltage: 0,
        current: 0,
        connected: false
      });
      
      expect(pins[1]).toEqual({
        id: 'pin2',
        name: 'Pin 2',
        number: 2,
        type: 'digital',
        direction: 'bidirectional',
        voltage: 0,
        current: 0,
        connected: false
      });
    });
  });

  describe('Button State Management', () => {
    test('should start in unpressed state', () => {
      expect(button.isCurrentlyPressed()).toBe(false);
    });

    test('should respond to press action', () => {
      button.press();
      expect(button.isCurrentlyPressed()).toBe(true);
    });

    test('should respond to release action', () => {
      button.press();
      expect(button.isCurrentlyPressed()).toBe(true);
      
      button.release();
      expect(button.isCurrentlyPressed()).toBe(false);
    });

    test('should toggle state correctly', () => {
      expect(button.isCurrentlyPressed()).toBe(false);
      
      button.toggle();
      expect(button.isCurrentlyPressed()).toBe(true);
      
      button.toggle();
      expect(button.isCurrentlyPressed()).toBe(false);
    });
  });

  describe('Debounce Functionality', () => {
    test('should debounce rapid button presses', () => {
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      // First press should work
      button.press();
      expect(button.isCurrentlyPressed()).toBe(true);
      
      // Release the button
      button.release();
      expect(button.isCurrentlyPressed()).toBe(false);

      // Move time forward by only 25ms (within debounce window of 50ms)
      mockTime += 25; 
      
      // Try to press again - this should be debounced
      button.press();
      expect(button.isCurrentlyPressed()).toBe(false);

      Date.now = originalDateNow;
    });

    test('should allow press after debounce time has passed', () => {
      const originalDateNow = Date.now;
      let mockTime = 1000;
      Date.now = jest.fn(() => mockTime);

      button.press();
      button.release();
      
      // Wait beyond debounce time
      mockTime += 100; // 100ms later, beyond 50ms debounce
      button.press();
      expect(button.isCurrentlyPressed()).toBe(true);

      Date.now = originalDateNow;
    });
  });

  describe('Component Update', () => {
    test('should handle update context', () => {
      const context = {
        deltaTime: 16.67,
        currentTime: 1000,
        voltage: 5.0
      };

      expect(() => button.update(context)).not.toThrow();
    });
  });

  describe('Property Management', () => {
    test('should allow debounce time configuration', () => {
      button.setDebounceTime(100);
      expect(button.properties.debounceTime).toBe(100);
    });

    test('should allow normally open/closed configuration', () => {
      button.setNormallyOpen(false);
      expect(button.properties.normallyOpen).toBe(false);
    });

    test('should validate property values', () => {
      button.setDebounceTime(-10);
      expect(button.properties.debounceTime).toBe(0);
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON correctly', () => {
      button.setDebounceTime(100);
      button.press();
      
      const serialized = button.serialize();
      
      expect(serialized).toMatchObject({
        id: 'test-btn',
        type: 'button',
        name: 'BTN_test-btn',
        properties: {
          normallyOpen: true,
          debounceTime: 100,
          type: 'momentary'
        }
      });
    });

    test('should deserialize from JSON correctly', () => {
      const jsonData = {
        id: 'restored-btn',
        type: 'button',
        name: 'BTN_restored-btn',
        properties: {
          normallyOpen: false,
          debounceTime: 75,
          type: 'momentary'
        },
        position: { x: 100, y: 200, rotation: 0 },
        metadata: {}
      };

      button.deserialize(jsonData);
      
      expect(button.name).toBe('BTN_restored-btn');
      expect(button.properties.normallyOpen).toBe(false);
      expect(button.properties.debounceTime).toBe(75);
    });
  });
});