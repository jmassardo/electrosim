# Headless Mode Specification

## Overview

Headless mode enables Simudino to run Arduino simulations without a graphical interface, making it perfect for automated testing, CI/CD pipelines, and batch processing scenarios. This mode provides a command-line interface (CLI) that can execute Arduino sketches, run test suites, and generate reports programmatically.

## Use Cases

### Primary Use Cases
1. **CI/CD Pipeline Integration**: Automated Arduino code testing in GitHub Actions, Jenkins, GitLab CI
2. **Regression Testing**: Large-scale testing of Arduino firmware across multiple configurations
3. **Performance Benchmarking**: Automated performance testing and profiling of Arduino code
4. **Educational Assessment**: Automated grading of Arduino assignments and exercises
5. **Batch Processing**: Processing multiple Arduino projects for analysis or conversion

### Example Scenarios
```bash
# Run a single Arduino sketch with assertions
simudino test --sketch blink.ino --circuit basic_led.json --timeout 5s

# Execute a comprehensive test suite
simudino test-suite --config arduino_tests.yml --reporter junit

# Performance benchmark across multiple Arduino boards
simudino benchmark --sketch sensor_reader.ino --boards uno,nano,mega --iterations 100

# Educational grading
simudino grade --assignment assignments/week3/ --rubric rubric.yml --output grades.csv
```

## Architecture

### Headless Mode Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   CLI Interface │───▶│  Test Runner     │───▶│  Simulation Engine  │
│   (Commander.js) │    │  (Jest-based)    │    │   (No GUI deps)     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ Config Loader   │    │ Assertion Engine │    │ Report Generator    │
│ (YAML/JSON)     │    │ (Chai-style)     │    │ (JUnit/TAP/JSON)    │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

### Core Components

#### 1. CLI Interface (`src/cli/index.ts`)
```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { runTest } from './commands/test';
import { runTestSuite } from './commands/test-suite';
import { runBenchmark } from './commands/benchmark';
import { runGrade } from './commands/grade';

const program = new Command();

program
  .name('simudino')
  .description('Arduino Simulator CLI')
  .version('1.0.0');

program
  .command('test')
  .description('Run a single Arduino test')
  .option('-s, --sketch <file>', 'Arduino sketch file (.ino)')
  .option('-c, --circuit <file>', 'Circuit configuration file (.json)')
  .option('-t, --timeout <duration>', 'Test timeout', '30s')
  .option('-v, --verbose', 'Verbose output')
  .option('--virtual-port', 'Create virtual serial port')
  .action(runTest);

program
  .command('test-suite')
  .description('Run a test suite')
  .option('-c, --config <file>', 'Test suite configuration (.yml)')
  .option('-r, --reporter <type>', 'Reporter type (console|junit|tap|json)', 'console')
  .option('-o, --output <file>', 'Output file for reports')
  .option('-p, --parallel <count>', 'Parallel test execution', '1')
  .action(runTestSuite);

program
  .command('benchmark')
  .description('Performance benchmark')
  .option('-s, --sketch <file>', 'Arduino sketch file')
  .option('-b, --boards <list>', 'Comma-separated board types', 'uno')
  .option('-i, --iterations <count>', 'Number of iterations', '10')
  .option('--metrics <list>', 'Metrics to collect', 'cpu,memory,timing')
  .action(runBenchmark);

program
  .command('grade')
  .description('Grade Arduino assignments')
  .option('-a, --assignment <dir>', 'Assignment directory')
  .option('-r, --rubric <file>', 'Grading rubric (.yml)')
  .option('-o, --output <file>', 'Grades output file (.csv)')
  .action(runGrade);

program.parse();
```

