/**
 * E2E Tests for Batch Operations
 *
 * Tests the complete user workflow for batch operations on learning observations
 */

import { test, expect } from '@playwright/test';

test.describe('Batch Operations Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to learning review page
    await page.goto('/review');

    // Wait for page to load and observations to render
    await page.waitForSelector('[data-testid="observation-card"]', { timeout: 10000 });
  });

  test('should display batch operation UI when observations are selected', async ({ page }) => {
    // Initially, batch operation bar should be hidden
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeHidden();

    // Click on first observation checkbox
    const firstCheckbox = page.locator('[data-testid="observation-checkbox"]').first();
    await firstCheckbox.click();

    // Batch operation bar should now be visible
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeVisible();

    // Should show "1 selected"
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('1');
  });

  test('should select multiple observations', async ({ page }) => {
    // Click on first 3 observation checkboxes
    const checkboxes = page.locator('[data-testid="observation-checkbox"]');
    const count = await checkboxes.count();
    const selectCount = Math.min(3, count);

    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).click();
    }

    // Should show correct count
    await expect(page.locator('[data-testid="selection-count"]')).toContainText(`${selectCount}`);

    // All selected observations should have visual highlight
    for (let i = 0; i < selectCount; i++) {
      const card = page.locator('[data-testid="observation-card"]').nth(i);
      await expect(card).toHaveClass(/border-amber-400/);
    }
  });

  test('should select all observations with select-all checkbox', async ({ page }) => {
    // Click select-all checkbox
    await page.locator('[data-testid="select-all-checkbox"]').click();

    // Get total observation count
    const totalCount = await page.locator('[data-testid="observation-card"]').count();

    // Should show all selected
    await expect(page.locator('[data-testid="selection-count"]')).toContainText(`${totalCount}`);

    // All observations should be highlighted
    const cards = page.locator('[data-testid="observation-card"]');
    for (let i = 0; i < totalCount; i++) {
      await expect(cards.nth(i)).toHaveClass(/border-amber-400/);
    }
  });

  test('should clear selection', async ({ page }) => {
    // Select first observation
    await page.locator('[data-testid="observation-checkbox"]').first().click();
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeVisible();

    // Click clear selection button
    await page.locator('[data-testid="clear-selection-btn"]').click();

    // Batch operation bar should be hidden
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeHidden();

    // No observations should be highlighted
    const cards = page.locator('[data-testid="observation-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).not.toHaveClass(/border-amber-400/);
    }
  });

  test('should batch promote observations', async ({ page }) => {
    // Select 2 observations
    await page.locator('[data-testid="observation-checkbox"]').first().click();
    await page.locator('[data-testid="observation-checkbox"]').nth(1).click();

    // Click batch promote button
    await page.locator('[data-testid="batch-promote-btn"]').click();

    // Should show success toast
    await expect(page.locator('.toast')).toContainText(/promoted|提升/i);

    // Wait for operation to complete
    await page.waitForTimeout(1000);

    // Batch operation bar should be hidden (selection cleared)
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeHidden();
  });

  test('should batch delete observations with confirmation', async ({ page }) => {
    // Select 2 observations
    await page.locator('[data-testid="observation-checkbox"]').first().click();
    await page.locator('[data-testid="observation-checkbox"]').nth(1).click();

    // Click batch delete button
    await page.locator('[data-testid="batch-delete-btn"]').click();

    // Should show confirmation dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toContainText(/delete|删除/i);

    // Confirm deletion
    await page.locator('button:has-text("确认")').click();

    // Should show success toast
    await expect(page.locator('.toast')).toContainText(/deleted|已删除|archived|已归档/i);

    // Wait for operation to complete
    await page.waitForTimeout(1000);

    // Batch operation bar should be hidden
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeHidden();
  });

  test('should batch ignore observations with reason', async ({ page }) => {
    // Select 2 observations
    await page.locator('[data-testid="observation-checkbox"]').first().click();
    await page.locator('[data-testid="observation-checkbox"]').nth(1).click();

    // Click batch ignore button
    await page.locator('[data-testid="batch-ignore-btn"]').click();

    // Should show reason input dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Enter reason (optional)
    const reasonInput = page.locator('input[placeholder*="reason"]').or(page.locator('textarea[placeholder*="reason"]'));
    if (await reasonInput.count() > 0) {
      await reasonInput.fill('Not relevant for testing');
    }

    // Confirm ignore
    await page.locator('button:has-text("确认")').click();

    // Should show success toast
    await expect(page.locator('.toast')).toContainText(/ignored|已忽略/i);

    // Wait for operation to complete
    await page.waitForTimeout(1000);

    // Batch operation bar should be hidden
    await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeHidden();
  });

  test('should show warning for large batch selection', async ({ page }) => {
    // Click select-all to select all observations
    await page.locator('[data-testid="select-all-checkbox"]').click();

    const totalCount = await page.locator('[data-testid="observation-card"]').count();

    // If more than 50 observations, should show warning when attempting operation
    if (totalCount > 50) {
      await page.locator('[data-testid="batch-promote-btn"]').click();

      // Should show warning dialog
      await expect(page.locator('[role="dialog"]')).toContainText(/large|较大|continue|继续/i);
    }
  });

  test('should persist selection across filter changes', async ({ page }) => {
    // Select first 2 observations
    await page.locator('[data-testid="observation-checkbox"]').first().click();
    await page.locator('[data-testid="observation-checkbox"]').nth(1).click();

    // Should show 2 selected
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('2');

    // Change filter (e.g., switch tier)
    const filterButton = page.locator('[data-testid="tier-filter"]').or(page.locator('button:has-text("Silver")'));
    if (await filterButton.count() > 0) {
      await filterButton.first().click();

      // Selection count should still show (with "hidden" count if filtered out)
      await expect(page.locator('[data-testid="batch-operation-bar"]')).toBeVisible();
    }
  });
});

