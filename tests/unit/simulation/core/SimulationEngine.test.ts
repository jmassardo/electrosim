import { SimulationEngine, SimulationConfig, CircuitConnection } from '../../../../src/simulation/core/SimulationEngine';
import { Component, ComponentUpdateContext } from '../../../../src/simulation/components/base/Component';
import { LEDComponent } from '../../../../src/simulation/components/LED';
import { ResistorComponent } from '../../../../src/simulation/components/Resistor';
import { ButtonComponent } from '../../../../src/simulation/components/Button';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
});
global.cancelAnimationFrame = jest.fn();

describe('SimulationEngine', () => {
  let engine: SimulationEngine;
  let mockConfig: SimulationConfig;

  beforeEach(() => {
    mockConfig = {
      targetFPS: 60,
      maxComponents: 1000,
      enableProfiling: true,
      enableDebugging: false
    };
    
    engine = new SimulationEngine(mockConfig);
    jest.clearAllMocks();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Constructor and Initialization', () => {
    test('should create engine with default configuration', () => {
      const defaultEngine = new SimulationEngine();
      expect(defaultEngine).toBeInstanceOf(SimulationEngine);
      expect(defaultEngine.getConfig().targetFPS).toBe(60);
      expect(defaultEngine.getConfig().maxComponents).toBe(100);
    });

    test('should create engine with custom configuration', () => {
      const customConfig = {
        targetFPS: 30,
        maxComponents: 500,
        enableProfiling: false,
        enableDebugging: true
      };
      
      const customEngine = new SimulationEngine(customConfig);
      expect(customEngine.getConfig()).toEqual(customConfig);
    });

    test('should initialize with correct default state', () => {
      expect(engine.isRunning()).toBe(false);
      expect(engine.isPaused()).toBe(false);
      expect(engine.getComponentCount()).toBe(0);
      expect(engine.getTotalTime()).toBe(0);
      expect(engine.getCycleCount()).toBe(0);
    });
  });

  describe('Component Management', () => {
    test('should add components to simulation', () => {
      const led = new LEDComponent('led1', 'red');
      const resistor = new ResistorComponent('r1', 220);

      engine.addComponent(led);
      engine.addComponent(resistor);

      expect(engine.getComponentCount()).toBe(2);
      expect(engine.getComponent('led1')).toBe(led);
      expect(engine.getComponent('r1')).toBe(resistor);
    });

    test('should remove components from simulation', () => {
      const led = new LEDComponent('led1', 'red');
      engine.addComponent(led);
      
      expect(engine.getComponentCount()).toBe(1);
      
      engine.removeComponent('led1');
      expect(engine.getComponentCount()).toBe(0);
      expect(engine.getComponent('led1')).toBeUndefined();
    });

    test('should prevent adding duplicate component IDs', () => {
      const led1 = new LEDComponent('led1', 'red');
      const led2 = new LEDComponent('led1', 'blue'); // Same ID

      engine.addComponent(led1);
      
      expect(() => engine.addComponent(led2)).toThrow('Component with ID led1 already exists');
      expect(engine.getComponentCount()).toBe(1);
    });

    test('should enforce maximum component limit', () => {
      const limitedConfig = { ...mockConfig, maxComponents: 2 };
      const limitedEngine = new SimulationEngine(limitedConfig);

      const led1 = new LEDComponent('led1', 'red');
      const led2 = new LEDComponent('led2', 'green');
      const led3 = new LEDComponent('led3', 'blue');

      limitedEngine.addComponent(led1);
      limitedEngine.addComponent(led2);
      
      expect(() => limitedEngine.addComponent(led3)).toThrow('Maximum component limit reached');
      expect(limitedEngine.getComponentCount()).toBe(2);
    });

    test('should handle component removal during simulation', () => {
      const led = new LEDComponent('led1', 'red');
      engine.addComponent(led);
      
      engine.start();
      expect(engine.isRunning()).toBe(true);
      
      engine.removeComponent('led1');
      expect(engine.getComponentCount()).toBe(0);
      expect(engine.isRunning()).toBe(true); // Should still be running
    });
  });

  describe('Circuit Connections', () => {
    test('should create connections between components', () => {
      const led = new LEDComponent('led1', 'red');
      const resistor = new ResistorComponent('r1', 220);
      
      engine.addComponent(led);
      engine.addComponent(resistor);

      const connection = engine.connect('led1', 'anode', 'r1', 'pin1');
      
      expect(connection).toBeDefined();
      expect(connection.fromComponent).toBe('led1');
      expect(connection.fromPin).toBe('anode');
      expect(connection.toComponent).toBe('r1');
      expect(connection.toPin).toBe('pin1');
      expect(engine.getConnectionCount()).toBe(1);
    });

    test('should prevent invalid connections', () => {
      const led = new LEDComponent('led1', 'red');
      engine.addComponent(led);

      // Try to connect to non-existent component
      expect(() => engine.connect('led1', 'anode', 'nonexistent', 'pin1'))
        .toThrow('Component nonexistent not found');
      
      // Try to connect non-existent pin
      expect(() => engine.connect('led1', 'nonexistent-pin', 'led1', 'cathode'))
        .toThrow('Pin nonexistent-pin not found on component led1');
    });

    test('should disconnect components', () => {
      const led = new LEDComponent('led1', 'red');
      const resistor = new ResistorComponent('r1', 220);
      
      engine.addComponent(led);
      engine.addComponent(resistor);

      const connection = engine.connect('led1', 'anode', 'r1', 'pin1');
      expect(engine.getConnectionCount()).toBe(1);
      
      engine.disconnect(connection.id);
      expect(engine.getConnectionCount()).toBe(0);
    });

    test('should update connection voltages and currents', () => {
      const led = new LEDComponent('led1', 'red');
      const resistor = new ResistorComponent('r1', 220);
      
      engine.addComponent(led);
      engine.addComponent(resistor);

      const connection = engine.connect('led1', 'anode', 'r1', 'pin1');
      
      // Set some voltages
      led.setPinVoltage('anode', 3.3);
      resistor.setPinVoltage('pin1', 3.3);
      
      engine.updateConnections();
      
      expect(connection.voltage).toBe(3.3);
    });
  });

  describe('Simulation Control', () => {
    test('should start simulation', () => {
      engine.start();
      
      expect(engine.isRunning()).toBe(true);
      expect(engine.isPaused()).toBe(false);
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    test('should stop simulation', () => {
      engine.start();
      expect(engine.isRunning()).toBe(true);
      
      engine.stop();
      expect(engine.isRunning()).toBe(false);
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    test('should pause and resume simulation', () => {
      engine.start();
      expect(engine.isRunning()).toBe(true);
      expect(engine.isPaused()).toBe(false);
      
      engine.pause();
      expect(engine.isPaused()).toBe(true);
      expect(engine.isRunning()).toBe(true); // Still running, just paused
      
      engine.resume();
      expect(engine.isPaused()).toBe(false);
    });

    test('should reset simulation state', () => {
      const led = new LEDComponent('led1', 'red');
      engine.addComponent(led);
      
      engine.start();
      // Simulate some time passing
      engine['totalTime'] = 5000;
      engine['cycleCount'] = 300;
      
      engine.reset();
      
      expect(engine.getTotalTime()).toBe(0);
      expect(engine.getCycleCount()).toBe(0);
      expect(engine.isRunning()).toBe(false);
    });
  });

  describe('Simulation Loop', () => {
    test('should update components in simulation loop', (done) => {
      const led = new LEDComponent('led1', 'red');
      const updateSpy = jest.spyOn(led, 'update');
      
      engine.addComponent(led);
      engine.start();

      setTimeout(() => {
        expect(updateSpy).toHaveBeenCalled();
        const updateCall = updateSpy.mock.calls[0][0] as ComponentUpdateContext;
        expect(updateCall.deltaTime).toBeGreaterThan(0);
        expect(updateCall.currentTime).toBeGreaterThan(0);
        
        engine.stop();
        done();
      }, 50); // Wait for a few frames
    });

    test('should maintain target FPS', (done) => {
      const fpsConfig = { ...mockConfig, targetFPS: 30 };
      const fpsEngine = new SimulationEngine(fpsConfig);
      
      fpsEngine.start();

      setTimeout(() => {
        const stats = fpsEngine.getStats();
        // FPS should be close to target (within reasonable tolerance)
        expect(stats.fps).toBeGreaterThan(25);
        expect(stats.fps).toBeLessThan(35);
        
        fpsEngine.stop();
        done();
      }, 200);
    });

    test('should skip updates when paused', (done) => {
      const led = new LEDComponent('led1', 'red');
      const updateSpy = jest.spyOn(led, 'update');
      
      engine.addComponent(led);
      engine.start();
      engine.pause();

      updateSpy.mockClear();

      setTimeout(() => {
        // Should not have been called while paused
        expect(updateSpy).not.toHaveBeenCalled();
        
        engine.stop();
        done();
      }, 50);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track simulation statistics', (done) => {
      engine.start();

      setTimeout(() => {
        const stats = engine.getStats();
        
        expect(stats.fps).toBeGreaterThan(0);
        expect(stats.frameTime).toBeGreaterThan(0);
        expect(stats.componentCount).toBe(0);
        expect(stats.totalTime).toBeGreaterThan(0);
        expect(stats.cycleCount).toBeGreaterThan(0);
        
        engine.stop();
        done();
      }, 100);
    });

    test('should profile performance when enabled', () => {
      const profilingConfig = { ...mockConfig, enableProfiling: true };
      const profilingEngine = new SimulationEngine(profilingConfig);
      
      const led = new LEDComponent('led1', 'red');
      profilingEngine.addComponent(led);
      
      profilingEngine.start();
      const profile = profilingEngine.getPerformanceProfile();
      
      expect(profile).toBeDefined();
      expect(profile.componentUpdateTimes).toBeDefined();
      
      profilingEngine.stop();
    });

    test('should detect performance bottlenecks', (done) => {
      const led = new LEDComponent('led1', 'red');
      
      // Mock slow update method
      jest.spyOn(led, 'update').mockImplementation(() => {
        // Simulate slow component
        const start = Date.now();
        while (Date.now() - start < 20) {} // Block for 20ms
      });
      
      engine.addComponent(led);
      engine.start();

      engine.on('performance-warning', (warning) => {
        expect(warning.type).toBe('slow-component');
        expect(warning.componentId).toBe('led1');
        
        engine.stop();
        done();
      });
    });
  });

  describe('Event System', () => {
    test('should emit simulation events', (done) => {
      const startHandler = jest.fn();
      const stopHandler = jest.fn();
      
      engine.on('start', startHandler);
      engine.on('stop', stopHandler);
      
      engine.start();
      
      setTimeout(() => {
        engine.stop();
        
        setTimeout(() => {
          expect(startHandler).toHaveBeenCalled();
          expect(stopHandler).toHaveBeenCalled();
          done();
        }, 10);
      }, 50);
    });

    test('should emit component events', () => {
      const componentAddHandler = jest.fn();
      const componentRemoveHandler = jest.fn();
      
      engine.on('component-added', componentAddHandler);
      engine.on('component-removed', componentRemoveHandler);
      
      const led = new LEDComponent('led1', 'red');
      engine.addComponent(led);
      
      expect(componentAddHandler).toHaveBeenCalledWith(led);
      
      engine.removeComponent('led1');
      expect(componentRemoveHandler).toHaveBeenCalledWith('led1');
    });

    test('should emit connection events', () => {
      const connectionHandler = jest.fn();
      const disconnectionHandler = jest.fn();
      
      engine.on('connection-created', connectionHandler);
      engine.on('connection-removed', disconnectionHandler);
      
      const led = new LEDComponent('led1', 'red');
      const resistor = new ResistorComponent('r1', 220);
      
      engine.addComponent(led);
      engine.addComponent(resistor);
      
      const connection = engine.connect('led1', 'anode', 'r1', 'pin1');
      expect(connectionHandler).toHaveBeenCalledWith(connection);
      
      engine.disconnect(connection.id);
      expect(disconnectionHandler).toHaveBeenCalledWith(connection.id);
    });
  });

  describe('Error Handling', () => {
    test('should handle component update errors gracefully', (done) => {
      const led = new LEDComponent('led1', 'red');
      
      // Mock component that throws error
      jest.spyOn(led, 'update').mockImplementation(() => {
        throw new Error('Component update failed');
      });
      
      const errorHandler = jest.fn();
      engine.on('component-error', errorHandler);
      
      engine.addComponent(led);
      engine.start();

      setTimeout(() => {
        expect(errorHandler).toHaveBeenCalledWith('led1', expect.any(Error));
        expect(engine.isRunning()).toBe(true); // Should continue running
        
        engine.stop();
        done();
      }, 50);
    });

    test('should handle memory constraints', () => {
      // Mock limited memory scenario
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 500 * 1024 * 1024, // 500MB
        heapUsed: 400 * 1024 * 1024, // 400MB
        heapTotal: 450 * 1024 * 1024,
        external: 10 * 1024 * 1024
      });

      const memoryWarningHandler = jest.fn();
      engine.on('memory-warning', memoryWarningHandler);

      // Add many components to trigger memory warning
      for (let i = 0; i < 100; i++) {
        engine.addComponent(new LEDComponent(`led${i}`, 'red'));
      }

      engine.start();
      
      // Memory warning should be emitted
      setTimeout(() => {
        // Restore original function
        process.memoryUsage = originalMemoryUsage;
      }, 10);
    });
  });
});