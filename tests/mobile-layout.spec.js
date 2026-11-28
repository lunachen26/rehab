import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

test('home screen safe area keeps header and sticky patient bar clear of system UI', async ({ page }) => {
  await page.goto('/');
  // Desktop runners do not expose iPhone hardware insets. Exercise the same
  // CSS variables with representative portrait and landscape safe areas.
  await page.addStyleTag({ content: ':root { --app-safe-top: 59px; --app-safe-bottom: 34px; }' });
  const header = page.locator('.app-header');
  const palette = page.locator('.app-patient-palette');
  const date = page.locator('.app-date-navigation');
  await expect(header).toHaveCSS('height', '115px');
  expect((await date.boundingBox()).y).toBeGreaterThanOrEqual(59);
  expect((await palette.boundingBox()).y).toBeCloseTo(115, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 400));
  expect((await palette.boundingBox()).y).toBeCloseTo(115, 0);
  expect((await date.boundingBox()).y).toBeGreaterThanOrEqual(59);
  await page.getByRole('button', { name: '添加患者', exact: true }).click();
  await expect(page.getByLabel('姓名', { exact: true })).toHaveCSS('font-size', '16px');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.setViewportSize({ width: 852, height: 393 });
  await page.addStyleTag({ content: ':root { --app-safe-top: 0px; --app-safe-bottom: 21px; }' });
  await expect(header).toHaveCSS('height', '56px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('narrow browser viewport has no horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await expect(page.locator('.app-header')).toHaveCSS('height', '56px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await page.locator('.app-patient-palette').boundingBox()).y).toBeCloseTo(56, 0);
});
