/**
 * Simple E2E Test for Batch Operations - Basic Smoke Test
 */

import { test, expect } from '@playwright/test';

test.describe('Basic UI Smoke Test', () => {
  test('should load learning review page', async ({ page }) => {
    await page.goto('/review');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page).toHaveURL(/\/review/);
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/review');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check for tab buttons
    const activeTab = page.locator('button:has-text("Active"), button:has-text("活跃")');
    await expect(activeTab.first()).toBeVisible({ timeout: 10000 });
  });
});
