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

test('tag filters combine, survive reload, and can be cleared', async ({ page }) => {
  await page.goto('/plugins/');
  const filters = page.locator('details:visible').filter({ hasText: 'Filter by tag' });
  if ((await filters.getAttribute('open')) === null) await filters.locator('summary').click();
  await expect(filters.locator('input[value="admin-notice"]')).toHaveCount(0);
  await filters.locator('input[value="bulk-operation"]').check();
  await filters.locator('input[value="staging"]').check();
  await expect(page).toHaveURL(/tag=bulk-operation.*tag=staging/);
  await page.reload();
  const reloaded = page.locator('details:visible').filter({ hasText: 'Filter by tag' });
  if ((await reloaded.getAttribute('open')) === null) await reloaded.locator('summary').click();
  await expect(reloaded.locator('input[value="bulk-operation"]')).toBeChecked();
  await expect(reloaded.locator('input[value="staging"]')).toBeChecked();
  await page.locator('input[id^="plugin-search"]:visible').fill('no matching plugin');
  await expect(page.locator('#no-results')).toBeVisible();
  if ((await reloaded.getAttribute('open')) === null) await reloaded.locator('summary').click();
  await reloaded.getByRole('button', { name: 'Clear tags' }).click();
  await expect(reloaded.locator('input:checked')).toHaveCount(0);
  await expect(page).not.toHaveURL(/tag=/);
});

test('plugin screenshot and navigation links have accessible names', async ({ page }) => {
  await page.goto('/plugins/logo-link-wp/');
  const screenshot = page.getByRole('link', { name: /Open full-size screenshot: Logo Link/i });
  await expect(screenshot).toBeVisible();
  await expect(screenshot.locator('img')).toHaveAttribute('srcset', /webp/);
  const unnamed = await page.locator('a').evaluateAll((links) => links.filter((link) =>
    !(link instanceof HTMLElement && link.innerText.trim()) && !link.getAttribute('aria-label')?.trim() &&
    !link.getAttribute('aria-labelledby') && !link.querySelector('img[alt]:not([alt=""]), svg title')
  ).map((link) => link.outerHTML));
  expect(unnamed).toEqual([]);
});
