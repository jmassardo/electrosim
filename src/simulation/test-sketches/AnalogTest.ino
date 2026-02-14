/*
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
}