import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create new project', async ({ page }) => {
    await page.click('text=New Project');
    
    await expect(page.locator('[data-testid="main-workspace"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-name"]')).toContainText('Untitled Project');
    
    // Should have default Arduino sketch
    await expect(page.locator('text=void setup()')).toBeVisible();
    await expect(page.locator('text=void loop()')).toBeVisible();
  });

  test('should save project', async ({ page }) => {
    // Create a project with some content
    await page.click('text=New Project');
    
    // Add a component
    const led = page.locator('[data-testid="component-led"]');
    await led.dragTo(page.locator('[data-testid="circuit-canvas"]'));
    
    // Modify code
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('// My custom Arduino code\nvoid setup() {\n  // Init code\n}\n');
    
    // Save project
    await page.keyboard.press('Control+s');
    
    // Should show save dialog or confirmation
    await expect(page.locator('[data-testid="save-dialog"]')).toBeVisible();
    
    // Enter project name
    await page.fill('[data-testid="project-name-input"]', 'My Test Project');
    await page.click('[data-testid="save-confirm"]');
    
    // Should show save confirmation
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should open existing project', async ({ page }) => {
    // First create and save a project (assuming one exists)
    await page.click('text=Open Project');
    
    // Should show file browser or recent projects
    await expect(page.locator('[data-testid="project-browser"]')).toBeVisible();
    
    // Select a project file (mock scenario)
    if (await page.locator('[data-testid="sample-project"]').isVisible()) {
      await page.click('[data-testid="sample-project"]');
      await page.click('[data-testid="open-confirm"]');
      
      // Should load the project
      await expect(page.locator('[data-testid="main-workspace"]')).toBeVisible();
    }
  });

  test('should handle recent projects list', async ({ page }) => {
    // Check for recent projects in welcome screen
    const recentProjects = page.locator('[data-testid="recent-projects"]');
    
    if (await recentProjects.isVisible()) {
      // Should show list of recent projects
      const projectItems = page.locator('[data-testid="recent-project-item"]');
      const count = await projectItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
      
      if (count > 0) {
        // Click on first recent project
        await projectItems.first().click();
        await expect(page.locator('[data-testid="main-workspace"]')).toBeVisible();
      }
    }
  });

  test('should export project to Arduino IDE', async ({ page }) => {
    // Create a project
    await page.click('text=New Project');
    
    // Add some code
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
    `);
    
    // Export to Arduino IDE
    await page.click('[data-testid="menu-file"]');
    await page.click('[data-testid="export-arduino"]');
    
    // Should show export options
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    
    // Configure export settings
    await page.selectOption('[data-testid="board-select"]', 'Arduino Uno');
    await page.click('[data-testid="export-confirm"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
  });

  test('should import Arduino sketch', async ({ page }) => {
    await page.click('[data-testid="menu-file"]');
    await page.click('[data-testid="import-sketch"]');
    
    // Should show import dialog
    await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible();
    
    // Mock file selection (in real test, would need file upload handling)
    // For now, test the UI elements are present
    await expect(page.locator('[data-testid="file-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-confirm"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-cancel"]')).toBeVisible();
  });

  test('should manage project settings', async ({ page }) => {
    await page.click('text=New Project');
    
    // Open project settings
    await page.click('[data-testid="project-settings"]');
    
    await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible();
    
    // Check settings categories
    await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="compilation-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="simulation-settings"]')).toBeVisible();
    
    // Modify some settings
    await page.fill('[data-testid="project-description"]', 'Test project description');
    await page.selectOption('[data-testid="target-board"]', 'Arduino Nano');
    await page.check('[data-testid="enable-serial-debug"]');
    
    // Save settings
    await page.click('[data-testid="save-settings"]');
    
    // Should close dialog and apply settings
    await expect(page.locator('[data-testid="settings-dialog"]')).not.toBeVisible();
  });

  test('should show project statistics', async ({ page }) => {
    await page.click('text=New Project');
    
    // Add some components and code
    const led = page.locator('[data-testid="component-led"]');
    const resistor = page.locator('[data-testid="component-resistor"]');
    const canvas = page.locator('[data-testid="circuit-canvas"]');
    
    await led.dragTo(canvas);
    await resistor.dragTo(canvas);
    
    // Open project info
    await page.click('[data-testid="project-info"]');
    
    await expect(page.locator('[data-testid="project-stats"]')).toBeVisible();
    
    // Should show component count
    await expect(page.locator('[data-testid="component-count"]')).toContainText('2');
    
    // Should show code statistics
    await expect(page.locator('[data-testid="code-lines"]')).toBeVisible();
    await expect(page.locator('[data-testid="sketch-size"]')).toBeVisible();
  });

  test('should handle auto-save', async ({ page }) => {
    await page.click('text=New Project');
    
    // Make changes to trigger auto-save
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.type('// Auto-save test comment');
    
    // Wait for auto-save indicator
    await page.waitForSelector('[data-testid="auto-save-indicator"]', { timeout: 5000 });
    
    // Should show auto-save status
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toContainText('Saved');
  });

  test('should warn about unsaved changes', async ({ page }) => {
    await page.click('text=New Project');
    
    // Make changes
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.type('// Unsaved changes');
    
    // Try to close/navigate away
    await page.click('[data-testid="new-project"]');
    
    // Should show unsaved changes warning
    await expect(page.locator('[data-testid="unsaved-warning"]')).toBeVisible();
    await expect(page.locator('text=You have unsaved changes')).toBeVisible();
    
    // Options to save, discard, or cancel
    await expect(page.locator('[data-testid="save-changes"]')).toBeVisible();
    await expect(page.locator('[data-testid="discard-changes"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-action"]')).toBeVisible();
  });

  test('should support project templates', async ({ page }) => {
    await page.click('text=New Project');
    
    // Should show template options
    if (await page.locator('[data-testid="project-templates"]').isVisible()) {
      await expect(page.locator('[data-testid="blank-template"]')).toBeVisible();
      await expect(page.locator('[data-testid="blink-template"]')).toBeVisible();
      await expect(page.locator('[data-testid="sensor-template"]')).toBeVisible();
      
      // Select a template
      await page.click('[data-testid="blink-template"]');
      await page.click('[data-testid="use-template"]');
      
      // Should load template content
      await expect(page.locator('text=digitalWrite(LED_BUILTIN, HIGH)')).toBeVisible();
    }
  });

  test('should validate project files', async ({ page }) => {
    await page.click('text=New Project');
    
    // Write invalid Arduino code
    await page.click('[data-testid="code-editor"]');
    await page.keyboard.press('Control+a');
    await page.keyboard.type(`
void setup() {
  invalid_syntax here;
  missing_semicolon()
}
    `);
    
    // Try to save
    await page.keyboard.press('Control+s');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    await expect(page.locator('text=Syntax error')).toBeVisible();
    
    // Should prevent saving invalid project
    await expect(page.locator('[data-testid="save-disabled"]')).toBeVisible();
  });
});