import { test, expect } from '@playwright/test';

test('auth flow', async ({ page }) => {
    console.log('Navigating to home...');
    await page.goto('http://localhost:5173/');
    console.log('Navigation complete.');

    // Should see login page
    await expect(page).toHaveTitle(/Sanjeevni Healthcarer/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Switch to Signup
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    // Switch back to Login
    await page.getByRole('button', { name: 'Back to Login' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Login
    await page.getByPlaceholder('doc@hospital.com').fill('doc@hospital.com');
    await page.getByPlaceholder('Enter password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Dashboard Validation
    // Need to wait for login
    await expect(page.getByText('New Assessment')).toBeVisible({ timeout: 10000 });

    // Navigation to Logs
    await page.getByRole('button', { name: 'Audit Logs' }).click();
    await expect(page.getByText('Admin Audit Log')).toBeVisible();
});
