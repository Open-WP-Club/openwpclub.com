import { expect, test } from '@playwright/test';

test('plugin categories filter the catalog', async ({ page }) => {
  await page.goto('/plugins/');

  const seo = page.getByRole('button', { name: /SEO/ }).first();
  await expect(seo).toBeVisible();
  await seo.click();

  await expect(page.getByRole('link', { name: /rank-math-automation-wp/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /WC-Pre-order/i })).toBeHidden();
  await expect(page.locator('#plugin-count')).toContainText('in this category');
});
