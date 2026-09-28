import { test, expect } from '@playwright/test';

test.describe('DatePicker E2E', () => {
  test('should be accessible via keyboard', async ({ page }) => {
    await page.goto('/analytics');
    await page.click('text=Start Date');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="react-datepicker__input"]')).toBeVisible();
  });

  test('should announce screen-reader labels', async ({ page }) => {
    await page.goto('/invite');
    const label = await page.locator('label').first();
    await expect(label).toHaveAttribute('htmlFor', 'date-picker-input');
    await expect(label).toHaveText('Invite Expiry');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/schedule');
    await page.click('text=Schedule Time');
    await page.keyboard.press('Tab');
    await expect(page.locator('text=fields.required')).toBeVisible();
  });
});