import { expect, test } from '@playwright/test';

test('home page renders the shared header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "Today's page" })).toBeVisible();
  await expect(page.getByText('COCOON')).toBeVisible();
});

test('entry route picks up :id param', async ({ page }) => {
  await page.goto('/entry/abc-123');
  await expect(page.getByRole('heading', { name: 'Entry' })).toBeVisible();
  await expect(page.getByText('abc-123')).toBeVisible();
});
