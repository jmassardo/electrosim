import { test, expect } from '@playwright/test';

test.describe('ElectroSim Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display welcome screen', async ({ page }) => {
    await expect(page).toHaveTitle(/ElectroSim/);
    await expect(page.locator('text=Welcome to ElectroSim')).toBeVisible();
    await expect(page.locator('text=🔌 ElectroSim')).toBeVisible();
  });

  test('should show main navigation elements', async ({ page }) => {
    // Check for main UI elements
    await expect(page.locator('text=New Project')).toBeVisible();
    await expect(page.locator('text=Open Project')).toBeVisible();
    
    // Wait for application toolbar to load
    await page.waitForSelector('[data-testid="application-toolbar"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="application-toolbar"]')).toBeVisible();
  });

  test('should allow creating a new project', async ({ page }) => {
    // Click New Project button
    await page.click('text=New Project');
    
    // Should navigate to main workspace
    await expect(page.locator('[data-testid="main-workspace"]')).toBeVisible();
    
    // Check for essential workspace components
    await expect(page.locator('[data-testid="component-palette"]')).toBeVisible();
    await expect(page.locator('[data-testid="circuit-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();
  });
});