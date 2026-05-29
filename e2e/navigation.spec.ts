import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  // Note: These tests require authentication setup
  // In a real scenario, you would set up authentication state

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');

    // Check page title contains app name
    await expect(page).toHaveTitle(/T-NaviEx/i);
  });

  test('should display header navigation', async ({ page }) => {
    await page.goto('/');

    // Check for header elements
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be accessible on mobile
    await expect(page.locator('body')).toBeVisible();
  });
});
