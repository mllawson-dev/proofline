import { column, expect, expectAccessible, test } from './fixtures';

test.describe('designer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board');
    await page.getByLabel('Viewing as').selectOption('designer');
  });

  test('opens on their own stages and can see, but not move, the rest', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
    await expect(page.locator('section[aria-labelledby^="col-"] h2')).toHaveText([/^Proofing/, /^Awaiting approval/]);

    await page.getByRole('button', { name: 'Show the whole shop' }).click();
    const printing = column(page, 'printing');
    await expect(printing.getByRole('button')).toHaveCount(0);
    await expect(printing.getByText('Next move: Production').first()).toBeVisible();
  });

  test('is shown a clear gate instead of the manager dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'The shop dashboard isn’t part of your view' })).toBeVisible();
    await expectAccessible(page);
  });

  test('opens the jobs table on My jobs', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('[aria-label="Saved views"] button[aria-pressed="true"]')).toHaveText(/^My jobs/);
  });
});

test('the front counter hands a job to design and focus lands on the announcement', async ({ page }) => {
  await page.goto('/board');
  await page.getByLabel('Viewing as').selectOption('counter');
  await page.getByRole('button', { name: 'Move PL-1001 to Proofing' }).press('Enter');

  await expect(page.getByText('PL-1001', { exact: true })).toHaveCount(0);
  await expect(page.locator(':focus')).toHaveAttribute('role', 'status');
});
