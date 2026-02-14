/**
 * Test sketches for Arduino emulation
 */

export const testSketches = {
  blink: `/*
  Blink Test - LED on pin 13 blinks every second
  
  This sketch demonstrates basic digitalWrite and delay functionality.
  The built-in LED on pin 13 should blink with a 1-second interval.
*/

void setup() {
  // Initialize digital pin 13 as an output
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);   // Turn the LED on
  delay(1000);              // Wait for a second
  digitalWrite(13, LOW);    // Turn the LED off
  delay(1000);              // Wait for a second
}`,

  button: `/*
  Button Test - Button on pin 2 controls LED on pin 13
  
  This sketch demonstrates digitalRead and digitalWrite functionality.
  When the button is pressed, the LED should turn on.
  When the button is released, the LED should turn off.
*/

const int buttonPin = 2;     // Pin connected to pushbutton
const int ledPin = 13;       // Pin connected to LED

void setup() {
  // Initialize the LED pin as an output
  pinMode(ledPin, OUTPUT);
  // Initialize the pushbutton pin as an input with pull-up
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  // Read the state of the pushbutton value
  int buttonState = digitalRead(buttonPin);
  
  // Check if the pushbutton is pressed (LOW due to INPUT_PULLUP)
  if (buttonState == LOW) {
    // Turn LED on
    digitalWrite(ledPin, HIGH);
  } else {
    // Turn LED off
    digitalWrite(ledPin, LOW);
  }
}`,

  serial: `/*
  Serial Test - Sends "Hello World" every second
  
  This sketch demonstrates Serial.print functionality.
  The message should appear in the serial monitor at 9600 baud.
*/

void setup() {
  // Initialize serial communication at 9600 bits per second
  Serial.begin(9600);
  // Optional: wait for serial port to connect (Leonardo only)
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  Serial.println("Serial Test Started!");
}

void loop() {
  // Send "Hello World" message
  Serial.println("Hello World!");
  
  // Print current millis for debugging
  Serial.print("Time: ");
  Serial.print(millis());
  Serial.println(" ms");
  
  // Wait for a second
  delay(1000);
}`,

  analog: `/*
  Analog Test - Read analog value and control LED brightness
  
  This sketch demonstrates analogRead and analogWrite (PWM) functionality.
  The analog value from pin A0 should control the brightness of LED on pin 9.
*/

const int analogPin = A0;    // Pin to read analog value
const int ledPin = 9;        // PWM pin for LED (must support PWM)

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);
  
  // Initialize the LED pin as an output
  pinMode(ledPin, OUTPUT);
  
  // Analog pins don't need pinMode - they're input by default
  Serial.println("Analog Test Started!");
}

void loop() {
  // Read the analog value (0-1023)
  int sensorValue = analogRead(analogPin);
  
  // Convert to PWM value (0-255)
  int brightness = map(sensorValue, 0, 1023, 0, 255);
  
  // Set LED brightness
  analogWrite(ledPin, brightness);
  
  // Print values for debugging
  Serial.print("Analog: ");
  Serial.print(sensorValue);
  Serial.print(" -> PWM: ");
  Serial.println(brightness);
  
  // Small delay to avoid overwhelming serial output
  delay(100);
}`
};

export type TestSketchName = keyof typeof testSketches;

/**
 * Get a test sketch by name
 */
export function getTestSketch(name: TestSketchName): string {
  return testSketches[name];
}

/**
 * Get all available test sketch names
 */
export function getTestSketchNames(): TestSketchName[] {
  return Object.keys(testSketches) as TestSketchName[];
}

/**
 * Load and execute a test sketch on an Arduino board
 */
export async function loadTestSketch(board: any, sketchName: TestSketchName): Promise<any> {
  const sketch = getTestSketch(sketchName);
  return await board.loadSketch(sketch);
}