test.describe('Archive Pool Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/review');

    // Navigate to archived tab
    await page.locator('button:has-text("Archived")').or(page.locator('button:has-text("归档")')).click();

    // Wait for archived observations to load
    await page.waitForTimeout(1000);
  });

  test('should display archived observations with metadata', async ({ page }) => {
    // Check if there are any archived observations
    const archivedCards = page.locator('[data-testid="archived-observation-card"]').or(page.locator('.border-purple-500'));
    const count = await archivedCards.count();

    if (count > 0) {
      // First card should show archive reason badge
      const firstCard = archivedCards.first();
      await expect(firstCard).toContainText(/user_deleted|capacity_control|expired|用户删除|容量控制|已过期/i);

      // Should show archive timestamp
      await expect(firstCard).toContainText(/归档于|archived|过期倒计时|expires/i);
    }
  });

  test('should filter archived observations by reason', async ({ page }) => {
    // Click on "user_deleted" filter
    const userDeletedFilter = page.locator('button:has-text("用户删除")').or(page.locator('button:has-text("User Deleted")'));
    if (await userDeletedFilter.count() > 0) {
      await userDeletedFilter.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // All visible cards should have user_deleted reason
      const cards = page.locator('[data-testid="archived-observation-card"]').or(page.locator('.border-purple-500'));
      const visibleCount = await cards.count();

      for (let i = 0; i < Math.min(5, visibleCount); i++) {
        await expect(cards.nth(i)).toContainText(/user_deleted|用户删除/i);
      }
    }
  });

  test('should search archived observations', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[placeholder*="搜索"]').or(page.locator('input[placeholder*="search"]'));
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');

      // Wait for search to apply
      await page.waitForTimeout(500);

      // Should show filtered results or "no results" message
      const hasResults = await page.locator('[data-testid="archived-observation-card"]').count() > 0;
      const hasEmptyState = await page.locator('text=/无匹配结果|no.*match/i').count() > 0;

      expect(hasResults || hasEmptyState).toBeTruthy();
    }
  });

  test('should restore observation from archive', async ({ page }) => {
    // Find a restore button
    const restoreButton = page.locator('button:has-text("恢复")').or(page.locator('button:has-text("Restore")'));
    const restoreCount = await restoreButton.count();

    if (restoreCount > 0) {
      // Click first restore button
      await restoreButton.first().click();

      // Should show success toast
      await expect(page.locator('.toast')).toContainText(/restored|已恢复/i);

      // Wait for operation to complete
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Similarity Warning Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/review');
    await page.waitForSelector('[data-testid="observation-card"]', { timeout: 10000 });
  });

  test('should display similarity warning badge', async ({ page }) => {
    // Look for observations with similarity warnings
    const warningBadge = page.locator('[data-testid="similarity-warning"]').or(page.locator('text=/similar.*deleted|相似.*删除/i'));
    const warningCount = await warningBadge.count();

    if (warningCount > 0) {
      // Badge should be visible
      await expect(warningBadge.first()).toBeVisible();

      // Should contain warning icon
      await expect(warningBadge.first()).toContainText(/⚠/);
    }
  });

  test('should expand similarity warning details', async ({ page }) => {
    // Look for observations with similarity warnings
    const warningBadge = page.locator('[data-testid="similarity-warning"]').or(page.locator('text=/similar.*deleted|相似.*删除/i'));
    const warningCount = await warningBadge.count();

    if (warningCount > 0) {
      // Click on warning badge or expand button
      const expandButton = page.locator('[data-testid="expand-similarity-details"]').or(warningBadge.first());
      await expandButton.click();

      // Should show similarity details
      await expect(page.locator('[data-testid="similarity-details"]')).toBeVisible();

      // Should show similarity percentage
      await expect(page.locator('[data-testid="similarity-details"]')).toContainText(/%/);
    }
  });

  test('should handle "Delete Again" action', async ({ page }) => {
    // Look for "Delete Again" button in similarity warnings
    const deleteAgainBtn = page.locator('button:has-text("Delete Again")').or(page.locator('button:has-text("再次删除")'));
    const btnCount = await deleteAgainBtn.count();

    if (btnCount > 0) {
      await deleteAgainBtn.first().click();

      // Should show confirmation or directly delete
      const hasConfirm = await page.locator('[role="dialog"]').count() > 0;
      if (hasConfirm) {
        await page.locator('button:has-text("确认")').click();
      }

      // Should show success toast
      await expect(page.locator('.toast')).toContainText(/deleted|已删除/i);
    }
  });

  test('should handle "Keep This Time" action', async ({ page }) => {
    // Look for "Keep This Time" button
    const keepBtn = page.locator('button:has-text("Keep This Time")').or(page.locator('button:has-text("保留")'));
    const btnCount = await keepBtn.count();

    if (btnCount > 0) {
      await keepBtn.first().click();

      // Warning should be dismissed
      await page.waitForTimeout(500);

      // Could verify that warning badge is no longer visible for this observation
    }
  });
});
