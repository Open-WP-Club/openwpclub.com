import { expect, test } from '@playwright/test';

test('release notes render Markdown as formatted HTML', async ({ page }) => {
  await page.goto('/changelog/');

  await expect(page.getByText(/Updated weekly · Data as of/)).toBeVisible();

  const firstRelease = page.locator('article').first();
  await expect(firstRelease.locator('.release-notes strong').first()).toHaveText('Full Changelog');
  await expect(firstRelease.locator('.release-notes a').first()).toHaveAttribute('href', /^https:\/\/github\.com\//);
  await expect(firstRelease).not.toContainText('**Full Changelog**');

  const detailedRelease = page.locator('article').filter({ hasText: 'multi-store-sync-for-woocommerce' });
  await expect(detailedRelease.locator('.release-notes h2')).toContainText('WooCommerce Multi-Store Sync');
  await expect(detailedRelease.locator('.release-notes li')).not.toHaveCount(0);
});
