import { column, expect, expectAccessible, test } from './fixtures';

// The demo keeps changes in the visitor's tab (sessionStorage), and every test gets a new browser
// context, so each one starts from the same seeded shop.

test('a fresh visitor sees the seeded shop', async ({ page }) => {
  await page.goto('/board');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Board', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Jobs', exact: true })).not.toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Proofs 7 waiting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset demo' })).toHaveCount(0);
  await expectAccessible(page);
});

test('sending a proof by keyboard keeps focus on the card, and Undo puts it back', async ({ page }) => {
  await page.goto('/board');
  await page.getByRole('button', { name: 'Send PL-1010 proof to the customer: Send proof' }).press('Enter');

  await expect(page.getByRole('status').first()).toContainText('PL-1010 proof v');
  await expect(column(page, 'awaiting-approval').getByText('PL-1010', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.closest('li')?.textContent?.slice(0, 7))).toBe('PL-1010');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Proofs 8 waiting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset demo' })).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(column(page, 'proofing').getByText('PL-1010', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset demo' })).toHaveCount(0);
});

test('a customer approves a proof and the whole shop agrees', async ({ page }) => {
  await page.goto('/board');
  await page.getByRole('button', { name: 'Send PL-1010 proof to the customer: Send proof' }).click();

  await page.goto('/p/PL-1010');
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Approve proof' }).click();
  await expect(page.getByText('Please tick the box')).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Approve proof' }).click();
  await expect(page.locator(':focus')).toContainText('Thanks');

  await page.goto('/board');
  await expect(column(page, 'printing').getByText('PL-1010', { exact: true })).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.locator('dl > div', { hasText: 'Waiting on customers' })).toContainText('7');
  await expectAccessible(page);
});

test('a customer asks for changes, and the note reaches the proofs queue', async ({ page }) => {
  await page.goto('/p/PL-1011');
  await page.getByRole('button', { name: 'Request changes' }).click();
  await expect(page.getByRole('textbox')).toBeFocused();

  await page.getByRole('button', { name: /^Send changes to/ }).click();
  await expect(page.getByText('Tell us what to change')).toBeVisible();

  await page.getByRole('textbox').fill('Use the gold version of the logo, please.');
  await page.getByRole('button', { name: /^Send changes to/ }).click();
  await expect(page.getByText('will send a new proof')).toBeVisible();

  await page.goto('/proofs');
  await expect(page.getByText('Use the gold version of the logo')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Customer view' })).toHaveCount(6);
  await expectAccessible(page);

  await page.reload();
  await expect(page.getByRole('link', { name: 'Customer view' })).toHaveCount(6);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('link', { name: 'Customer view' })).toHaveCount(7);
});

test('the jobs table is accessible', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('table')).toBeVisible();
  await expectAccessible(page);
});