#### 2. Test Runner (`src/cli/test-runner.ts`)
```typescript
export interface TestConfig {
  sketch: string;
  circuit?: string;
  board: ArduinoBoardType;
  timeout: number;
  assertions: TestAssertion[];
  setup?: SetupFunction;
  teardown?: TeardownFunction;
}

export interface TestAssertion {
  type: 'serial-output' | 'pin-state' | 'timing' | 'memory' | 'custom';
  condition: string;
  expected: any;
  tolerance?: number;
  timeout?: number;
}

export class HeadlessTestRunner {
  private simulationEngine: SimulationEngine;
  private assertionEngine: AssertionEngine;
  
  constructor() {
    this.simulationEngine = new SimulationEngine({ headless: true });
    this.assertionEngine = new AssertionEngine();
  }
  
  async runTest(config: TestConfig): Promise<TestResult> {
    console.log(`🧪 Running test: ${config.sketch}`);
    
    try {
      // Setup simulation
      const circuit = await this.loadCircuit(config.circuit);
      const sketch = await this.compileSketch(config.sketch);
      
      await this.simulationEngine.loadCircuit(circuit);
      await this.simulationEngine.loadSketch(sketch);
      
      // Execute setup if provided
      if (config.setup) {
        await config.setup(this.simulationEngine);
      }
      
      // Start simulation
      const startTime = Date.now();
      await this.simulationEngine.start();
      
      // Run assertions
      const assertionResults = await Promise.all(
        config.assertions.map(assertion => 
          this.assertionEngine.evaluate(assertion, this.simulationEngine)
        )
      );
      
      // Stop simulation
      await this.simulationEngine.stop();
      
      // Execute teardown if provided
      if (config.teardown) {
        await config.teardown(this.simulationEngine);
      }
      
      const duration = Date.now() - startTime;
      const passed = assertionResults.every(result => result.passed);
      
      return {
        testName: config.sketch,
        passed,
        duration,
        assertions: assertionResults,
        metadata: {
          board: config.board,
          memoryUsage: this.simulationEngine.getMemoryUsage(),
          cpuCycles: this.simulationEngine.getCpuCycles()
        }
      };
      
    } catch (error) {
      return {
        testName: config.sketch,
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  async runTestSuite(configFile: string): Promise<TestSuiteResult> {
    const config = await this.loadTestSuiteConfig(configFile);
    const results: TestResult[] = [];
    
    console.log(`🚀 Running test suite: ${config.name}`);
    console.log(`📁 ${config.tests.length} tests to run\n`);
    
    for (const testConfig of config.tests) {
      const result = await this.runTest(testConfig);
      results.push(result);
      
      // Progress reporting
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.testName} (${duration})`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    
    return {
      suiteName: config.name,
      totalTests: total,
      passedTests: passed,
      failedTests: total - passed,
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      results
    };
  }
}
```

#### 3. Assertion Engine (`src/cli/commands/assertions.ts`)
```typescript
export class AssertionEngine {
  async evaluate(assertion: TestAssertion, simulation: SimulationEngine): Promise<AssertionResult> {
    switch (assertion.type) {
      case 'serial-output':
        return this.evaluateSerialOutput(assertion, simulation);
      case 'pin-state':
        return this.evaluatePinState(assertion, simulation);
      case 'timing':
        return this.evaluateTiming(assertion, simulation);
      case 'memory':
        return this.evaluateMemory(assertion, simulation);
      case 'custom':
        return this.evaluateCustom(assertion, simulation);
      default:
        throw new Error(`Unknown assertion type: ${assertion.type}`);
    }
  }
  
