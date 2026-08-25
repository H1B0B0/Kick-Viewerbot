import { test, expect } from '@playwright/test';

test('network block on non-loopback', async ({ page }) => {
  await page.route('**/*', route => {
    const url = route.request().url();
    if (!url.includes('127.0.0.1') && !url.includes('localhost') && !url.startsWith('data:')) {
      route.abort();
    } else {
      route.continue();
    }
  });

  let error = null;
  try {
    await page.goto('https://example.invalid', { timeout: 2000 });
  } catch (e) {
    error = e;
  }
  expect(error).not.toBeNull();
});
