import { expect, test } from '@playwright/test';

for (const path of ['/', '/events/', '/groups/', '/routes/', '/resources/']) {
  test(`${path} renders without overflow or browser errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();

    const fitsViewport = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fitsViewport).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('event directory matches the upcoming source records', async ({ page }) => {
  await page.goto('/');
  const expectedCount = Number(await page.locator('a[href="/events/"] b').textContent());
  await page.goto('/events/');
  await expect(page.locator('article.card')).toHaveCount(expectedCount);
  if (expectedCount === 0) {
    await expect(page.getByRole('heading', { name: 'No upcoming events are currently verified' })).toBeVisible();
    await expect(page.getByText('Past events are archived automatically.')).toBeVisible();
  }
});

test('mobile navigation keeps every link fully visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/');
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const link of await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link').all()) {
    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  }
});
