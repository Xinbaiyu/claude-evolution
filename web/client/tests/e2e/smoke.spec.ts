import { test, expect } from '@playwright/test';

test.describe('Basic UI Smoke Test', () => {
  test('should load learning review page', async ({ page }) => {
    const response = await page.goto('http://localhost:5173/review');
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/review/);
  });

  test('should display observation cards or empty state', async ({ page }) => {
    await page.goto('http://localhost:5173/review');
    
    // Wait for page content to load
    await page.waitForTimeout(3000);
    
    // Check if observation cards exist or empty state is shown
    const hasCards = await page.locator('[data-testid="observation-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=/暂无|No observations/').count() > 0;
    
    // At least one should be visible
    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test('should have batch operation UI hidden initially', async ({ page }) => {
    await page.goto('http://localhost:5173/review');
    await page.waitForTimeout(3000);
    
    // Batch operation bar should be hidden when nothing is selected
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeHidden();
  });
});
