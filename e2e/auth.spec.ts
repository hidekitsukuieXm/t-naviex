import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Check for login form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /ログイン|サインイン|Sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Click login button
    await page.getByRole('button', { name: /ログイン|サインイン|Sign in/i }).click();

    // Check for error message
    await expect(page.getByText(/認証|エラー|error|invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected page
    await page.goto('/projects');

    // Should be redirected to login
    await expect(page).toHaveURL(/auth\/signin/);
  });
});
