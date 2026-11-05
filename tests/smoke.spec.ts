import { expect, test } from '@playwright/test';

test('home placeholder renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
});

test('entry route picks up :id param', async ({ page }) => {
  await page.goto('/entry/abc-123');
  await expect(page.getByRole('heading', { name: 'Entry' })).toBeVisible();
  await expect(page.getByText('abc-123')).toBeVisible();
});
