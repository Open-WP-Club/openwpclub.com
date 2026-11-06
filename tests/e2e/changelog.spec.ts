import { expect, test } from './fixtures';

test('changelog displays repository releases', async ({ page }) => {
  await page.goto('/changelog/');

  await expect(page.getByText(/Updated weekly · Data as of/)).toBeVisible();

  const firstRelease = page.locator('article').first();
  await expect(firstRelease).toBeVisible();
  await expect(firstRelease.getByRole('link', { name: /View release/ })).toHaveAttribute('href', /^https:\/\/github\.com\//);
});
