import { test, expect } from '@playwright/test';

test.describe('Arduino Code Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=New Project');
    await page.waitForSelector('[data-testid="main-workspace"]');
  });

  test('should display Monaco editor with Arduino code', async ({ page }) => {
    const codeEditor = page.locator('[data-testid="code-editor"]');
    await expect(codeEditor).toBeVisible();
    
    // Check for default Arduino sketch structure
    await expect(page.locator('text=void setup()')).toBeVisible();
    await expect(page.locator('text=void loop()')).toBeVisible();
  });

  test('should provide Arduino syntax highlighting', async ({ page }) => {
    const editor = page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    
    // Type some Arduino code
    await page.click('.monaco-editor');
    await page.keyboard.type('int ledPin = 13;');
    
    // Verify syntax highlighting (tokens should have classes)
    await expect(page.locator('.token.keyword')).toBeVisible(); // int keyword
    await expect(page.locator('.token.number')).toBeVisible();  // 13 number
  });

  test('should provide Arduino autocompletion', async ({ page }) => {
    await page.click('.monaco-editor');
    
    // Type partial Arduino function
    await page.keyboard.type('digital');
    
    // Should show autocomplete suggestions
    await expect(page.locator('.suggest-widget')).toBeVisible();
    await expect(page.locator('text=digitalWrite')).toBeVisible();
    await expect(page.locator('text=digitalRead')).toBeVisible();
  });

  test('should compile Arduino code', async ({ page }) => {
    // Write a simple blink sketch
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
    `);
    
    // Click compile button
    await page.click('[data-testid="compile-button"]');
    
    // Check for successful compilation
    await expect(page.locator('[data-testid="compilation-success"]')).toBeVisible();
    await expect(page.locator('text=Compilation successful')).toBeVisible();
  });

  test('should show compilation errors', async ({ page }) => {
    // Write invalid Arduino code
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  invalid_function();
}
    `);
    
    // Click compile button
    await page.click('[data-testid="compile-button"]');
    
    // Check for compilation errors
    await expect(page.locator('[data-testid="compilation-error"]')).toBeVisible();
    await expect(page.locator('text=Compilation failed')).toBeVisible();
  });

  test('should integrate with simulation', async ({ page }) => {
    // Add an LED to the canvas first
    const led = page.locator('[data-testid="component-led"]');
    await led.dragTo(page.locator('[data-testid="circuit-canvas"]'));
    
    // Write code that controls the LED
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
    `);
    
    // Compile and start simulation
    await page.click('[data-testid="compile-button"]');
    await page.waitForSelector('[data-testid="compilation-success"]');
    await page.click('[data-testid="start-simulation"]');
    
    // Verify simulation is running
    await expect(page.locator('[data-testid="simulation-status"]')).toContainText('Running');
    
    // LED should be blinking (check for state changes)
    await page.waitForTimeout(1000); // Wait for one blink cycle
    // Note: In real implementation, we'd check LED visual state changes
  });
});