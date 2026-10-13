import { test as base, expect } from '@playwright/test';

// Browser behavior checks must not wait for analytics, badges, or avatar CDNs.
// Release download availability is checked separately by check:links.
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (!url.startsWith('http') || new URL(url).origin === origin) return route.continue();
      return route.abort();
    });
    await use(page);
  },
});
export { expect };
