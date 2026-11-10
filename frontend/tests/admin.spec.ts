import { test, expect } from '@playwright/test';

test.describe('Admin Features', () => {
    test.setTimeout(60000); // Increase timeout
    test('RBAC and Audit Log Access', async ({ page }) => {
        // 1. Login as Admin
        await page.goto('http://localhost:5173/');
        // If already logged in (check for user menu button), logout
        const userMenu = page.locator('button:has(div.h-9.w-9)'); // User avatar button
        if (await userMenu.isVisible()) {
            await userMenu.click();
            await page.getByRole('button', { name: 'Sign Out' }).click();
        }

        await page.getByText("Already have an account? Sign In").click().catch(() => { });

        await page.getByPlaceholder('doc@hospital.com').fill('admin@hospital.org');
        await page.getByPlaceholder('Enter password').fill('password123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // 2. Verify Audit Logs Access
        await expect(page.getByRole('button', { name: 'Audit Logs' })).toBeVisible();
        await page.getByRole('button', { name: 'Audit Logs' }).click();

        // 3. Verify Table Headers (New Clinician Column)
        await expect(page.getByRole('cell', { name: 'Clinician' })).toBeVisible();

        // 4. Logout
        await page.getByRole('button', { name: 'Admin' }).click(); // User menu
        await page.getByRole('button', { name: 'Sign Out' }).click();

        // 5. Login as standard user
        await page.getByPlaceholder('doc@hospital.com').fill('doc@hospital.com');
        await page.getByPlaceholder('Enter password').fill('password123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // 6. Verify Audit Logs HIDDEN
        await expect(page.getByRole('button', { name: 'Audit Logs' })).toBeHidden();

        // 7. Perform Prediction to generate Log
        await page.getByPlaceholder('00').fill('45');
        await page.getByRole('combobox').first().selectOption('Male');
        await page.getByRole('combobox').nth(1).selectOption('never'); // Smoking
        await page.getByPlaceholder('24.5').fill('28');
        await page.getByPlaceholder('5.7').fill('5.5');
        await page.getByPlaceholder('100').fill('110');

        await page.getByRole('button', { name: 'Generate Risk Profile' }).click();
        await expect(page.getByText('Real-time Risk Profile')).toBeVisible({ timeout: 10000 });
    });
});
