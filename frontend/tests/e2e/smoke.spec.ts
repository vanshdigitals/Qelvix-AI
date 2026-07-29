import { expect, test } from '@playwright/test';

// Harness proof for gate G4 (08 §12.1). The real E2E flows — signup through
// first scan, domain verification, finding status transitions, WhatsApp consent
// capture (06 §12) — are added as those features land.
test('index route renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Qelvix' })).toBeVisible();
});
