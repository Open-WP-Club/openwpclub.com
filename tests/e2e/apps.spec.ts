import { expect, test } from '@playwright/test';

test('apps catalog identifies desktop and mobile products', async ({ page }) => {
  await page.goto('/apps/');
  await expect(page.getByRole('heading', { name: 'Apps', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Desktop/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /StoreOS/ })).toBeVisible();
  await expect(page.locator('[data-name="storeos"]')).toContainText('Windows');
  await expect(page.locator('[data-name="storeos"]')).toContainText('macOS');
  await expect(page.locator('[data-name="storeos"]')).toContainText('Linux');
  await expect(page.locator('[data-name="fulfill-for-woocommerce"]')).toContainText('Android');
  await expect(page.getByText(/Updated monthly · Data as of/).first()).toBeVisible();
});

test('StoreOS exposes real release installers and metadata', async ({ page }) => {
  await page.goto('/apps/storeos/');
  await expect(page.getByRole('heading', { name: 'StoreOS', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Download StoreOS' })).toBeVisible();
  await expect(page.getByText('Windows (Installer)')).toBeVisible();
  await expect(page.getByText('macOS (Apple Silicon)')).toBeVisible();
  await expect(page.getByText('Linux (AppImage)')).toBeVisible();
  const downloads = page.locator('a.download-option');
  await expect(downloads).toHaveCount(7);
  for (const link of await downloads.all()) {
    await expect(link).toHaveAttribute('href', /github\.com\/Open-WP-Club\/StoreOS\/releases\/download\//i);
  }
});

test('catalog search filters apps', async ({ page }) => {
  await page.goto('/apps/');
  await expect(page.locator('#app-count')).toHaveText('2 apps');
  const search = page.locator('#app-search:visible, #app-search-mobile:visible');
  await expect(search).toHaveCount(1);
  await search.fill('StoreOS');
  await expect(page.locator('#app-count')).toHaveText('1 app');
  await expect(page.getByRole('link', { name: /StoreOS/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /FulFill/ })).toBeHidden();
});

test('app categories filter desktop and mobile products', async ({ page }) => {
  await page.goto('/apps/');

  await page.getByRole('button', { name: /Desktop/ }).first().click();
  await expect(page.getByRole('link', { name: /StoreOS/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /FulFill/ })).toBeHidden();
  await expect(page.locator('#app-count')).toHaveText('1 app in this category');

  await page.getByRole('button', { name: /Mobile/ }).first().click();
  await expect(page.getByRole('link', { name: /StoreOS/ })).toBeHidden();
  await expect(page.getByRole('link', { name: /FulFill/ })).toBeVisible();
});

test('mobile navigation opens and reaches apps', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile-only navigation check');
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  await expect(page.locator('#mobile-menu').getByRole('link', { name: 'Apps' })).toBeVisible();
});
