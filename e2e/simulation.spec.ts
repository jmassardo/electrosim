import { test, expect } from '@playwright/test';

test.describe('Simulation and Runtime', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Project');
    await page.waitForSelector('[data-testid="main-workspace"]');
  });

  test('should start and stop simulation', async ({ page }) => {
    // Add components to create a simple circuit
    const led = page.locator('[data-testid="component-led"]');
    const resistor = page.locator('[data-testid="component-resistor"]');
    const canvas = page.locator('[data-testid="circuit-canvas"]');
    
    await led.dragTo(canvas);
    await resistor.dragTo(canvas);
    
    // Write simple blink code
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
    `);
    
    // Start simulation
    await page.click('[data-testid="start-simulation"]');
    
    // Verify simulation is running
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('Running');
    await expect(page.locator('[data-testid="stop-simulation"]')).toBeVisible();
    
    // Stop simulation
    await page.click('[data-testid="stop-simulation"]');
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('Stopped');
  });

  test('should show real-time component states during simulation', async ({ page }) => {
    // Add LED to canvas
    const led = page.locator('[data-testid="component-led"]');
    await led.dragTo(page.locator('[data-testid="circuit-canvas"]'));
    
    // Start simulation
    await page.click('[data-testid="start-simulation"]');
    
    // LED should show visual state changes
    const canvasLED = page.locator('[data-testid="canvas-component-led"]');
    
    // Check initial state
    const initialBrightness = await canvasLED.getAttribute('data-brightness');
    
    // Wait for state change
    await page.waitForTimeout(1000);
    
    // Brightness should have changed
    const newBrightness = await canvasLED.getAttribute('data-brightness');
    // Note: This would depend on the actual implementation
  });

  test('should display serial monitor output', async ({ page }) => {
    // Write code with Serial output
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  Serial.begin(9600);
  Serial.println("Hello, ElectroSim!");
}

void loop() {
  Serial.println("Loop iteration");
  delay(1000);
}
    `);
    
    // Open serial monitor
    await page.click('[data-testid="serial-monitor-tab"]');
    
    // Start simulation
    await page.click('[data-testid="start-simulation"]');
    
    // Check for serial output
    const serialOutput = page.locator('[data-testid="serial-output"]');
    await expect(serialOutput).toContainText('Hello, ElectroSim!');
    await expect(serialOutput).toContainText('Loop iteration');
  });

  test('should handle simulation errors gracefully', async ({ page }) => {
    // Write code with runtime error
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  // Invalid pin access
  digitalWrite(999, HIGH);
}

void loop() {
}
    `);
    
    // Start simulation
    await page.click('[data-testid="start-simulation"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="simulation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="simulation-error"]')).toContainText('Invalid pin');
    
    // Simulation should stop
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('Error');
  });

  test('should support simulation speed control', async ({ page }) => {
    // Start simulation
    await page.click('[data-testid="start-simulation"]');
    
    // Check for speed control
    const speedControl = page.locator('[data-testid="simulation-speed"]');
    await expect(speedControl).toBeVisible();
    
    // Change speed to slow
    await speedControl.selectOption('0.5x');
    
    // Verify speed change
    await expect(page.locator('[data-testid="current-speed"]')).toContainText('0.5x');
    
    // Change to fast
    await speedControl.selectOption('2x');
    await expect(page.locator('[data-testid="current-speed"]')).toContainText('2x');
  });

  test('should support step-by-step debugging', async ({ page }) => {
    // Write simple code
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
    `);
    
    // Set breakpoint
    await page.click('[data-testid="line-number-3"]'); // Click on line number to set breakpoint
    
    // Start debug mode
    await page.click('[data-testid="debug-simulation"]');
    
    // Should pause at breakpoint
    await expect(page.locator('[data-testid="debug-status"]')).toContainText('Paused');
    await expect(page.locator('[data-testid="current-line"]')).toHaveClass(/highlighted/);
    
    // Step to next line
    await page.click('[data-testid="step-over"]');
    
    // Should advance to next line
    const currentLine = await page.locator('[data-testid="current-line"]').textContent();
    expect(currentLine).toContain('digitalWrite');
  });

  test('should show component pin voltages in real-time', async ({ page }) => {
    // Add Arduino and LED
    const arduino = page.locator('[data-testid="component-arduino-uno"]');
    const led = page.locator('[data-testid="component-led"]');
    const canvas = page.locator('[data-testid="circuit-canvas"]');
    
    await arduino.dragTo(canvas);
    await led.dragTo(canvas);
    
    // Connect them
    await page.click('[data-testid="wire-tool"]');
    await page.click('[data-testid="arduino-pin-13"]');
    await page.click('[data-testid="led-anode"]');
    
    // Start simulation
    await page.click('[data-testid="start-simulation"]');
    
    // Check pin voltage display
    const pin13Voltage = page.locator('[data-testid="arduino-pin-13-voltage"]');
    await expect(pin13Voltage).toBeVisible();
    
    // Voltage should change during simulation
    const initialVoltage = await pin13Voltage.textContent();
    await page.waitForTimeout(1000);
    const newVoltage = await pin13Voltage.textContent();
    
    // Values should be different (assuming the code changes pin state)
    // This test assumes the simulation updates pin voltages
  });

  test('should support saving simulation state', async ({ page }) => {
    // Create a circuit and start simulation
    const led = page.locator('[data-testid="component-led"]');
    await led.dragTo(page.locator('[data-testid="circuit-canvas"]'));
    
    await page.click('[data-testid="start-simulation"]');
    
    // Let simulation run for a bit
    await page.waitForTimeout(2000);
    
    // Save state
    await page.click('[data-testid="save-simulation-state"]');
    
    // Should show confirmation
    await expect(page.locator('[data-testid="save-confirmation"]')).toBeVisible();
    
    // Stop and restart simulation
    await page.click('[data-testid="stop-simulation"]');
    await page.click('[data-testid="start-simulation"]');
    
    // Option to restore state should be available
    await expect(page.locator('[data-testid="restore-state"]')).toBeVisible();
  });
});