  private async evaluateSerialOutput(assertion: TestAssertion, simulation: SimulationEngine): Promise<AssertionResult> {
    const timeout = assertion.timeout || 5000;
    const expected = assertion.expected as string;
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      let receivedData = '';
      
      const timeoutId = setTimeout(() => {
        resolve({
          passed: false,
          message: `Timeout: Expected serial output "${expected}" not received within ${timeout}ms`,
          actual: receivedData,
          expected
        });
      }, timeout);
      
      simulation.onSerialData((data: string) => {
        receivedData += data;
        
        if (receivedData.includes(expected)) {
          clearTimeout(timeoutId);
          resolve({
            passed: true,
            message: `Serial output matched: "${expected}"`,
            actual: receivedData,
            expected,
            duration: Date.now() - startTime
          });
        }
      });
    });
  }
  
  private async evaluatePinState(assertion: TestAssertion, simulation: SimulationEngine): Promise<AssertionResult> {
    const { pin, state } = assertion.condition as { pin: number, state: 'HIGH' | 'LOW' };
    const actualState = simulation.getDigitalPinState(pin);
    const passed = actualState === state;
    
    return {
      passed,
      message: passed 
        ? `Pin ${pin} state is ${state}` 
        : `Pin ${pin} expected ${state}, got ${actualState}`,
      actual: actualState,
      expected: state
    };
  }
  
  private async evaluateTiming(assertion: TestAssertion, simulation: SimulationEngine): Promise<AssertionResult> {
    const { event, expectedDuration, tolerance = 0.1 } = assertion.condition as {
      event: string;
      expectedDuration: number;
      tolerance: number;
    };
    
    const actualDuration = await simulation.measureEventDuration(event);
    const diff = Math.abs(actualDuration - expectedDuration);
    const maxDiff = expectedDuration * tolerance;
    const passed = diff <= maxDiff;
    
    return {
      passed,
      message: passed
        ? `Timing within tolerance: ${actualDuration}ms (expected ${expectedDuration}ms ±${tolerance * 100}%)`
        : `Timing outside tolerance: ${actualDuration}ms (expected ${expectedDuration}ms ±${tolerance * 100}%)`,
      actual: actualDuration,
      expected: expectedDuration,
      tolerance: maxDiff
    };
  }
}
```

## Configuration Format

### Test Configuration (YAML)
```yaml
# arduino_tests.yml
name: "Arduino LED Blink Test Suite"
description: "Tests for basic LED blinking functionality"

global_config:
  timeout: 30s
  board: "uno"
  reporter: "junit"

tests:
  - name: "Basic LED Blink"
    sketch: "tests/blink/blink.ino"
    circuit: "tests/blink/circuit.json"
    timeout: 10s
    assertions:
      - type: "pin-state"
        condition: { pin: 13, state: "HIGH" }
        timeout: 2s
      - type: "serial-output"
        expected: "LED ON"
        timeout: 3s
      - type: "timing"
        condition: 
          event: "pin-13-toggle"
          expected_duration: 1000
          tolerance: 0.05
    
  - name: "Multiple LED Sequence"
    sketch: "tests/sequence/sequence.ino"
    circuit: "tests/sequence/circuit.json"
    assertions:
      - type: "pin-state"
        condition: { pin: 12, state: "HIGH" }
        timeout: 1s
      - type: "pin-state"
        condition: { pin: 13, state: "LOW" }
        timeout: 2s
      - type: "serial-output"
        expected: "Sequence complete"
        timeout: 5s

  - name: "Memory Usage Test"
    sketch: "tests/memory/large_array.ino"
    assertions:
      - type: "memory"
        condition: { max_usage: 1024, type: "SRAM" }
      - type: "serial-output"
        expected: "Array initialized"
        timeout: 2s

environment:
  variables:
    DEBUG: "true"
    LOG_LEVEL: "info"
```

### Circuit Configuration (JSON)
```json
{
  "name": "Basic LED Circuit",
  "board": {
    "type": "arduino-uno",
    "version": "r3"
  },
  "components": [
    {
      "id": "led1",
      "type": "led",
      "properties": {
        "color": "red",
        "forward_voltage": 2.0,
        "forward_current": 0.02
      },
      "connections": {
        "anode": { "pin": 13 },
        "cathode": { "pin": "GND" }
      }
    },
    {
      "id": "resistor1", 
      "type": "resistor",
      "properties": {
        "resistance": 220
      },
      "connections": {
        "terminal1": { "component": "led1", "pin": "anode" },
        "terminal2": { "pin": 13 }
      }
    }
  ],
  "virtual_ports": {
    "serial": {
      "enabled": true,
      "port_name": "COM3",
      "baud_rate": 9600
    }
  }
}
```

### Grading Rubric (YAML)
```yaml
# rubric.yml
assignment: "Week 3 - LED Control"
total_points: 100

