import { expect, test } from './fixtures';

test('plugin categories filter the catalog', async ({ page }) => {
  await page.goto('/plugins/');

  const preOrder = page.locator('a.plugin-card[href="/plugins/wc-pre-order/"]');
  await expect(preOrder).toBeVisible();
  const seo = page.getByRole('button', { name: /SEO/ }).first();
  await expect(seo).toBeVisible();
  await seo.click();

  await expect(page.getByRole('link', { name: /Rank Math Automation WP/i })).toBeVisible();
  await expect(preOrder).toBeHidden();
  await expect(page.locator('#plugin-count')).toContainText('in this category');
});
