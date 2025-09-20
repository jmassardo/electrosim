# ElectroSim User Guide

Welcome to ElectroSim, a comprehensive Arduino circuit simulator that allows you to design, build, and test circuits in a virtual environment before deploying them to real hardware.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Building Your First Circuit](#building-your-first-circuit)
4. [Component Library](#component-library)
5. [Arduino Programming](#arduino-programming)
6. [Simulation Features](#simulation-features)
7. [Project Management](#project-management)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

#### Option 1: Download Prebuilt Application
1. Download the latest release from [GitHub Releases](https://github.com/jmassardo/electrosim/releases)
2. Install the application for your operating system (Windows, macOS, or Linux)
3. Launch ElectroSim from your applications menu

#### Option 2: Build from Source
```bash
git clone https://github.com/jmassardo/electrosim.git
cd electrosim
npm install
npm run build
npm start
```

### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 500MB free space
- **Graphics**: Hardware acceleration supported graphics card

## Interface Overview

ElectroSim features a modern, tabbed interface designed for productivity:

### Main Toolbar
- **File Menu**: Create, open, save projects
- **Edit Menu**: Undo, redo, copy, paste components
- **View Menu**: Zoom controls, grid settings, layout options
- **Simulation Menu**: Start, stop, reset simulation
- **Help Menu**: Documentation, tutorials, about

### Workspace Tabs

#### Circuit Design Tab
The primary workspace for building circuits:
- **Canvas Area**: Drag-and-drop circuit design surface
- **Component Library**: Browse and add components
- **Properties Panel**: Configure selected components
- **Zoom Controls**: Pan and zoom around your circuit

#### Code Editor Tab
Arduino IDE-style programming environment:
- **Code Editor**: Syntax-highlighted C++ editor powered by Monaco
- **Compilation**: Real-time syntax checking and error highlighting
- **Serial Monitor**: View debug output and communication
- **Upload Button**: Deploy code to virtual Arduino board

#### Simulation Tab
Monitor and control circuit behavior:
- **Simulation Controls**: Play, pause, step, reset
- **Variable Monitor**: Watch pin states and component values
- **Oscilloscope**: View signal waveforms over time
- **Performance Metrics**: CPU usage, memory, timing analysis

## Building Your First Circuit

Let's create a simple LED blink circuit:

### Step 1: Add an Arduino Board
1. Open the **Circuit Design** tab
2. From the **Component Library**, drag an **Arduino Uno** to the canvas
3. The board will appear with labeled pins

### Step 2: Add Components
1. Drag an **LED** from the component library to the canvas
2. Add a **220Ω Resistor** to limit current
3. Position components near the Arduino board

### Step 3: Make Connections
1. Click and drag from Arduino **pin 13** to the **anode** (long leg) of the LED
2. Connect the **cathode** (short leg) of the LED to one end of the resistor
3. Connect the other end of the resistor to Arduino **GND**

### Step 4: Configure Components
1. Select the LED and use the **Properties Panel** to set:
   - **Color**: Red, Green, Blue, Yellow, etc.
   - **Forward Voltage**: 2.0V (typical for red LED)
   - **Max Current**: 20mA
2. Select the resistor and set:
   - **Resistance**: 220Ω
   - **Tolerance**: 5%

### Step 5: Write Code
1. Switch to the **Code Editor** tab
2. Enter the following Arduino code:

```cpp
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
```

### Step 6: Run Simulation
1. Click **Upload** to deploy code to the virtual Arduino
2. Switch to the **Circuit Design** tab
3. Click the **Play** button in simulation controls
4. Watch the LED blink on and off every second!

## Component Library

ElectroSim includes a comprehensive library of electronic components:

### Basic Components

#### LED (Light Emitting Diode)
- **Pins**: Anode (+), Cathode (-)
- **Properties**: Color, forward voltage, max current, brightness
- **Simulation**: Realistic current calculation, brightness based on voltage
- **PWM Support**: Smooth brightness control with analogWrite()

#### Resistor
- **Pins**: Pin1, Pin2
- **Properties**: Resistance value, tolerance, power rating
- **Simulation**: Ohm's law calculations, power dissipation, heating effects
- **Color Coding**: Automatic color band calculation

#### Capacitor
- **Pins**: Positive, Negative (for polarized), Terminal1, Terminal2 (for non-polarized)
- **Properties**: Capacitance, voltage rating, type (ceramic, electrolytic, tantalum)
- **Simulation**: Charge/discharge curves, filtering behavior

#### Button/Switch
- **Pins**: Pin1, Pin2
- **Properties**: Momentary/latching, debounce time, actuation force
- **Simulation**: Realistic bounce behavior, pull-up/pull-down support
- **Interaction**: Click to actuate during simulation

### Advanced Components

#### Servo Motor
- **Pins**: Signal, VCC (+5V), GND
- **Properties**: Rotation range, speed, torque
- **Simulation**: Position control with PWM signals, realistic movement timing
- **Visualization**: Animated rotation indicator

#### Sensors (Planned)
- **Temperature Sensors**: DS18B20, DHT22, LM35
- **Light Sensors**: Photoresistor, photodiode
- **Motion Sensors**: PIR, ultrasonic distance
- **Analog Sensors**: Potentiometer, joystick

### Microcontroller Boards

#### Arduino Uno
- **Digital Pins**: 0-13 (pins 2-13 configurable as input/output)
- **Analog Pins**: A0-A5 (can read 0-5V, 10-bit resolution)
- **PWM Pins**: 3, 5, 6, 9, 10, 11 (8-bit PWM output)
- **Special Pins**: 
  - Pin 0, 1: Serial communication (RX/TX)
  - Pin 13: Built-in LED
  - 5V, 3.3V, GND: Power rails
- **Simulation Features**:
  - Real-time pin state monitoring
  - Accurate timing simulation
  - Serial communication support
  - PWM voltage calculation
  - Analog input simulation

## Arduino Programming

ElectroSim provides a full Arduino IDE experience with advanced features:

### Code Editor Features
- **Syntax Highlighting**: Full C++ syntax support
- **Auto-completion**: IntelliSense for Arduino functions and variables
- **Error Detection**: Real-time compilation and error highlighting
- **Code Folding**: Collapse functions and blocks for better organization
- **Multiple Tabs**: Work on multiple sketch files simultaneously

### Arduino Language Support
ElectroSim supports the complete Arduino programming language:

#### Digital I/O Functions
```cpp
pinMode(pin, mode);        // Set pin as INPUT or OUTPUT
digitalWrite(pin, value);  // Write HIGH or LOW to output pin
digitalRead(pin);          // Read digital state of input pin
```

#### Analog I/O Functions
```cpp
analogRead(pin);           // Read analog value (0-1023) from analog pin
analogWrite(pin, value);   // Write PWM value (0-255) to PWM pin
```

#### Time Functions
```cpp
delay(ms);                 // Pause for specified milliseconds
delayMicroseconds(us);     // Pause for specified microseconds
millis();                  // Get milliseconds since program start
micros();                  // Get microseconds since program start
```

#### Serial Communication
```cpp
Serial.begin(baudRate);    // Initialize serial communication
Serial.print(data);        // Print data to serial monitor
Serial.println(data);      // Print data with newline
Serial.available();        // Check for incoming serial data
Serial.read();             // Read byte from serial buffer
```

### Advanced Programming Features

#### Interrupts
```cpp
attachInterrupt(interrupt, function, mode);
detachInterrupt(interrupt);
```

#### PWM Control
```cpp
analogWrite(pin, dutyCycle);  // dutyCycle: 0-255 (0-100% duty cycle)
```

#### Advanced Timer Functions
```cpp
tone(pin, frequency);
noTone(pin);
shiftOut(dataPin, clockPin, bitOrder, value);
shiftIn(dataPin, clockPin, bitOrder);
```

### Serial Monitor
The integrated serial monitor provides:
- **Real-time Output**: See Serial.print() output instantly
- **Input Capability**: Send data to your Arduino program
- **Baud Rate Control**: Match your code's Serial.begin() rate
- **Clear Function**: Clear monitor output
- **Copy/Save**: Copy output to clipboard or save to file

## Simulation Features

ElectroSim provides comprehensive simulation capabilities:

### Real-time Simulation
- **Electrical Modeling**: Accurate current, voltage, and power calculations
- **Timing Accuracy**: Precise delay() and timing function simulation
- **Component Behavior**: Realistic LED brightness, motor positioning, sensor readings

### PWM Simulation
- **Accurate Voltage Output**: PWM duty cycle converted to equivalent analog voltage
- **LED Brightness Control**: Smooth brightness transitions with analogWrite()
- **Servo Positioning**: Precise angle control based on PWM signal

### Monitoring Tools
- **Pin State Indicator**: Visual representation of HIGH/LOW states
- **Voltage Meter**: Real-time voltage measurements at any point
- **Current Flow**: Animated current flow visualization
- **Power Consumption**: Monitor total and per-component power usage

### Performance Analysis
- **Execution Timing**: Monitor loop execution time and delays
- **Memory Usage**: Track SRAM and Flash memory utilization
- **CPU Load**: Visualize processor utilization over time

## Project Management

### Saving and Loading Projects
- **Project Files**: Save complete circuits and code as `.electrosim` files
- **Export Options**: Export circuits as images, code as Arduino sketches
- **Version Control**: Built-in Git integration for tracking changes
- **Backup System**: Automatic project backups and recovery

### Collaboration Features
- **Share Projects**: Export projects for sharing with others
- **Import Libraries**: Load custom component libraries
- **Export to Arduino IDE**: Generate Arduino IDE-compatible projects

### Templates
- **Quick Start**: Pre-built templates for common circuits
- **Educational**: Step-by-step tutorial projects
- **Advanced**: Complex projects showcasing advanced features

## Troubleshooting

### Common Issues

#### Circuit Not Working
1. **Check Connections**: Verify all wires are properly connected
2. **Power Supply**: Ensure Arduino VCC and GND are connected properly
3. **Component Values**: Verify resistor values and LED forward voltages
4. **Pin Assignments**: Make sure code matches physical connections

#### Compilation Errors
1. **Syntax Errors**: Check for missing semicolons, brackets, or parentheses
2. **Variable Names**: Ensure variables are declared before use
3. **Function Names**: Verify Arduino function names are spelled correctly
4. **Pin Numbers**: Confirm pin numbers are valid (0-13 for digital, A0-A5 for analog)

#### Simulation Performance
1. **Complex Circuits**: Simplify circuits if simulation becomes slow
2. **High Frequency**: Reduce PWM frequency for better performance
3. **Memory Issues**: Close unnecessary tabs and applications

### Getting Help
- **Documentation**: Check the built-in help system (Help > Documentation)
- **Tutorials**: Follow step-by-step tutorials (Help > Tutorials)
- **Community**: Visit our GitHub discussions for community support
- **Bug Reports**: Report issues on GitHub Issues page

## Keyboard Shortcuts

### General
- **Ctrl+N**: New project
- **Ctrl+O**: Open project
- **Ctrl+S**: Save project
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+C**: Copy component
- **Ctrl+V**: Paste component

### Canvas
- **Mouse Wheel**: Zoom in/out
- **Middle Click + Drag**: Pan canvas
- **Ctrl+0**: Reset zoom to 100%
- **Ctrl++**: Zoom in
- **Ctrl+-**: Zoom out

### Code Editor
- **Ctrl+Space**: Trigger auto-completion
- **F5**: Upload code to Arduino
- **F9**: Start/stop simulation
- **Ctrl+Shift+M**: Open serial monitor

### Simulation
- **Space**: Play/pause simulation
- **Ctrl+R**: Reset simulation
- **F10**: Step one instruction
- **F11**: Toggle breakpoint

---

## Next Steps

Now that you understand the basics of ElectroSim, try building more complex projects:

1. **Traffic Light Controller**: Use multiple LEDs and timing
2. **Temperature Monitor**: Add temperature sensors and displays
3. **Motor Control**: Control servo motors with potentiometers
4. **Communication Projects**: Use serial communication between devices
5. **Sensor Networks**: Build multi-sensor data logging systems

For more advanced topics, see our [API Documentation](API_DOCUMENTATION.md) and [Development Guide](DEVELOPMENT_GUIDE.md).

Happy Simulating! 🚀