criteria:
  - name: "Code Compilation"
    points: 20
    test_type: "compilation"
    description: "Code compiles without errors"
    
  - name: "Basic LED Blink"
    points: 30
    test_type: "functional"
    assertions:
      - type: "pin-state"
        condition: { pin: 13, state: "HIGH" }
        points: 15
      - type: "timing"
        condition: { event: "led-blink", expected_duration: 1000, tolerance: 0.1 }
        points: 15
        
  - name: "Serial Communication"
    points: 25
    test_type: "functional"
    assertions:
      - type: "serial-output"
        expected: "LED"
        points: 25
        
  - name: "Code Quality"
    points: 15
    test_type: "static-analysis"
    checks:
      - "proper_comments"
      - "variable_naming"
      - "code_structure"
      
  - name: "Performance"
    points: 10
    test_type: "performance"
    assertions:
      - type: "memory"
        condition: { max_usage: 512, type: "SRAM" }
        points: 5
      - type: "timing"
        condition: { max_execution_time: 100 }
        points: 5

bonus_criteria:
  - name: "Creative Enhancement"
    points: 10
    description: "Student added creative features beyond requirements"
    test_type: "manual_review"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
# .github/workflows/arduino-test.yml
name: Arduino Simulation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install Simudino CLI
      run: |
        npm install -g simudino-cli
        # or download pre-built binary
        
    - name: Run Arduino Tests
      run: |
        simudino test-suite --config tests/arduino_tests.yml --reporter junit --output test-results.xml
        
    - name: Upload Test Results
      uses: dorny/test-reporter@v1
      if: always()
      with:
        name: Arduino Tests
        path: test-results.xml
        reporter: java-junit
        
    - name: Performance Benchmark
      run: |
        simudino benchmark --sketch src/main.ino --boards uno,nano,mega --iterations 50 --output benchmark.json
        
    - name: Upload Benchmark Results
      uses: actions/upload-artifact@v3
      with:
        name: performance-benchmark
        path: benchmark.json
