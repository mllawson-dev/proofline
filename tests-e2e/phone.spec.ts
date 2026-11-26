import { expect, expectAccessible, test } from './fixtures';

for (const path of ['/board', '/jobs', '/dashboard', '/proofs', '/p/PL-1013']) {
  test(`${path} fits a phone screen and passes an accessibility scan`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
    await expectAccessible(page);
  });
}
