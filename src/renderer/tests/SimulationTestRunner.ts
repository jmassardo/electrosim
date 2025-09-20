/**
 * Test runner for simulation components and canvas integration
 */

import { SimpleSimulationManager } from '../../simulation/core/SimpleSimulationManager';
import { LEDComponent } from '../../simulation/components/LED';
import { ArduinoUnoBoard } from '../../simulation/boards/ArduinoUno';

/**
 * Basic integration test for simulation functionality
 */
export class SimulationTestRunner {
  private simulation: SimpleSimulationManager;
  private testResults: { name: string; passed: boolean; error?: string }[];

  constructor() {
    this.simulation = new SimpleSimulationManager();
    this.testResults = [];
  }

  /**
   * Run all simulation tests
   */
  public async runTests(): Promise<void> {
    console.log('🧪 Starting simulation tests...\n');

    await this.testArduinoBoard();
    await this.testLEDComponent();
    await this.testComponentConnections();
    await this.testSimulationLoop();

    this.printResults();
  }

  /**
   * Test Arduino board functionality
   */
  private async testArduinoBoard(): Promise<void> {
    try {
      const arduino = new ArduinoUnoBoard('test-arduino', 'Test Arduino');
      this.simulation.addArduinoBoard(arduino, { x: 0, y: 0 });

      // Test pin modes and values
      arduino.setPinMode(13, 'OUTPUT');
      arduino.digitalWrite(13, true);
      
      const pin13State = arduino.digitalRead(13);
      if (!pin13State) {
        throw new Error('Pin 13 should be HIGH after digitalWrite(13, HIGH)');
      }

      // Test PWM
      arduino.setPinMode(9, 'OUTPUT');
      arduino.analogWrite(9, 128);
      
      const pin9 = arduino.getPin(9);
      if (!pin9 || pin9.pwmValue !== 128) {
        throw new Error('Pin 9 PWM value should be 128');
      }

      this.testResults.push({ name: 'Arduino Board Functionality', passed: true });
      console.log('✅ Arduino board tests passed');
    } catch (error) {
      this.testResults.push({ 
        name: 'Arduino Board Functionality', 
        passed: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Arduino board tests failed:', error);
    }
  }

  /**
   * Test LED component functionality
   */
  private async testLEDComponent(): Promise<void> {
    try {
      const led = new LEDComponent('test-led', 'Test LED');
      this.simulation.addLED(led, { x: 100, y: 0 });

      // Test initial state
      const renderData1 = led.getRenderData();
      if (renderData1.isOn) {
        throw new Error('LED should be OFF initially');
      }

      // Test voltage application
      led.setPinVoltage('anode', 3.0);
      led.update({ currentTime: 0, deltaTime: 16.67, voltage: 5.0 });
      const renderData2 = led.getRenderData();
      if (!renderData2.isOn) {
        throw new Error('LED should be ON with 3V applied');
      }

      // Test render data
      const renderData = led.getRenderData();
      if (!renderData.isOn || renderData.brightness <= 0) {
        throw new Error('LED render data should show ON state and positive brightness');
      }

      this.testResults.push({ name: 'LED Component Functionality', passed: true });
      console.log('✅ LED component tests passed');
    } catch (error) {
      this.testResults.push({ 
        name: 'LED Component Functionality', 
        passed: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ LED component tests failed:', error);
    }
  }

  /**
   * Test component connections
   */
  private async testComponentConnections(): Promise<void> {
    try {
      // Clear previous test components
      this.simulation = new SimpleSimulationManager();
      
      const arduino = new ArduinoUnoBoard('conn-arduino', 'Connection Arduino');
      const led = new LEDComponent('conn-led', 'Connection LED');
      
      this.simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
      this.simulation.addLED(led, { x: 100, y: 0 });

      // Connect LED to Arduino
      this.simulation.connectLEDToArduino('conn-led', 'conn-arduino', 13);
      this.simulation.connectLEDToGround('conn-led', 'conn-arduino');

      // Check connections exist
      const connections = this.simulation.getAllConnections();
      if (connections.length !== 2) {
        throw new Error(`Expected 2 connections, got ${connections.length}`);
      }

      // Test signal propagation
      this.simulation.setArduinoPin(13, true);
      
      // Wait a moment for propagation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const renderData3 = led.getRenderData();
      if (!renderData3.isOn) {
        throw new Error('LED should be ON when Arduino pin 13 is HIGH');
      }

      this.testResults.push({ name: 'Component Connections', passed: true });
      console.log('✅ Component connection tests passed');
    } catch (error) {
      this.testResults.push({ 
        name: 'Component Connections', 
        passed: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Component connection tests failed:', error);
    }
  }

  /**
   * Test simulation loop
   */
  private async testSimulationLoop(): Promise<void> {
    try {
      // Start simulation
      this.simulation.start();
      
      if (!this.simulation.getIsRunning()) {
        throw new Error('Simulation should be running after start()');
      }

      // Run for a short time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stop simulation
      this.simulation.stop();
      
      if (this.simulation.getIsRunning()) {
        throw new Error('Simulation should be stopped after stop()');
      }

      this.testResults.push({ name: 'Simulation Loop', passed: true });
      console.log('✅ Simulation loop tests passed');
    } catch (error) {
      this.testResults.push({ 
        name: 'Simulation Loop', 
        passed: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('❌ Simulation loop tests failed:', error);
    }
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Simulation system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

/**
 * Export test runner function for easy use
 */
export const runSimulationTests = async (): Promise<void> => {
  const runner = new SimulationTestRunner();
  await runner.runTests();
};

// Auto-run tests in development mode
if (process.env.NODE_ENV === 'development') {
  // Run tests after a short delay to allow for module loading
  setTimeout(() => {
    runSimulationTests().catch(console.error);
  }, 1000);
}