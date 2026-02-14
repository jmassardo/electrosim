/*
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
}