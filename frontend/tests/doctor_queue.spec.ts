import { test, expect } from '@playwright/test';

test('doctor queue and visit triage flow', async ({ page }) => {
    test.setTimeout(120000);
    console.log('Navigating to Sanjeevni...');
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });

    // Wait for login form
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 40000 });

    // Use Quick Select button for PHC Doctor
    await page.getByRole('button', { name: 'PHC Doctor' }).click();
    await page.waitForTimeout(500);

    // Sign in
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify Guided Visit / Assessment loaded
    await expect(page.getByRole('heading', { name: 'New Assessment' }).first()).toBeVisible({ timeout: 30000 });

    // Navigate to Doctor PHC Queue
    await page.getByRole('button', { name: 'PHC Dashboard' }).click();

    // Verify Doctor PHC Dashboard KPIs
    await expect(page.getByText('Doctor Clinical Triage Queue')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Critical (RED)')).toBeVisible();
    await expect(page.getByText('Prioritized Patient Roster')).toBeVisible();

    // Verify RED patient Kamla Bai is prioritized on top
    await expect(page.getByText('Kamla Bai')).toBeVisible();
});