```

### Jenkins Pipeline Example
```groovy
// Jenkinsfile
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm install -g simudino-cli'
            }
        }
        
        stage('Arduino Tests') {
            steps {
                sh '''
                    simudino test-suite \
                        --config tests/arduino_tests.yml \
                        --reporter junit \
                        --output test-results.xml \
                        --parallel 4
                '''
            }
            post {
                always {
                    junit 'test-results.xml'
                }
            }
        }
        
        stage('Performance Tests') {
            steps {
                sh '''
                    simudino benchmark \
                        --sketch src/sensor_reader.ino \
                        --boards uno,nano,mega \
                        --iterations 100 \
                        --metrics cpu,memory,timing \
                        --output performance.json
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'performance.json'
                }
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: false,
                keepAll: true,
                reportDir: 'reports',
                reportFiles: 'index.html',
                reportName: 'Arduino Test Report'
            ])
        }
    }
}
```

## Test Report Formats

### JUnit XML Output
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Arduino Tests" tests="3" failures="1" time="15.234">
  <testsuite name="LED Blink Tests" tests="2" failures="0" time="8.123">
    <testcase name="Basic LED Blink" classname="blink.ino" time="4.567">
      <system-out>LED ON
LED OFF
LED ON</system-out>
    </testcase>
    <testcase name="LED Timing" classname="blink.ino" time="3.556"/>
  </testsuite>
  
  <testsuite name="Sensor Tests" tests="1" failures="1" time="7.111">
    <testcase name="Temperature Reading" classname="sensor.ino" time="7.111">
      <failure message="Expected temperature reading within range">
        Expected: 20-25°C, Actual: 30.5°C
      </failure>
      <system-out>Temperature: 30.5°C
Humidity: 45%</system-out>
    </testcase>
  </testsuite>
</testsuites>
```

### JSON Output
```json
{
  "summary": {
    "total_tests": 3,
    "passed": 2,
    "failed": 1,
    "duration": 15234,
    "timestamp": "2024-03-15T10:30:45Z"
  },
  "results": [
    {
      "test_name": "Basic LED Blink",
      "sketch": "tests/blink.ino",
      "board": "uno",
      "passed": true,
      "duration": 4567,
      "assertions": [
        {
          "type": "pin-state",
          "passed": true,
          "message": "Pin 13 state is HIGH",
          "duration": 1234
        },
        {
          "type": "serial-output",
          "passed": true,
          "message": "Serial output matched: 'LED ON'",
          "duration": 2345
        }
      ],
      "metadata": {
        "memory_usage": 512,
        "cpu_cycles": 16000000,
        "compilation_time": 890
      }
    }
  ]
}
```

## Performance and Optimization

### Headless Mode Optimizations
```typescript
class HeadlessSimulationEngine extends SimulationEngine {
  constructor() {
    super({
      headless: true,
      optimizations: {
        // Disable graphics rendering
        renderComponents: false,
        renderWires: false,
        
        // Reduce simulation fidelity for speed
        timeStep: 10, // 10ms instead of 1ms
        skipNonCriticalCalculations: true,
        
        // Memory optimizations
        componentPooling: true,
        garbageCollectionAggressive: true,
        
        // Parallel processing
        enableMultithreading: true,
        workerThreads: 4
      }
    });
  }
  
  // Override expensive operations
  updateVisualization(): void {
    // No-op in headless mode
  }
  
  renderFrame(): void {
    // No-op in headless mode
  }
}
```

### Resource Monitoring
```typescript
class ResourceMonitor {
  private startTime: number;
  private startMemory: number;
  
  start(): void {
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }
  
  getMetrics(): ResourceMetrics {
    const currentMemory = process.memoryUsage();
    
    return {
      duration: Date.now() - this.startTime,
      memoryUsed: currentMemory.heapUsed - this.startMemory,
      cpuUsage: process.cpuUsage(),
      peakMemory: currentMemory.heapUsed,
      gcCollections: this.getGCStats()
    };
  }
}
```

## Security Considerations

### Sandboxed Execution
- **Process Isolation**: Run each test in isolated Node.js processes
- **Resource Limits**: CPU time, memory, and file system access limits
- **Network Restrictions**: Block network access during test execution
- **File System Access**: Restrict to test directories only

### Input Validation
- **Sketch Validation**: Validate Arduino code before compilation
- **Configuration Validation**: Schema validation for YAML/JSON configs
- **Path Sanitization**: Prevent directory traversal attacks
- **Resource Exhaustion**: Prevent infinite loops and memory bombs

## Future Enhancements

### Advanced Testing Features
1. **Property-Based Testing**: Generate test cases automatically
2. **Mutation Testing**: Test the quality of test suites
3. **Coverage Analysis**: Code coverage reporting for Arduino sketches
4. **Fuzz Testing**: Automated input fuzzing for robustness testing

### Integration Improvements
1. **Docker Support**: Containerized test execution
2. **Cloud Testing**: Distributed testing across cloud instances  
3. **Test Parallelization**: Run tests across multiple cores/machines
4. **Historical Reporting**: Track test performance over time

### Educational Features
1. **Auto-Grading**: Sophisticated rubric-based grading
2. **Plagiarism Detection**: Code similarity analysis
3. **Learning Analytics**: Student progress tracking
4. **Adaptive Testing**: Difficulty adjustment based on performance

The headless mode transforms Simudino from an educational tool into a professional development and testing platform, enabling robust CI/CD integration and automated quality assurance for Arduino projects.