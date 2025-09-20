// Test file for blink sketch
void setup() {
  // Test digital pin output
  expect(digitalRead(13)).toBe(LOW);
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  expect(digitalRead(13)).toBe(HIGH);
  delay(1000);
  
  digitalWrite(13, LOW);
  expect(digitalRead(13)).toBe(LOW);
  delay(1000);
}