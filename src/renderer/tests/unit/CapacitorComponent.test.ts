/**
 * Unit tests for CapacitorComponent
 */

import { CapacitorComponent } from '../../../simulation/components/Capacitor';
import { ComponentUpdateContext } from '../../../simulation/components/base/Component';

describe('CapacitorComponent', () => {
  let capacitor: CapacitorComponent;
  const mockUpdateContext: ComponentUpdateContext = {
    currentTime: 100,
    deltaTime: 16.67,
    voltage: 5.0
  };

  beforeEach(() => {
    capacitor = new CapacitorComponent('test-capacitor');
  });

  describe('Constructor and Initial State', () => {
    it('should initialize with correct default values', () => {
      expect(capacitor.id).toBe('test-capacitor');
      expect(capacitor.type).toBe('capacitor');
      expect(capacitor.name).toBe('C_100μF');
      
      const positivePin = capacitor.getPin('Positive');
      const negativePin = capacitor.getPin('Negative');
      expect(positivePin).toBeDefined();
      expect(negativePin).toBeDefined();
    });

    it('should initialize with custom capacitance value', () => {
      const customCapacitor = new CapacitorComponent('custom-capacitor', 0.00047);
      expect(customCapacitor.properties.capacitance).toBe(0.00047);
      expect(customCapacitor.name).toBe('C_470μF');
    });

    it('should have default capacitance of 100µF', () => {
      expect(capacitor.properties.capacitance).toBe(0.0001); // 100µF in Farads
      expect(capacitor.getCapacitance()).toBe(0.0001);
    });

    it('should initialize with zero charge and voltage', () => {
      expect(capacitor.getStoredCharge()).toBe(0);
      expect(capacitor.getVoltageAcross()).toBe(0);
    });
  });

  describe('Capacitance Management', () => {
    it('should get and set capacitance correctly', () => {
      capacitor.setCapacitance(0.00022); // 220µF
      expect(capacitor.getCapacitance()).toBe(0.00022);
      expect(capacitor.properties.capacitance).toBe(0.00022);
    });

    it('should handle minimum capacitance constraint', () => {
      capacitor.setCapacitance(0.5e-15); // Below minimum (1pF)
      expect(capacitor.getCapacitance()).toBe(1e-12); // Should be clamped to 1pF
    });

    it('should handle negative capacitance values', () => {
      capacitor.setCapacitance(-0.0001);
      expect(capacitor.getCapacitance()).toBe(1e-12); // Should be clamped to 1pF
    });

    it('should handle large capacitance values', () => {
      capacitor.setCapacitance(0.01); // 10,000µF
      expect(capacitor.getCapacitance()).toBe(0.01);
    });
  });

  describe('Voltage and Charge Behavior', () => {
    it('should calculate voltage across pins correctly', () => {
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.setPinVoltage('Negative', 2.0);
      
      expect(capacitor.getVoltageAcross()).toBe(3.0);
    });

    it('should handle negative voltage correctly', () => {
      capacitor.setPinVoltage('Positive', 2.0);
      capacitor.setPinVoltage('Negative', 5.0);
      
      expect(capacitor.getVoltageAcross()).toBe(-3.0);
    });

    it('should calculate stored charge using Q = CV', () => {
      capacitor.setCapacitance(0.0001); // 100µF
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.setPinVoltage('Negative', 0.0);
      
      capacitor.update(mockUpdateContext);
      
      const expectedCharge = 0.0001 * 5.0; // C * V
      expect(capacitor.getStoredCharge()).toBeCloseTo(expectedCharge, 6);
    });

    it('should update charge when voltage changes', () => {
      capacitor.setCapacitance(0.0001);
      
      // First voltage
      capacitor.setPinVoltage('Positive', 3.0);
      capacitor.setPinVoltage('Negative', 0.0);
      capacitor.update(mockUpdateContext);
      
      const charge1 = capacitor.getStoredCharge();
      
      // Second voltage
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.update(mockUpdateContext);
      
      const charge2 = capacitor.getStoredCharge();
      
      expect(charge2).toBeGreaterThan(charge1);
    });
  });

  describe('Current Calculation', () => {
    it('should calculate current using I = C * dV/dt', () => {
      capacitor.setCapacitance(0.0001);
      
      // Initial state
      capacitor.setPinVoltage('Positive', 0.0);
      capacitor.setPinVoltage('Negative', 0.0);
      capacitor.update(mockUpdateContext);
      
      // Apply voltage step
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.update(mockUpdateContext);
      
      const positiveCurrent = capacitor.getPinCurrent('Positive');
      const negativeCurrent = capacitor.getPinCurrent('Negative');
      
      expect(Math.abs(positiveCurrent)).toBeGreaterThan(0);
      expect(positiveCurrent).toBe(-negativeCurrent);
    });

    it('should have zero current when voltage is constant', () => {
      capacitor.setCapacitance(0.0001);
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.setPinVoltage('Negative', 0.0);
      
      // First update to establish voltage
      capacitor.update(mockUpdateContext);
      
      // Second update with same voltage
      capacitor.update(mockUpdateContext);
      
      const positiveCurrent = capacitor.getPinCurrent('Positive');
      const negativeCurrent = capacitor.getPinCurrent('Negative');
      
      expect(positiveCurrent).toBe(0);
      expect(negativeCurrent).toBe(0);
    });

    it('should handle discharging current correctly', () => {
      capacitor.setCapacitance(0.0001);
      
      // Charge the capacitor
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.setPinVoltage('Negative', 0.0);
      capacitor.update(mockUpdateContext);
      
      // Reduce voltage (discharge)
      capacitor.setPinVoltage('Positive', 3.0);
      capacitor.update(mockUpdateContext);
      
      const positiveCurrent = capacitor.getPinCurrent('Positive');
      const negativeCurrent = capacitor.getPinCurrent('Negative');
      
      expect(positiveCurrent).toBe(-negativeCurrent);
    });
  });

  describe('Energy Storage', () => {
    it('should calculate stored energy using E = 1/2 * C * V²', () => {
      capacitor.setCapacitance(0.0001);
      capacitor.setPinVoltage('Positive', 6.0);
      capacitor.setPinVoltage('Negative', 0.0);
      
      capacitor.update(mockUpdateContext);
      
      const expectedEnergy = 0.5 * 0.0001 * 6.0 * 6.0; // 1/2 * C * V²
      expect(capacitor.getStoredEnergy()).toBeCloseTo(expectedEnergy, 8);
    });

    it('should have zero stored energy when voltage is zero', () => {
      capacitor.setCapacitance(0.0001);
      capacitor.setPinVoltage('Positive', 0.0);
      capacitor.setPinVoltage('Negative', 0.0);
      
      capacitor.update(mockUpdateContext);
      
      expect(capacitor.getStoredEnergy()).toBe(0);
    });

    it('should increase stored energy with higher voltage', () => {
      capacitor.setCapacitance(0.0001);
      
      capacitor.setPinVoltage('Positive', 3.0);
      capacitor.update(mockUpdateContext);
      const energy1 = capacitor.getStoredEnergy();
      
      capacitor.setPinVoltage('Positive', 6.0);
      capacitor.update(mockUpdateContext);
      const energy2 = capacitor.getStoredEnergy();
      
      expect(energy2).toBeGreaterThan(energy1);
    });
  });

  describe('Validation', () => {
    it('should validate properly configured capacitor', () => {
      capacitor.setCapacitance(0.00047); // 470µF
      const errors = capacitor.validate();
      expect(errors.length).toBe(0);
    });

    it('should report errors for invalid capacitance values', () => {
      capacitor.setCapacitance(0);
      const errors = capacitor.validate();
      expect(errors.some(error => error.includes('greater than 0'))).toBe(true);
    });

    it('should validate capacitance range', () => {
      capacitor.setCapacitance(2.0); // Above practical range (1F)
      const errors = capacitor.validate();
      expect(errors.some(error => error.includes('practical range'))).toBe(true);
    });

    it('should validate voltage rating for electrolytic capacitors', () => {
      // Default is electrolytic with 25V rating
      capacitor.setPinVoltage('Positive', 30.0); // Over rating
      capacitor.setPinVoltage('Negative', 0.0);
      capacitor.update(mockUpdateContext);
      
      const errors = capacitor.validate();
      expect(errors.some(error => error.includes('exceeds rating'))).toBe(true);
    });

    it('should warn about polarity for electrolytic capacitors', () => {
      // Reverse bias electrolytic capacitor
      capacitor.setPinVoltage('Positive', 0.0);
      capacitor.setPinVoltage('Negative', 5.0);
      capacitor.update(mockUpdateContext);
      
      const errors = capacitor.validate();
      expect(errors.some(error => error.includes('reverse biased'))).toBe(true);
    });
  });

  describe('Render Data', () => {
    it('should provide render data for visualization', () => {
      capacitor.setCapacitance(0.00047); // 470µF
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.update(mockUpdateContext);
      
      const renderData = capacitor.getRenderData();
      
      expect(renderData.id).toBe('test-capacitor');
      expect(renderData.type).toBe('capacitor');
      expect(renderData.capacitance).toBe(0.00047);
      expect(renderData.storedCharge).toBeDefined();
      expect(renderData.storedEnergy).toBeDefined();
    });

    it('should include pin information', () => {
      const renderData = capacitor.getRenderData();
      
      expect(renderData.pins).toBeDefined();
      expect(Array.isArray(renderData.pins)).toBe(true);
      expect(renderData.pins.length).toBe(2);
    });

    it('should format capacitance correctly', () => {
      const testCases = [
        { capacitance: 0.000000001, expected: 'nF' }, // nanofarads
        { capacitance: 0.000001, expected: 'μF' },    // microfarads
        { capacitance: 0.001, expected: 'mF' },       // millifarads
        { capacitance: 1.0, expected: 'F' }           // farads
      ];

      testCases.forEach(({ capacitance, expected }) => {
        capacitor.setCapacitance(capacitance);
        const renderData = capacitor.getRenderData();
        
        expect(renderData.capacitanceFormatted).toContain(expected);
      });
    });

    it('should indicate if capacitor is polarized', () => {
      const renderData = capacitor.getRenderData();
      
      expect(renderData.polarized).toBeDefined();
      expect(renderData.polarized).toBe(true); // Default is electrolytic (polarized)
    });
  });

  describe('Component Information', () => {
    it('should provide component information', () => {
      capacitor.setCapacitance(0.00047);
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.update(mockUpdateContext);
      
      const info = capacitor.getInfo();
      
      expect(info.id).toBe('test-capacitor');
      expect(info.type).toBe('capacitor');
      expect(info.capacitance).toContain('μF');
      expect(info.componentType).toBe('Passive Component');
      expect(info.description).toBeDefined();
      expect(info.voltage).toBeDefined();
      expect(info.storedCharge).toBeDefined();
      expect(info.storedEnergy).toBeDefined();
    });

    it('should format values in scientific notation', () => {
      capacitor.setCapacitance(0.00001); // Small capacitance
      capacitor.setPinVoltage('Positive', 1.0);
      capacitor.update(mockUpdateContext);
      
      const info = capacitor.getInfo();
      
      expect(info.storedCharge).toContain('e');  // Scientific notation
      expect(info.storedEnergy).toContain('e');  // Scientific notation
    });
  });

  describe('Reset and State Management', () => {
    it('should reset to initial state', () => {
      capacitor.setCapacitance(0.00047);
      capacitor.setPinVoltage('Positive', 5.0);
      capacitor.setPinVoltage('Negative', 0.0);
      
      capacitor.update(mockUpdateContext);
      
      expect(capacitor.getVoltageAcross()).toBeGreaterThan(0);
      expect(capacitor.getStoredCharge()).toBeGreaterThan(0);
      
      capacitor.reset();
      
      expect(capacitor.getStoredCharge()).toBe(0);
      expect(capacitor.getPinVoltage('Positive')).toBe(0);
      expect(capacitor.getPinVoltage('Negative')).toBe(0);
    });

    it('should maintain component properties after reset', () => {
      capacitor.setCapacitance(0.00047);
      const originalCapacitance = capacitor.getCapacitance();
      const originalId = capacitor.id;
      
      capacitor.reset();
      
      expect(capacitor.id).toBe(originalId);
      expect(capacitor.getCapacitance()).toBe(originalCapacitance);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small capacitance values', () => {
      capacitor.setCapacitance(1e-12); // 1pF
      capacitor.setPinVoltage('Positive', 5.0);
      
      expect(() => {
        capacitor.update(mockUpdateContext);
      }).not.toThrow();
      
      expect(capacitor.getStoredCharge()).toBeGreaterThan(0);
    });

    it('should handle very large voltage differences', () => {
      capacitor.setCapacitance(0.0001);
      capacitor.setPinVoltage('Positive', 1000);
      capacitor.setPinVoltage('Negative', 0);
      
      expect(() => {
        capacitor.update(mockUpdateContext);
      }).not.toThrow();
      
      expect(capacitor.getVoltageAcross()).toBe(1000);
      expect(capacitor.getStoredCharge()).toBeGreaterThan(0);
    });

    it('should handle rapid voltage changes', () => {
      capacitor.setCapacitance(0.0001);
      
      // Rapid voltage switching
      for (let i = 0; i < 10; i++) {
        capacitor.setPinVoltage('Positive', i % 2 === 0 ? 5.0 : 0.0);
        expect(() => {
          capacitor.update(mockUpdateContext);
        }).not.toThrow();
      }
      
      const voltage = capacitor.getVoltageAcross();
      expect(isFinite(voltage)).toBe(true);
    });

    it('should handle zero delta time gracefully', () => {
      const zeroTimeContext = { ...mockUpdateContext, deltaTime: 0 };
      capacitor.setPinVoltage('Positive', 5.0);
      
      expect(() => {
        capacitor.update(zeroTimeContext);
      }).not.toThrow();
    });
  });
});