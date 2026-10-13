import { expect, test } from './fixtures';

test('central supporter appears across the site with safe links and working assets', async ({ page, request }) => {
  const feed = await request.get('/sponsorship.json');
  expect(feed.ok()).toBeTruthy();
  const registry = await feed.json();
  expect(registry.maxPositions).toBe(3);
  expect(registry.supporters[0].id).toBe('mgknet');
  expect(registry.supporters[0].logoData).toMatch(/^data:image\/png;base64,/);
  for (const path of ['/', '/sponsors/', '/plugins/plugin-hub/']) {
    await page.goto(path);
    const card = page.locator('[data-sponsor-id="mgknet"]').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('href', 'https://mgknet.com/');
    await expect(card).toHaveAttribute('rel', /sponsored/);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  for (const group of ['supporters', 'campaigns']) {
    const banner = await request.get(`/sponsorship/${group}.png`);
    expect(banner.ok()).toBeTruthy();
    expect(banner.headers()['content-type']).toContain('image/png');
  }
});

test('campaigns have their own page and do not fabricate a paid endorsement', async ({ page }) => {
  await page.goto('/advertise/');
  await expect(page.getByRole('heading', { name: 'Sponsored placements' })).toBeVisible();
  await expect(page.getByText('No active campaigns yet.')).toBeVisible();
  await expect(page.locator('[data-sponsor-id="mgknet"]')).toHaveCount(0);
});
