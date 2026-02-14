import { test, expect } from '@playwright/test';

test.describe('Component Library and Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Create a new project to access the main workspace
    await page.click('text=New Project');
    await page.waitForSelector('[data-testid="main-workspace"]');
  });

  test('should display component palette with categories', async ({ page }) => {
    const palette = page.locator('[data-testid="component-palette"]');
    await expect(palette).toBeVisible();
    
    // Check for component categories
    await expect(page.locator('text=Basic Components')).toBeVisible();
    await expect(page.locator('text=Sensors')).toBeVisible();
    await expect(page.locator('text=Actuators')).toBeVisible();
    await expect(page.locator('text=Communication')).toBeVisible();
  });

  test('should allow dragging components to canvas', async ({ page }) => {
    // Find LED component
    const ledComponent = page.locator('[data-testid="component-led"]');
    await expect(ledComponent).toBeVisible();
    
    // Find canvas
    const canvas = page.locator('[data-testid="circuit-canvas"]');
    await expect(canvas).toBeVisible();
    
    // Drag LED to canvas
    await ledComponent.dragTo(canvas);
    
    // Verify component appears on canvas
    await expect(page.locator('[data-testid="canvas-component-led"]')).toBeVisible();
  });

  test('should show component properties panel when selected', async ({ page }) => {
    // Add a resistor to canvas
    const resistor = page.locator('[data-testid="component-resistor"]');
    await resistor.dragTo(page.locator('[data-testid="circuit-canvas"]'));
    
    // Click on the resistor in canvas
    await page.click('[data-testid="canvas-component-resistor"]');
    
    // Check properties panel appears
    await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible();
    await expect(page.locator('text=Resistance')).toBeVisible();
  });

  test('should allow component wiring', async ({ page }) => {
    // Add LED and resistor to canvas
    const led = page.locator('[data-testid="component-led"]');
    const resistor = page.locator('[data-testid="component-resistor"]');
    const canvas = page.locator('[data-testid="circuit-canvas"]');
    
    await led.dragTo(canvas);
    await resistor.dragTo(canvas);
    
    // Select wire tool
    await page.click('[data-testid="wire-tool"]');
    
    // Connect components
    await page.click('[data-testid="led-terminal-positive"]');
    await page.click('[data-testid="resistor-terminal-1"]');
    
    // Verify wire connection
    await expect(page.locator('[data-testid="wire-connection"]')).toBeVisible();
  });
});