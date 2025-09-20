/**
 * Unit tests for ResistorComponent
 */

import { ResistorComponent } from '../../../simulation/components/Resistor';
import { ComponentUpdateContext } from '../../../simulation/components/base/Component';

describe('ResistorComponent', () => {
  let resistor: ResistorComponent;
  const mockUpdateContext: ComponentUpdateContext = {
    currentTime: 100,
    deltaTime: 16.67,
    voltage: 5.0
  };

  beforeEach(() => {
    resistor = new ResistorComponent('test-resistor');
  });

  describe('Constructor and Initial State', () => {
    it('should initialize with correct default values', () => {
      expect(resistor.id).toBe('test-resistor');
      expect(resistor.type).toBe('resistor');
      expect(resistor.name).toBe('R_1000Ω');
      
      const pin1 = resistor.getPin('Pin 1');
      const pin2 = resistor.getPin('Pin 2');
      expect(pin1).toBeDefined();
      expect(pin2).toBeDefined();
    });

    it('should initialize with custom resistance value', () => {
      const customResistor = new ResistorComponent('custom-resistor', 470);
      expect(customResistor.properties.resistance).toBe(470);
      expect(customResistor.name).toBe('R_470Ω');
    });

    it('should have default resistance of 1000 ohms', () => {
      expect(resistor.properties.resistance).toBe(1000);
      expect(resistor.getResistance()).toBe(1000);
    });
  });

  describe('Resistance Management', () => {
    it('should get and set resistance correctly', () => {
      resistor.setResistance(220);
      expect(resistor.getResistance()).toBe(220);
      expect(resistor.properties.resistance).toBe(220);
    });

    it('should handle minimum resistance constraint', () => {
      resistor.setResistance(0.5); // Below minimum
      expect(resistor.getResistance()).toBe(1); // Should be clamped to 1 ohm
    });

    it('should handle negative resistance values', () => {
      resistor.setResistance(-100);
      expect(resistor.getResistance()).toBe(1); // Should be clamped to 1 ohm
    });

    it('should handle large resistance values', () => {
      resistor.setResistance(10000000); // 10M ohm
      expect(resistor.getResistance()).toBe(10000000);
    });
  });

  describe('Voltage and Current Calculations', () => {
    it('should calculate current correctly using Ohm\'s law', () => {
      resistor.setResistance(100);
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 3.0);
      
      resistor.update(mockUpdateContext);
      
      // Expected current: I = V/R = 2V / 100Ω = 0.02A
      const pin1Current = resistor.getPinCurrent('Pin 1');
      const pin2Current = resistor.getPinCurrent('Pin 2');
      
      expect(Math.abs(pin1Current)).toBeCloseTo(0.02, 4);
      expect(Math.abs(pin2Current)).toBeCloseTo(0.02, 4);
      expect(pin1Current).toBe(-pin2Current); // Currents should be opposite
    });

    it('should handle zero voltage difference', () => {
      resistor.setResistance(1000);
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 5.0);
      
      resistor.update(mockUpdateContext);
      
      const pin1Current = resistor.getPinCurrent('Pin 1');
      const pin2Current = resistor.getPinCurrent('Pin 2');
      
      expect(pin1Current).toBe(0);
      expect(pin2Current).toBe(0);
    });

    it('should handle current direction correctly', () => {
      resistor.setResistance(200);
      resistor.setPinVoltage('Pin 1', 2.0);
      resistor.setPinVoltage('Pin 2', 4.0);
      
      resistor.update(mockUpdateContext);
      
      const pin1Current = resistor.getPinCurrent('Pin 1');
      const pin2Current = resistor.getPinCurrent('Pin 2');
      
      // Current should flow from higher voltage (Pin 2) to lower voltage (Pin 1)
      expect(pin1Current).toBeGreaterThan(0); // Current flowing in
      expect(pin2Current).toBeLessThan(0);    // Current flowing out
    });
  });

  describe('Pin Voltage Management', () => {
    it('should manage pin voltages correctly', () => {
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 3.0);
      
      expect(resistor.getPinVoltage('Pin 1')).toBe(5.0);
      expect(resistor.getPinVoltage('Pin 2')).toBe(3.0);
    });

    it('should handle invalid pin names gracefully', () => {
      const voltage = resistor.getPinVoltage('NonExistentPin');
      expect(voltage).toBe(0); // Default voltage for non-existent pins
    });
  });

  describe('Power Consumption', () => {
    it('should calculate power consumption correctly', () => {
      resistor.setResistance(100);
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 3.0);
      
      resistor.update(mockUpdateContext);
      
      const power = resistor.getPowerConsumption();
      // P = V²/R = (2V)² / 100Ω = 0.04W
      expect(power).toBeCloseTo(0.04, 4);
    });

    it('should handle zero power consumption', () => {
      resistor.setResistance(1000);
      resistor.setPinVoltage('Pin 1', 0);
      resistor.setPinVoltage('Pin 2', 0);
      
      resistor.update(mockUpdateContext);
      
      const power = resistor.getPowerConsumption();
      expect(power).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should validate properly configured resistor', () => {
      resistor.setResistance(470);
      const errors = resistor.validate();
      expect(errors.length).toBe(0);
    });

    it('should report errors for invalid resistance values', () => {
      resistor.setResistance(0); // This sets rawResistance to 0 but clamps working value
      const errors = resistor.validate(); // Should validate against rawResistance
      expect(errors.some(error => error.includes('greater than 0'))).toBe(true);
    });

    it('should validate resistance range', () => {
      resistor.setResistance(100000000); // 100M ohm - out of practical range
      const errors = resistor.validate();
      expect(errors.some(error => error.includes('practical range'))).toBe(true);
    });

    it('should validate very small resistance', () => {
      const smallResistor = new ResistorComponent('small', 0.5);
      const errors = smallResistor.validate();
      expect(errors.some(error => error.includes('practical range'))).toBe(true);
    });
  });

  describe('Render Data', () => {
    it('should provide render data for visualization', () => {
      resistor.setResistance(470);
      
      const renderData = resistor.getRenderData();
      
      expect(renderData.id).toBe('test-resistor');
      expect(renderData.type).toBe('resistor');
      expect(renderData.resistance).toBe(470);
      expect(renderData.color).toBeDefined();
      expect(Array.isArray(renderData.color)).toBe(true);
      expect(renderData.width).toBe(40);
      expect(renderData.height).toBe(15);
    });

    it('should include pin information', () => {
      const renderData = resistor.getRenderData();
      
      expect(renderData.pins).toBeDefined();
      expect(Array.isArray(renderData.pins)).toBe(true);
      expect(renderData.pins.length).toBe(2);
    });

    it('should include power rating', () => {
      const renderData = resistor.getRenderData();
      
      expect(renderData.powerRating).toBeDefined();
      expect(renderData.powerRating).toBe('1/4W');
    });
  });

  describe('Color Code', () => {
    it('should provide correct color codes for different values', () => {
      const testCases = [
        { resistance: 220, expectedLength: 3 },
        { resistance: 1000, expectedLength: 3 },
        { resistance: 10000, expectedLength: 3 },
        { resistance: 1000000, expectedLength: 3 }
      ];

      testCases.forEach(({ resistance, expectedLength }) => {
        resistor.setResistance(resistance);
        const renderData = resistor.getRenderData();
        
        expect(renderData.color.length).toBe(expectedLength);
        expect(Array.isArray(renderData.color)).toBe(true);
      });
    });
  });

  describe('Component Information', () => {
    it('should provide component information', () => {
      resistor.setResistance(470);
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 3.0);
      resistor.update(mockUpdateContext);
      
      const info = resistor.getInfo();
      
      expect(info.id).toBe('test-resistor');
      expect(info.type).toBe('resistor');
      expect(info.resistance).toBe('470Ω');
      expect(info.componentType).toBe('Passive Component');
      expect(info.description).toBeDefined();
      expect(info.powerConsumption).toBeDefined();
    });
  });

  describe('Reset and State Management', () => {
    it('should reset to initial state', () => {
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 2.0);
      resistor.update(mockUpdateContext);
      
      resistor.reset();
      
      expect(resistor.getPinVoltage('Pin 1')).toBe(0);
      expect(resistor.getPinVoltage('Pin 2')).toBe(0);
      expect(resistor.getPinCurrent('Pin 1')).toBe(0);
      expect(resistor.getPinCurrent('Pin 2')).toBe(0);
    });

    it('should maintain component properties after reset', () => {
      const originalResistance = resistor.getResistance();
      const originalId = resistor.id;
      
      resistor.reset();
      
      expect(resistor.id).toBe(originalId);
      expect(resistor.getResistance()).toBe(originalResistance);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high voltage differences', () => {
      resistor.setResistance(1);
      resistor.setPinVoltage('Pin 1', 1000);
      resistor.setPinVoltage('Pin 2', 0);
      
      resistor.update(mockUpdateContext);
      
      const current = Math.abs(resistor.getPinCurrent('Pin 1'));
      expect(current).toBe(1000); // I = V/R = 1000V / 1Ω = 1000A
    });

    it('should handle very high resistance values', () => {
      resistor.setResistance(1000000);
      resistor.setPinVoltage('Pin 1', 5.0);
      resistor.setPinVoltage('Pin 2', 0);
      
      resistor.update(mockUpdateContext);
      
      const current = Math.abs(resistor.getPinCurrent('Pin 1'));
      expect(current).toBeCloseTo(0.000005, 8); // I = 5V / 1MΩ = 5µA
    });
  });
});