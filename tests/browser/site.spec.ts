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

test('event directory exposes six sourced event cards', async ({ page }) => {
  await page.goto('/events/');
  const cards = page.locator('article.card');
  await expect(cards).toHaveCount(6);
  const sourceLinks = cards.locator('a.source');
  await expect(sourceLinks).toHaveCount(6);
  for (const href of await sourceLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
    expect(href).toMatch(/^https:\/\//);
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
