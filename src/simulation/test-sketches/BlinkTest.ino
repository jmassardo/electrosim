/*
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
}