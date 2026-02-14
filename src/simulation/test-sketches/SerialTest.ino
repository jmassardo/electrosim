/*
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
}